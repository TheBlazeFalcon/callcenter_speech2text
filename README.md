# Falcon Call AI 🦅

**Falcon Call AI** is an advanced intelligence platform for transcribing and analyzing call center interactions. Powered by **Google Gemini 1.5**, it provides modular, deep actionable insights through automated transcription, project-level qualitative assessments, and agent performance scoring.

## ✨ Core Features

- **Gemini 1.5 Intelligence**: Automated transcription and analysis using `gemini-1.5-flash` for high-speed, cost-effective processing.
- **Modular Analysis Pipeline**: Choose specific analyses during upload, including Transcription, Summary, Project Analysis, and Agent Performance.
- **Detailed Scorecards**: Comprehensive agent evaluations with behavioral sentiment, tone analysis, and performance metrics.
- **Contextual Assessments**: Separation between agent-specific performance and project-level qualitative observations.
- **Workflow-Focused UI**: Modern React dashboard designed for quality control managers and call center leads.

## 🚀 Quick Start

1. **Configure Environment**:
   Create a `.env` file in the root:

   ```env
   GEMINI_API_KEY=your_key_here
   INITIAL_ADMIN_EMAIL=admin@falconcall.ai
   INITIAL_ADMIN_PASSWORD=your_password
   ```

2. **Initialize System**:
   Setup the database schema and seed initial data (Admin, Mouvement workspace, and default agents):

   ```bash
   PYTHONPATH=. python3 scripts/reset_db.py
   ```

3. **Launch Application**:

   ```bash
   # Backend
   uvicorn backend.main:app --reload

   # Frontend
   cd frontend
   npm run dev
   ```

## 🛠 Project Structure

- **`backend/`**: Modular FastAPI application.
  - **`core/`**: Database models (SQLAlchemy), auth, and utilities.
  - **`services/`**: Transcription and Intelligence assessment services.
- **`frontend/`**: Vite-powered React application with Tailwind CSS.
- **`scripts/`**: Maintenance and system initialization scripts.
- **`prompts/`**: Structured AI personas for precise assessments.

---
*Falcon Call AI - Modular Intelligence. Precise Assessment. Real-time Analytics.*
