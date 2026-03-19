import os
import time
from typing import Tuple, Dict
from google import genai
from dotenv import load_dotenv

from backend.core.utils import get_audio_duration, format_timecode, save_docx
from backend.core.prompt_manager import load_prompt

load_dotenv()

class TranscriptionService:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        # Pricing constants (defaulting to current Gemini 1.5 Flash rates)
        self.PRICING = {
            "gemini-audio": float(os.getenv("GEMINI_PRICING_AUDIO", 0.05)) / 3600,
            "gemini-output": float(os.getenv("GEMINI_PRICING_OUTPUT", 0.40)) / 1000000
        }

    def transcribe_with_gemini(self, audio_path: str) -> Dict:
        start_time = time.time()
        audio_duration = get_audio_duration(audio_path)
        
        try:
            audio_file = self.client.files.upload(file=audio_path)
            
            # Use model to generate content
            # Wait, the new SDK uses client.models.generate_content
            
            # Transcription
            transcription_prompt = load_prompt("transcription", "refined_darija_transcription")
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[audio_file, transcription_prompt]
            )
            transcript = response.text
            
            # 2. Summarization
            summary_prompt = "Provide a concise summary of this interview including key points and action items."
            summary_response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[transcript, summary_prompt]
            )
            summary = summary_response.text

            # Cost calculation
            audio_cost = audio_duration * self.PRICING["gemini-audio"]
            total_tokens = (len(transcript.split()) + len(summary.split())) * 1.5
            token_cost = total_tokens * self.PRICING["gemini-output"]
            
            elapsed = time.time() - start_time
            self.client.files.delete(name=audio_file.name)
            
            # Structured dialogue parsing
            dialogue = []
            import re
            for line in transcript.split('\n'):
                line = line.strip()
                if not line: continue
                # Match [HH:MM:SS] Speaker: text or Speaker: text
                m = re.match(r'(?:\[?(\d+:\d+:\d+|\d+:\d+)\]?\s*)?(Speaker\s*[A-Z\d]+|Agent|Customer|Client|Admin)\s*:\s*(.*)', line, re.IGNORECASE)
                if m:
                    time_str, speaker, text = m.groups()
                    dialogue.append({
                        "time": time_str or "00:00",
                        "speaker": speaker,
                        "text": text
                    })
            
            return {
                "transcript": transcript,
                "dialogue": dialogue,
                "summary": summary,
                "elapsed": elapsed,
                "cost": (audio_cost + token_cost),
                "engine": "gemini"
            }
        except Exception as e:
            raise Exception(f"Gemini processing failed: {str(e)}")
