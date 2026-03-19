from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Text, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    full_name = Column(String)
    role = Column(String, default="viewer") # admin, manager, viewer
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")

class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="workspaces")
    calls = relationship("Call", back_populates="workspace", cascade="all, delete-orphan")
    agents = relationship("Agent", back_populates="workspace", cascade="all, delete-orphan")

class Agent(Base):
    __tablename__ = "agents"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String)
    avatar_url = Column(String)
    role = Column(String)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workspace = relationship("Workspace", back_populates="agents")
    calls = relationship("Call", back_populates="agent", cascade="all, delete-orphan")

class Call(Base):
    __tablename__ = "calls"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String)
    filename = Column(String)
    audio_hash = Column(String, nullable=True) # To identify same audio content
    original_path = Column(String)
    output_path = Column(String)
    duration_seconds = Column(Float)
    cost_usd = Column(Float)
    status = Column(String, default="pending") # pending, processing, completed, failed
    current_step = Column(String)
    error_message = Column(Text)
    selected_analyses = Column(JSONB, default=list) # List of requested analysis types
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    project_id = Column(String, nullable=True) # Reference to external project
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workspace = relationship("Workspace", back_populates="calls")
    agent = relationship("Agent", back_populates="calls")
    project_assessment = relationship("ProjectAssessment", back_populates="call", uselist=False, cascade="all, delete-orphan")
    agent_assessment = relationship("AgentAssessment", back_populates="call", uselist=False, cascade="all, delete-orphan")
    transcript = relationship("Transcript", back_populates="call", uselist=False, cascade="all, delete-orphan")

class ProjectAssessment(Base):
    __tablename__ = "project_assessments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    call_id = Column(Integer, ForeignKey("calls.id"), unique=True)
    project_summary = Column(Text)
    project_data = Column(JSONB) # Includes notations and qualitative analysis
    created_at = Column(DateTime, default=datetime.utcnow)
    
    call = relationship("Call", back_populates="project_assessment")

class AgentAssessment(Base):
    __tablename__ = "agent_assessments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    call_id = Column(Integer, ForeignKey("calls.id"), unique=True)
    agent_summary = Column(Text)
    final_verdict = Column(String)
    behavioral_analysis = Column(JSONB)
    qualitative_observations = Column(JSONB)
    agent_performance = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    call = relationship("Call", back_populates="agent_assessment")

class Transcript(Base):
    __tablename__ = "transcripts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    call_id = Column(Integer, ForeignKey("calls.id"), unique=True)
    dialogue = Column(JSONB) # List of {time, speaker, text}
    full_text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    call = relationship("Call", back_populates="transcript")

