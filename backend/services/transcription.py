import os
import time
from typing import Tuple, Dict
from openai import OpenAI
import google.generativeai as genai
from dotenv import load_dotenv
import tiktoken

from backend.core.utils import get_audio_duration, format_timecode, save_docx
from backend.core.prompt_manager import load_prompt

load_dotenv()

class TranscriptionService:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        
        # Pricing constants
        self.PRICING = {
            "gemini-audio": 0.05 / 3600,
            "gemini-output": 0.40 / 1000000,
            "whisper": 0.006,
            "gpt-4o": {
                "input": 0.0025 / 1000,
                "output": 0.010 / 1000
            }
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

    def transcribe_with_openai(self, audio_path: str) -> Dict:
        start_time = time.time()
        audio_duration = get_audio_duration(audio_path)
        whisper_cost = (audio_duration / 60.0) * self.PRICING["whisper"]
        
        try:
            # 1. Whisper Transcription
            darija_prompt = load_prompt("transcription", "darija_transcription")
            with open(audio_path, "rb") as audio_file:
                whisper_resp = self.openai_client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    response_format="verbose_json",
                    prompt=darija_prompt
                )
            
            # 2. Speaker Identification (GPT-4o)
            segments = whisper_resp.segments
            raw_text_with_times = ""
            for s in segments:
                raw_text_with_times += f"{format_timecode(s.start)} {s.text}\n"

            system_prompt_speaker = """You are an expert at analyzing interview transcripts. 
Use 'Speaker A', 'Speaker B', etc. format. Format: [Timecode] Speaker X: [Caption]. Maintain original language."""
            
            speaker_resp = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt_speaker},
                    {"role": "user", "content": f"Please identify speakers:\n\n{raw_text_with_times}"}
                ]
            )
            transcript = speaker_resp.choices[0].message.content
            
            # 3. Summarization
            system_prompt_summ = "Summarize conversation between 'Call Agent' and 'Xplorer'."
            summ_resp = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt_summ},
                    {"role": "user", "content": transcript}
                ]
            )
            summary = summ_resp.choices[0].message.content
            
            # Simple cost estimate for GPT components
            encoding = tiktoken.encoding_for_model("gpt-4o")
            total_tokens = len(encoding.encode(transcript + summary + system_prompt_speaker + system_prompt_summ))
            gpt_cost = total_tokens * self.PRICING["gpt-4o"]["input"] 
            
            elapsed = time.time() - start_time
            return {
                "transcript": transcript,
                "summary": summary,
                "elapsed": elapsed,
                "cost": whisper_cost + gpt_cost,
                "engine": "openai"
            }
        except Exception as e:
            raise Exception(f"OpenAI processing failed: {str(e)}")
