# Falcon Call AI 🦅

**Falcon Call AI** is a premium, enterprise-grade platform for transcribing and analyzing Moroccan Darija audio recordings and scripts. Leveraging a modular architecture with Google Gemini 1.5 and OpenAI (Whisper + GPT-4o), it delivers deep, actionable insights into call agent performance and project-level metrics.

## 🏗 Modular Architecture

The system is built on a service-oriented backend for maximum reliability and scalability:

- **`backend/`**: Modular FastAPI application.
  - **`services/`**: Unified logic for Transcription, Intelligence Assessment, and Multi-format Export.
  - **`core/`**: Centralized prompt management, currency orchestration, and document utilities.
- **`frontend/`**: High-performance React dashboard (Vite + Tailwind CSS).
- **`prompts/`**: Versioned AI persona and assessment configurations.
- **`audio/` & `outputs/`**: Secure storage for input assets and generated intelligence.

## 🚀 Quick Start (Docker)

1. **Configure Environment**: 
   Create a `.env` file in the root:
   ```env
   OPENAI_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   ```

2. **Launch Ecosystem**:
   ```bash
   docker compose up --build
   ```

3. **Dashboard Access**:
   Navigate to [http://localhost:8000](http://localhost:8000).

## ✨ Core Features

- **Intelligence Metrics**: Real-time tracking of Call Duration, Analysis Time, and Session Cost (MAD).
- **Dual-Input Pipeline**: Native support for processing raw audio assets or existing `.docx` scripts.
- **Hybrid AI Engine**: Seamless switching between Google Gemini and OpenAI GPT-4o models.
- **Automated QA**: Comprehensive qualitative and quantitative scoring of agent interactions.
- **Professional Export**: Consolidated multi-tab Excel workbooks and narrative Word reports.
- **Modern UI**: Dark-mode-first aesthetic with dynamic progress orchestration.

## 🛠 Developer Guide

### Backend Services
```bash
# Setup environment
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Launch dev server
uvicorn backend.main:app --reload
```

### Frontend Assets
```bash
cd frontend
npm install
npm run dev
```

---
*Falcon Call AI - Precision Transcription. Intelligent Assessment. Real-time Analytics.*
