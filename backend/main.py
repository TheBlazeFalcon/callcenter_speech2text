import os
import json
import uuid
import shutil
import time
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func, cast, Integer
from sqlalchemy.orm import Session

from backend.core.utils import get_audio_duration, format_timecode, save_docx, save_csv, save_json, read_docx, save_xlsx
from backend.services.transcription import TranscriptionService
from backend.services.assessment import AssessmentService
from backend.core.database import SessionLocal, engine, get_db, Base
from backend.core import models, auth

# Initialize database
Base.metadata.create_all(bind=engine)

# Seed initial data if database is empty
def seed_data():
    db = SessionLocal()
    try:
        # 1. Admin User
        admin_email = os.getenv("INITIAL_ADMIN_EMAIL", "admin@falconcall.ai")
        admin_password = os.getenv("INITIAL_ADMIN_PASSWORD", "falcon2026")
        
        # Ensure password is within bcrypt's 72-byte limit to prevent ValueError
        if len(admin_password) > 72:
            print(f"Warning: INITIAL_ADMIN_PASSWORD is too long ({len(admin_password)} chars). Truncating.")
            admin_password = admin_password[:72]
        
        admin = db.query(models.User).filter(models.User.email == admin_email).first()
        if not admin:
            hashed_pw = auth.get_password_hash(admin_password)
            admin = models.User(
                email=admin_email,
                password_hash=hashed_pw,
                full_name="System Admin",
                role="admin"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"Admin created: {admin_email}")

        # 2. Initial Workspace
        ws = db.query(models.Workspace).first()
        if not ws:
            ws = models.Workspace(
                name="Mouvement",
                description="Workspace principal pour l'analyse des appels.",
                owner_id=admin.id
            )
            db.add(ws)
            db.commit()
            db.refresh(ws)
            print(f"Initial workspace created: {ws.name}")

        # 3. Initial Agents
        agent_count = db.query(models.Agent).count()
        if agent_count == 0:
            agent1 = models.Agent(
                name="Yassine Mansouri",
                role="Chargé de Clientèle Senior",
                workspace_id=ws.id
            )
            agent2 = models.Agent(
                name="Laila Bennani",
                role="Spécialiste Support Technique",
                workspace_id=ws.id
            )
            db.add(agent1)
            db.add(agent2)
            db.commit()
            print(f"Initial agents created: {agent1.name}, {agent2.name}")

    finally:
        db.close()

seed_data()

app = FastAPI(title="Falcon Call AI")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

AUDIO_DIR = "audio"
OUTPUTS_DIR = "outputs"
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# Services initialization
transcription_service = TranscriptionService()
assessment_service = AssessmentService()

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ProcessRequest(BaseModel):
    filename: str
    workspace_id: int
    project_id: str
    project_name: str
    agent_name: str
    agent_id: Optional[int] = None
    analyses: List[str] = ["transcript", "summary", "project_analysis", "agent_performance"]
    skip_transcription: bool = False

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None

class AgentCreate(BaseModel):
    name: str
    role: str
    workspace_id: int
    avatar_url: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    workspace_id: Optional[int] = None
    avatar_url: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workspace_id: int

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

def run_processing_pipeline(task_id: int, filename: str, metadata: dict):
    db = SessionLocal()
    try:
        call_record = db.query(models.Call).filter(models.Call.id == task_id).first()
        if not call_record: return
        
        call_record.status = "processing"
        db.commit()
        
        audio_path = os.path.join(AUDIO_DIR, filename)
        base_name = os.path.splitext(filename)[0]
        skip_transcription = metadata.get("skip_transcription", False)
        
        duration = get_audio_duration(audio_path)
        call_record.duration_seconds = duration
        call_record.current_step = "Transcribing Audio (Gemini 1.5)..."
        db.commit()
        
        total_cost_usd = 0.0
        start_time_total = time.time()
        
        # 0. Associate with Agent and Workspace
        agent_name = metadata.get("agent_name", "Unknown")
        project_id = metadata.get("project_id")
        workspace_id = metadata.get("workspace_id") # If provided
        
        # Get default workspace if not specified
        if not workspace_id:
            ws = db.query(models.Workspace).first()
            workspace_id = ws.id if ws else None
        
        # Find or create agent
        agent = db.query(models.Agent).filter(models.Agent.name == agent_name).first()
        if not agent:
            agent = models.Agent(
                name=agent_name,
                role="Agent",
                workspace_id=workspace_id
            )
            db.add(agent)
            db.commit()
            db.refresh(agent)
            
        call_record.agent_id = agent.id
        call_record.workspace_id = workspace_id
        call_record.project_id = project_id
        
        # Merge analyses
        requested = metadata.get("analyses", [])
        existing = call_record.selected_analyses or []
        call_record.selected_analyses = list(set(existing + requested))
        db.commit()
        
        # 1. Transcription (Mandatory if missing)
        transcript_record = db.query(models.Transcript).filter(models.Transcript.call_id == task_id).first()
        transcript_file = os.path.join(OUTPUTS_DIR, f"{base_name}_falcon.docx")

        if not transcript_record:
            if not skip_transcription:
                call_record.current_step = "Transcribing Audio (Gemini 1.5)..."
                db.commit()
                result = transcription_service.transcribe_with_gemini(audio_path)
                
                total_cost_usd += result.get("cost", 0.0)
                save_docx(result["transcript"], result["summary"], transcript_file, 'Conversation Summary & Transcript')
                
                save_json(json.dumps(result["dialogue"], ensure_ascii=False, indent=2), 
                          os.path.join(OUTPUTS_DIR, f"{base_name}_transcript.json"))
                
                transcript_record = models.Transcript(
                    call_id=task_id,
                    dialogue=result["dialogue"],
                    full_text=result["transcript"]
                )
                db.add(transcript_record)
            else:
                # Create a simple transcript record if missing
                full_text = read_docx(transcript_file) if os.path.exists(transcript_file) else "Skipped transcription"
                transcript_record = models.Transcript(call_id=task_id, full_text=full_text, dialogue=[])
                db.add(transcript_record)
            db.commit()
        else:
            print(f"Reusing existing transcript for {task_id}")

        # 2. Agent Assessment
        analyses_to_run = metadata.get("analyses", [])
        
        if "agent_performance" in analyses_to_run:
            agent_assessment_record = db.query(models.AgentAssessment).filter(models.AgentAssessment.call_id == task_id).first()
            if not agent_assessment_record:
                call_record.current_step = "Analyzing Transcript (QA Expert)..."
                db.commit()
                
                agent_results = assessment_service.assess_agent(transcript_record.full_text)
                
                agent_assessment_record = models.AgentAssessment(
                    call_id=task_id,
                    agent_summary=agent_results.get("agent_summary"),
                    final_verdict=agent_results.get("final_verdict"),
                    behavioral_analysis=agent_results.get("behavioral_analysis"),
                    qualitative_observations=agent_results.get("qualitative_observations"),
                    agent_performance=agent_results.get("agent_performance")
                )
                db.add(agent_assessment_record)
                total_cost_usd += 0.005
                db.commit()
                
                if agent_results:
                    save_csv(agent_results, os.path.join(OUTPUTS_DIR, f"{base_name}_agent.csv"))

        # 3. Project Assessment
        if "project_analysis" in analyses_to_run:
            project_assessment_record = db.query(models.ProjectAssessment).filter(models.ProjectAssessment.call_id == task_id).first()
            if not project_assessment_record:
                call_record.current_step = "Analyzing Project (Innovation Analysis)..."
                db.commit()
                
                project_results = assessment_service.assess_project(transcript_record.full_text)
                
                project_assessment_record = models.ProjectAssessment(
                    call_id=task_id,
                    project_summary=project_results.get("project_summary"),
                    project_data=project_results.get("project_data")
                )
                db.add(project_assessment_record)
                total_cost_usd += 0.005
                db.commit()
                
                save_json(json.dumps(project_results.get("project_data"), ensure_ascii=False, indent=2), 
                          os.path.join(OUTPUTS_DIR, f"{base_name}_project_assessment.json"))
                save_csv(project_results.get("project_data"), os.path.join(OUTPUTS_DIR, f"{base_name}_project.csv"))

        # 4. Final Combined Excel
        agent_assessment_record = db.query(models.AgentAssessment).filter(models.AgentAssessment.call_id == task_id).first()
        project_assessment_record = db.query(models.ProjectAssessment).filter(models.ProjectAssessment.call_id == task_id).first()
        
        if agent_assessment_record or project_assessment_record:
            agent_export = {
                "agent_summary": agent_assessment_record.agent_summary,
                "final_verdict": agent_assessment_record.final_verdict,
                "performance": agent_assessment_record.agent_performance,
                "behavior": agent_assessment_record.behavioral_analysis
            } if agent_assessment_record else {}
            
            project_export = project_assessment_record.project_data if project_assessment_record else {}
            
            save_xlsx(agent_export, project_export, os.path.join(OUTPUTS_DIR, f"{base_name}_falcon.xlsx"))

        call_record.cost_usd = (call_record.cost_usd or 0.0) + total_cost_usd
        call_record.status = "completed"
        call_record.current_step = "Finished"
        db.commit()
    except Exception as e:
        db.rollback()
        call_record = db.query(models.Call).filter(models.Call.id == task_id).first()
        if call_record:
            call_record.status = "failed"
            call_record.error_message = str(e)
            db.commit()
    finally:
        db.close()

@app.post("/api/auth/login", response_model=Token)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user or not auth.verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me")
async def get_current_user(token: str = Depends(auth.decode_access_token)):
    if not token:
        raise HTTPException(status_code=401, detail="Invalid token")
    return token

@app.get("/api/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    total_calls = db.query(models.Call).count()
    active_agents = db.query(models.Agent).count()
    workspaces = db.query(models.Workspace).count()
    
    # Calculate average score from agent assessments using SQL aggregation
    avg_score = db.query(
        func.avg(cast(models.AgentAssessment.agent_performance["overall_score"], Integer))
    ).scalar() or 0
    
    return {
        "totalCalls": total_calls,
        "activeAgents": active_agents,
        "totalWorkspaces": workspaces,
        "avgScore": round(float(avg_score), 1),
        "callsTrend": "+0%", # Placeholder for trend logic
        "scoreTrend": "+0%"
    }

@app.get("/api/workspaces")
async def list_workspaces(db: Session = Depends(get_db)):
    # Optimized query to get all workspace data including counts and avg score in one go
    # Using SQL aggregation and outer joins to avoid N+1 problem
    workspaces_data = db.query(
        models.Workspace,
        func.count(models.Agent.id.distinct()).label("agent_count"),
        func.count(models.Call.id.distinct()).label("call_count"),
        func.avg(cast(models.AgentAssessment.agent_performance["overall_score"], Integer)).label("avg_score")
    ).outerjoin(models.Agent, models.Workspace.id == models.Agent.workspace_id)\
     .outerjoin(models.Call, models.Workspace.id == models.Call.workspace_id)\
     .outerjoin(models.AgentAssessment, models.Call.id == models.AgentAssessment.call_id)\
     .group_by(models.Workspace.id).all()

    result = []
    for ws, agent_count, call_count, avg_score in workspaces_data:
        result.append({
            "id": str(ws.id),
            "name": ws.name,
            "description": ws.description,
            "status": ws.status,
            "agentCount": agent_count,
            "callCount": call_count,
            "avgScore": round(float(avg_score or 0), 1)
        })
    return result

@app.post("/api/workspaces")
async def create_workspace(request: WorkspaceCreate, db: Session = Depends(get_db)):
    new_ws = models.Workspace(
        name=request.name,
        description=request.description
    )
    db.add(new_ws)
    db.commit()
    db.refresh(new_ws)
    return new_ws

@app.put("/api/workspaces/{workspace_id}")
async def update_workspace(workspace_id: int, request: WorkspaceUpdate, db: Session = Depends(get_db)):
    ws = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if request.name is not None: ws.name = request.name
    if request.description is not None: ws.description = request.description
    if request.status is not None: ws.status = request.status
    
    db.commit()
    db.refresh(ws)
    return ws

@app.delete("/api/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: int, db: Session = Depends(get_db)):
    ws = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    db.delete(ws)
    db.commit()
    return {"message": "Workspace deleted successfully"}

@app.get("/api/workspaces/{workspace_id}")
async def get_workspace(workspace_id: int, db: Session = Depends(get_db)):
    ws = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws

@app.get("/api/calls")
async def list_calls(project_id: Optional[str] = None, agent_id: Optional[int] = None, db: Session = Depends(get_db)):
    # Optimized query to get calls with agent and agent assessment in one go
    query = db.query(
        models.Call,
        models.Agent.name.label("agent_name"),
        cast(models.AgentAssessment.agent_performance["overall_score"], Integer).label("score")
    ).outerjoin(models.Agent, models.Call.agent_id == models.Agent.id)\
     .outerjoin(models.AgentAssessment, models.Call.id == models.AgentAssessment.call_id)
    
    if project_id:
        query = query.filter(models.Call.project_id == project_id)
    if agent_id:
        query = query.filter(models.Call.agent_id == agent_id)
    
    calls_data = query.all()
    result = []
    for call, agent_name, score in calls_data:
        result.append({
            "id": call.id,
            "title": call.title,
            "filename": call.filename,
            "status": call.status,
            "duration": f"{int(call.duration_seconds//60)}m {int(call.duration_seconds%60)}s" if call.duration_seconds else "—",
            "date": call.created_at.strftime("%Y-%m-%d"),
            "agent": agent_name or "Unknown",
            "score": int(score) if score else 0,
            "projectId": call.project_id
        })
    return result

@app.get("/api/workspaces/{workspace_id}/calls")
async def list_workspace_calls(workspace_id: int, db: Session = Depends(get_db)):
    # Optimized query specifically for workspace calls
    calls_data = db.query(
        models.Call,
        models.Agent.name.label("agent_name"),
        cast(models.AgentAssessment.agent_performance["overall_score"], Integer).label("score")
    ).outerjoin(models.Agent, models.Call.agent_id == models.Agent.id)\
     .outerjoin(models.AgentAssessment, models.Call.id == models.AgentAssessment.call_id)\
     .filter(models.Call.workspace_id == workspace_id).all()
    
    result = []
    for call, agent_name, score in calls_data:
        result.append({
            "id": call.id,
            "title": call.title,
            "filename": call.filename,
            "status": call.status,
            "duration": f"{int(call.duration_seconds//60)}m {int(call.duration_seconds%60)}s" if call.duration_seconds else "—",
            "date": call.created_at.strftime("%Y-%m-%d"),
            "agent": agent_name or "Unknown",
            "score": int(score) if score else 0
        })
    return result

@app.get("/api/agents")
async def list_agents(db: Session = Depends(get_db)):
    # Optimized query to get all agent data including call count and avg score in one go
    agents_data = db.query(
        models.Agent,
        func.count(models.Call.id).label("call_count"),
        func.avg(cast(models.AgentAssessment.agent_performance["overall_score"], Integer)).label("avg_score"),
        func.avg(models.Call.duration_seconds).label("avg_duration")
    ).outerjoin(models.Call, models.Agent.id == models.Call.agent_id)\
     .outerjoin(models.AgentAssessment, models.Call.id == models.AgentAssessment.call_id)\
     .group_by(models.Agent.id).all()

    result = []
    for agent, call_count, avg_score, avg_dur in agents_data:
        avg_dur_val = float(avg_dur or 0)
        result.append({
            "id": agent.id,
            "name": agent.name,
            "role": agent.role,
            "avatar": agent.name[0] if agent.name else "?",
            "score": round(float(avg_score or 0), 1),
            "callCount": call_count,
            "avgDuration": f"{int(avg_dur_val//60)}m {int(avg_dur_val%60)}s",
            "trend": "stable" # Simplified for optimization, could be added with window function if needed
        })
    return result

@app.post("/api/agents")
async def create_agent(request: AgentCreate, db: Session = Depends(get_db)):
    new_agent = models.Agent(
        name=request.name,
        role=request.role,
        workspace_id=request.workspace_id,
        avatar_url=request.avatar_url
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return new_agent

@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(models.Agent).filter(models.Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@app.put("/api/agents/{agent_id}")
async def update_agent(agent_id: int, request: AgentUpdate, db: Session = Depends(get_db)):
    agent = db.query(models.Agent).filter(models.Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if request.name is not None: agent.name = request.name
    if request.role is not None: agent.role = request.role
    if request.workspace_id is not None: agent.workspace_id = request.workspace_id
    if request.avatar_url is not None: agent.avatar_url = request.avatar_url
    
    db.commit()
    db.refresh(agent)
    return agent

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(models.Agent).filter(models.Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted successfully"}

@app.get("/api/agents/{agent_id}/calls")
async def list_agent_calls(agent_id: int, db: Session = Depends(get_db)):
    calls_query = db.query(models.Call).filter(models.Call.agent_id == agent_id).all()
    result = []
    for call in calls_query:
        agent_assessment = db.query(models.AgentAssessment).filter(models.AgentAssessment.call_id == call.id).first()
        score = 0
        if agent_assessment and agent_assessment.agent_performance:
            score = agent_assessment.agent_performance.get("overall_score", 0)
        
        result.append({
            "id": str(call.id),
            "title": call.title,
            "filename": call.filename,
            "status": call.status,
            "duration": f"{int(call.duration_seconds//60)}m {int(call.duration_seconds%60)}s" if call.duration_seconds else "—",
            "date": call.created_at.strftime("%Y-%m-%d"),
            "score": score
        })
    return result

@app.get("/api/files")
async def list_files():
    files = [f for f in os.listdir(AUDIO_DIR) if os.path.isfile(os.path.join(AUDIO_DIR, f)) and not f.startswith(".")]
    return {"files": files}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(AUDIO_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"filename": file.filename}

@app.post("/api/process")
async def process_file(request: ProcessRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if a call with this filename already exists
    call_record = db.query(models.Call).filter(models.Call.filename == request.filename).first()
    
    if call_record:
        call_record.status = "pending"
        call_record.error_message = None
        call_record.workspace_id = request.workspace_id
        call_record.project_id = request.project_id
        call_record.agent_id = request.agent_id
        call_record.selected_analyses = request.analyses
        db.commit()
        task_id = call_record.id
    else:
        # Create Call record
        call_record = models.Call(
            title=f"Analysis of {request.filename}",
            filename=request.filename,
            original_path=os.path.join(AUDIO_DIR, request.filename),
            status="pending",
            workspace_id=request.workspace_id,
            project_id=request.project_id,
            agent_id=request.agent_id,
            selected_analyses=request.analyses
        )
        db.add(call_record)
        db.commit()
        db.refresh(call_record)
        task_id = call_record.id
    
    metadata = {
        "workspace_id": request.workspace_id,
        "project_id": request.project_id,
        "project_name": request.project_name,
        "agent_name": request.agent_name,
        "analyses": request.analyses,
        "skip_transcription": request.skip_transcription
    }
    
    background_tasks.add_task(run_processing_pipeline, task_id, request.filename, metadata)
    return {"task_id": task_id}

@app.get("/api/status/{task_id}")
async def get_status(task_id: int, db: Session = Depends(get_db)):
    call = db.query(models.Call).filter(models.Call.id == task_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = {
        "status": call.status,
        "step": call.current_step,
        "filename": call.filename,
        "duration": call.duration_seconds,
        "cost_usd": call.cost_usd,
        "cost_mad": (call.cost_usd or 0) * float(os.getenv("USD_MAD_RATE", 10.12)),
        "error": call.error_message
    }
    
    if call.status == "completed":
        agent_assessment = db.query(models.AgentAssessment).filter(models.AgentAssessment.call_id == task_id).first()
        project_assessment = db.query(models.ProjectAssessment).filter(models.ProjectAssessment.call_id == task_id).first()
        transcript = db.query(models.Transcript).filter(models.Transcript.call_id == task_id).first()
        
        result["assessment_data"] = {}
        
        if agent_assessment:
            result["assessment_data"].update({
                "agent_summary": agent_assessment.agent_summary,
                "agent_performance": agent_assessment.agent_performance,
                "behavioral_analysis": agent_assessment.behavioral_analysis,
                "qualitative_observations": agent_assessment.qualitative_observations,
                "final_verdict": agent_assessment.final_verdict,
            })
        
        if project_assessment:
            result["assessment_data"].update({
                "project_summary": project_assessment.project_summary,
                "project_data": project_assessment.project_data,
            })
            
        if transcript:
            result["assessment_data"].update({
                "transcript": transcript.full_text,
                "dialogue": transcript.dialogue
            })
                
        result["base_name"] = os.path.splitext(call.filename)[0]
        
    return result

@app.get("/api/content/{filename}")
async def get_file_content(filename: str):
    file_path = os.path.join(OUTPUTS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    if filename.endswith(".docx"):
        return {"content": read_docx(file_path)}
    elif filename.endswith(".json"):
        with open(file_path, "r") as f:
            return json.load(f)
    elif filename.endswith(".csv"):
        import pandas as pd
        df = pd.read_csv(file_path)
        return {"content": df.to_dict(orient='records')}
    else:
        with open(file_path, "r") as f:
            return {"content": f.read()}

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(OUTPUTS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    media_type = "application/octet-stream"
    if filename.endswith(".csv"):
        media_type = "text/csv"
    elif filename.endswith(".docx"):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif filename.endswith(".xlsx"):
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type
    )

@app.get("/api/outputs")
async def list_outputs():
    files = [f for f in os.listdir(OUTPUTS_DIR) if os.path.isfile(os.path.join(OUTPUTS_DIR, f)) and not f.startswith(".")]
    return {"files": files}

# Serve static files
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
else:
    app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")
