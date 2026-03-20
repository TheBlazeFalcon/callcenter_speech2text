# Falcon Call AI 🦅 | Intelligent Analysis Platform

**Falcon Call AI** is a state-of-the-art intelligence platform designed to transform call center recordings into structured, actionable insights. Leveraging **Google Gemini 2.0/2.5 Flash**, the system provides multimodal transcription, deep project assessments, and granular agent performance analytics.

## ✨ Core Features

### 🎙️ Advanced Transcription

- **Darija Support**: Specialized multimodal analysis for Moroccan Arabic (Darija) and hybrid dialects.
- **Filler Word Filtering**: Automated removal of "ah", "uh", "mhm" for clean, readable interaction logs.
- **Sticky Timestamps**: Precise time-tracking for every dialogue turn.

### 📊 Dual-Layer Assessment

- **Project Assessment (Innovation Focused)**:
  - **Scoring**: Quantitative evaluation across Idea, Team, and Pilot potential.
  - **Qualitative**: Strategic fit, MVP budgeting, lead time, and team skill gap analysis.
- **Agent Assessment (Quality Assurance)**:
  - **Metrics**: 0-100 scoring on Communication, Empathy, Problem Resolution, and Script Adherence.
  - **Behavioral Analysis**: Sentiment tracking, tone detection, and keyword extraction.

### 📥 Multi-Format Exports

- **Combined Excel (.xlsx)**: Comprehensive multi-sheet reports for stakeholders.
- **Interaction Word (.docx)**: Cleaned transcript and summary for archival.
- **Data CSV (.csv)**: Raw assessment data for integration with external BI tools.

### 🏢 Enterprise Management

- **Workspaces**: Hierarchical organization of calls and projects.
- **Agent Profiles**: Performance history and trend tracking for quality coaching.

## 🚀 Quick Start (Docker Preferred)

The easiest way to run Falcon Call AI locally is via Docker Compose:

1. **Configure Environment**:
   Create a `.env` file in the root:

   ```env
   GEMINI_API_KEY=your_key_here
   USD_MAD_RATE=10.12
   ```

2. **Launch with Docker**:

   ```bash
   # Run with local settings (ports 8000/5432 exposed)
   docker compose -f docker-compose.local.yml up --build
   ```

   The application will be available at `http://localhost:8000`.

## 🌐 Deployment (Dokploy & Traefik)

Falcon Call AI is optimized for deployment using [Dokploy](https://dokploy.com/) and [Traefik](https://doc.traefik.io/traefik/).

1. **Production Configuration**:
   The `docker-compose.prod.yml` file is configured for production environments:
   - Secured: No database ports exposed to the host.
   - Persistent: Uses named volumes for audio, outputs, and database data.
   - Routed: Traefik labels for automatic SSL and domain routing.

2. **Environment Variables**:
   Ensure the following are set in your Dokploy project:
   - `DOMAIN`: Your application domain (e.g., `falcon.example.com`).
   - `GEMINI_API_KEY`: Your Google Gen AI key.
   - `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Database credentials.

3. **Dokploy Setup**:
   Create a "Compose" application in Dokploy and point it to this repository, specifying `docker-compose.prod.yml` as the compose file.

## 🛠 Manual Installation

1. **Backend (Python 3.10+)**:

   ```bash
   pip install -r requirements.txt
   PYTHONPATH=. python3 scripts/reset_db.py  # Initialize DB
   uvicorn backend.main:app --reload
   ```

2. **Frontend (Node 18+)**:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🏗 Architecture & Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Shadcn UI.
- **Backend**: FastAPI (Python), SQLAlchemy ORM, Pydantic 2.0.
- **AI Core**: Google Generative AI SDK (Gemini Flash), Custom Prompt Management System.
- **Database**: PostgreSQL with JSONB support for complex assessment structures.
- **Storage**: Organized `outputs/` directory for generated artifacts (CSV, XLSX, DOCX).

---

*Falcon Call AI - Precise Assessment. Intelligent Analysis. Real-time Impact.*
