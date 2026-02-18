import os
import json
import uuid
import shutil
import time
from typing import List
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.core.utils import read_docx
from backend.services.transcription import TranscriptionService
from backend.services.assessment import AssessmentService
from backend.services.export import ExportService

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
export_service = ExportService(outputs_dir=OUTPUTS_DIR)

# Simple task store
tasks = {}

class ProcessRequest(BaseModel):
    filename: str
    project_id: str
    project_name: str
    agent_name: str
    skip_transcription: bool = False
    engine: str = "gemini"

def run_processing_pipeline(task_id: str, filename: str, metadata: dict):
    tasks[task_id]["status"] = "processing"
    audio_path = os.path.join(AUDIO_DIR, filename)
    base_name = os.path.splitext(filename)[0]
    skip_transcription = metadata.get("skip_transcription", False)
    engine = metadata.get("engine", "gemini")
    
    from backend.core.utils import get_audio_duration
    duration = get_audio_duration(audio_path)
    tasks[task_id]["duration"] = duration
    
    total_cost_usd = 0.0
    start_time_total = time.time()
    
    try:
        if not skip_transcription:
            tasks[task_id]["step"] = "Transcription Status (Audio to Text)"
            if engine == "gemini":
                result = transcription_service.transcribe_with_gemini(audio_path)
            else:
                result = transcription_service.transcribe_with_openai(audio_path)
            
            total_cost_usd += result.get("cost", 0.0)
            from backend.core.utils import save_docx
            transcript_file = os.path.join(OUTPUTS_DIR, f"{base_name}_falcon.docx")
            save_docx(result["transcript"], result["summary"], transcript_file, 'Conversation Summary & Transcript')
        else:
            tasks[task_id]["step"] = "Using existing script"
            transcript_file = os.path.join(OUTPUTS_DIR, f"{base_name}_falcon.docx")
            shutil.copy2(audio_path, transcript_file)
        
        # 2. Assessment
        tasks[task_id]["step"] = "Analysis Status (Summary & Assessment Generation)"
        assessment = assessment_service.assess_agent(transcript_file, engine=engine)
        
        # Approximate assessment cost (standard GPT-4o-mini or Gemini Flash is very low)
        total_cost_usd += 0.005 # Small overhead for assessment
        
        # Save assessment results
        assessment_json_path = os.path.join(OUTPUTS_DIR, f"{base_name}_falcon_assessment.json")
        with open(assessment_json_path, "w") as f:
            f.write(assessment["raw_json"])
        
        # 3. File Formatting
        tasks[task_id]["step"] = "File Formatting (DOCX & Excel Preparation)"
        export_service.export_to_excel(f"{base_name}_falcon")
        
        total_elapsed = time.time() - start_time_total
        tasks[task_id]["total_time"] = total_elapsed
        tasks[task_id]["cost_usd"] = total_cost_usd
        tasks[task_id]["cost_mad"] = total_cost_usd * 10.12 # Current USD/MAD approx
        
        tasks[task_id]["status"] = "completed"
        tasks[task_id]["step"] = "Finished"
    except Exception as e:
        tasks[task_id]["status"] = "failed"
        tasks[task_id]["error"] = str(e)

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
async def process_file(request: ProcessRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    metadata = {
        "project_id": request.project_id,
        "project_name": request.project_name,
        "agent_name": request.agent_name,
        "skip_transcription": request.skip_transcription,
        "engine": request.engine
    }
    tasks[task_id] = {
        "status": "pending", 
        "filename": request.filename, 
        "metadata": metadata,
        "step": "Starting"
    }
    background_tasks.add_task(run_processing_pipeline, task_id, request.filename, metadata)
    return {"task_id": task_id}

@app.get("/api/status/{task_id}")
async def get_status(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks[task_id]

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
