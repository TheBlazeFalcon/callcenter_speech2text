# Speech-to-Text Transcription and Summarization Walkthrough

I have implemented a Python tool that automates the transcription and summarization of audio files using OpenAI's Whisper and GPT-4o models.

## Changes Made

### Core Component
I created [main.py](file:///Users/fahdlemhaider/Projects/speech2text/main.py) which contains the full pipeline:
1.  **Transcription**: Uses the `whisper-1` model to convert audio to text.
2.  **Summarization**: Uses `gpt-4o` to generate a concise summary of the conversation.
3.  **Word Export**: Automatically formats and saves the results into a professional `.docx` file.

### Configuration
- [requirements.txt](file:///Users/fahdlemhaider/Projects/speech2text/requirements.txt): Defines the necessary Python packages.
- [.env.example](file:///Users/fahdlemhaider/Projects/speech2text/.env.example): Provides a template for the OpenAI API key.

## How to use the tool

### 1. Setup Environment
First, install the required libraries:
```bash
pip install -r requirements.txt
```

### 2. Configure API Key
Create a `.env` file in the project directory and add your OpenAI API Key:
```env
OPENAI_API_KEY=sk-your-key-here
```

### 3. Run the script
Run the script by providing the path to your audio file:
```bash
python main.py path/to/your/audio_file.mp3
```

By default, the script will create a file named `conversation_report.docx` in the same directory. You can specify a different output name using the `--output` flag:
```bash
python main.py my_audio.mp3 --output my_summary.docx
```

## Verification Results
- [x] Script structure verified.
- [x] Dependency list verified.
- [x] API integration logic reviewed for correctness.
- [x] Word document formatting logic implemented.
