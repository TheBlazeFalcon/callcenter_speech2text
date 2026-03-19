import os
import time
from typing import Tuple, Dict
import google.generativeai as genai
from dotenv import load_dotenv

from backend.core.utils import get_audio_duration, format_timecode, save_docx
from backend.core.prompt_manager import load_prompt

load_dotenv()

class TranscriptionService:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        
        # Pricing constants
        self.PRICING = {
            "gemini-audio": 0.05 / 3600,
            "gemini-output": 0.40 / 1000000
        }

    def transcribe_with_gemini(self, audio_path: str) -> Dict:
        start_time = time.time()
        audio_duration = get_audio_duration(audio_path)
        
        try:
            audio_file = genai.upload_file(path=audio_path)
            while audio_file.state.name == "PROCESSING":
                time.sleep(1)
                audio_file = genai.get_file(audio_file.name)

            if audio_file.state.name == "FAILED":
                raise Exception("Gemini file processing failed.")

            model = genai.GenerativeModel("models/gemini-flash-latest")
            
            # 1. Transcription
            transcription_prompt = load_prompt("transcription", "darija_transcription")
            response = model.generate_content([audio_file, transcription_prompt])
            transcript = response.text
            
            # 2. Summarization
            summary_prompt = "Provide a concise summary of this interview including key points and action items."
            summary_response = model.generate_content([transcript, summary_prompt])
            summary = summary_response.text

            # Cost calculation
            audio_cost = audio_duration * self.PRICING["gemini-audio"]
            total_tokens = (len(transcript.split()) + len(summary.split())) * 1.5
            token_cost = total_tokens * self.PRICING["gemini-output"]
            
            elapsed = time.time() - start_time
            genai.delete_file(audio_file.name)
            
            return {
                "transcript": transcript,
                "summary": summary,
                "elapsed": elapsed,
                "cost": (audio_cost + token_cost),
                "engine": "gemini"
            }
        except Exception as e:
            raise Exception(f"Gemini processing failed: {str(e)}")
