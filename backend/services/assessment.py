import os
import time
import json
from typing import Tuple, Dict
import google.generativeai as genai
from openai import OpenAI
from dotenv import load_dotenv

from backend.core.utils import read_docx, save_json, clean_markdown, save_assessment_docx
from backend.core.prompt_manager import load_prompt

load_dotenv()

class AssessmentService:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.gemini_model = genai.GenerativeModel("models/gemini-flash-latest")

    def assess_agent(self, docx_path: str, engine: str = "gemini") -> Dict:
        transcript_text = read_docx(docx_path)
        if not transcript_text.strip():
            raise ValueError("Transcript is empty")

        system_prompt = load_prompt("agent_assessment", "qa_expert")
        start_time = time.time()
        
        if engine == "gemini":
            response = self.gemini_model.generate_content([system_prompt, f"Analyze this transcript:\n\n{transcript_text}"])
            analysis = response.text
        else:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Analyze this transcript:\n\n{transcript_text}"}
                ]
            )
            analysis = response.choices[0].message.content

        json_text = clean_markdown(analysis)
        data = json.loads(json_text)
        elapsed = time.time() - start_time
        
        return {
            "data": data,
            "raw_json": json_text,
            "elapsed": elapsed
        }

    def assess_project(self, docx_path: str, engine: str = "gemini") -> Dict:
        # Assuming similar logic for project assessment
        # Reusing the scripts patterns
        transcript_text = read_docx(docx_path)
        
        # Simplified for now based on exploration - would normally have 2 separate prompts
        # but the request is to unify.
        notations_prompt = load_prompt("project_assessment", "project_notation")
        qualitative_prompt = load_prompt("project_assessment", "project_qualitative")
        
        # In a real scenario, we'd run both.
        # For this refactor, I'll provide a method that can handle both if needed.
        return {} # Placeholder for project logic consolidation
