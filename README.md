# Speech-to-Text & Analysis Tool

A modular Python-based toolset for transcribing audio and performing multi-layered analysis using OpenAI and Google Gemini.

## Project Structure

The project is organized into modular components for easier maintenance and prompt discovery:

-   `gemini_transcribe.py`: Transcribes audio using Google Gemini.
-   `openai_transcribe.py`: Transcribes audio using OpenAI (Whisper + GPT-4o).
-   `gemini_assess.py`: Agent performance QA using Gemini.
-   `openai_assess.py`: Agent performance QA using OpenAI.
-   `gemini_project_assess.py`: In-depth project assessment using multiple prompts (Gemini).
-   `openai_project_assess.py`: In-depth project assessment using multiple prompts (OpenAI).
-   `utils.py`: Shared utilities for document processing and cost tracking.
-   `prompt_manager.py`: Centralized logic for loading prompts from the `prompts/` folder.
-   `prompts/`: Organized directory for all AI instructions.
    -   `transcription/`: Formatting and language instructions.
    -   `agent_assessment/`: Quality assurance criteria.
    -   `project_assessment/`: Qualitative data and notation scoring.

## Usage

### 1. Transcription
Generate a Word document transcript from an audio file.

```bash
# Using Gemini
python gemini_transcribe.py "audio/file.mp3"

# Using OpenAI
python openai_transcribe.py "audio/file.mp3"
```
*Outputs (saved in `outputs/`): `<filename>_gemini.docx` or `<filename>_openai.docx`*

### 2. Agent Assessment
Evaluate the call agent's performance based on the transcript.

```bash
# Using Gemini
python gemini_assess.py "transcript.docx"

# Using OpenAI
python openai_assess.py "outputs/transcript.docx"
```
*Outputs (saved in `outputs/`): `<filename>_assessment.docx`*

### 3. Project Assessment
Extract qualitative data and project notations in JSON format.

```bash
# Using Gemini
python gemini_project_assess.py "transcript.docx"

# Using OpenAI
python openai_project_assess.py "outputs/transcript.docx"
```
*Outputs (saved in `outputs/`): `<filename>_qualitative.json` and `<filename>_notations.json`*

## Features

-   **Modular Engine**: Easily switch between OpenAI and Gemini for any task.
-   **Prompt Management**: Prompts are stored in external files for easy editing and discovery.
-   **Strict JSON Output**: Project assessment scripts provide clean JSON for downstream processing.
-   **Cost Tracking**: Integrated estimated cost reporting for all API calls.
