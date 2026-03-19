import os
import time
import json
from typing import Tuple, Dict
from google import genai
from dotenv import load_dotenv

from backend.core.utils import read_docx, save_json, clean_markdown, save_assessment_docx
from backend.core.prompt_manager import load_prompt

load_dotenv()

class AssessmentService:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.model_id = "gemini-2.5-flash"

    def assess_agent(self, transcript_text: str) -> Dict:
        if not transcript_text or not transcript_text.strip():
            raise ValueError("Transcript is empty")

        system_prompt = load_prompt("agent_assessment", "qa_expert")
        start_time = time.time()
        
        response = self.client.models.generate_content(
            model=self.model_id,
            contents=[system_prompt, f"Analyze this transcript:\n\n{transcript_text}"]
        )
        analysis = response.text

        json_text = clean_markdown(analysis)
        try:
            data = json.loads(json_text)
        except json.JSONDecodeError as e:
            # Try to extract JSON from code blocks if present
            import re
            m = re.search(r'```json\s*(.*?)\s*```', analysis, re.DOTALL)
            if not m:
                m = re.search(r'```\s*(.*?)\s*```', analysis, re.DOTALL)
            if m:
                json_text = m.group(1)
                data = json.loads(json_text)
            else:
                raise e
        elapsed = time.time() - start_time
        
        # Mapping fields to AgentAssessment model
        return {
            "agent_summary": data.get("call_summary"),
            "final_verdict": data.get("final_verdict"),
            "behavioral_analysis": data.get("behavioral_analysis"),
            "qualitative_observations": data.get("qualitative_observations"),
            "agent_performance": data.get("agent_performance"),
            "elapsed": elapsed
        }

    def assess_project(self, transcript_text: str) -> Dict:
        """Analyzes a transcript from a project-level perspective (notation and qualitative)."""
        if not transcript_text or not transcript_text.strip():
            raise ValueError("Transcript is empty")
        
        # 1. Project Notation (Scoring)
        notation_prompt = load_prompt("project_assessment", "notations")
        notation_response = self.client.models.generate_content(
            model=self.model_id,
            contents=[notation_prompt, f"Analyze this transcript:\n\n{transcript_text}"]
        )
        notation_text = clean_markdown(notation_response.text)
        try:
            notation_data = json.loads(notation_text)
        except json.JSONDecodeError:
            import re
            m = re.search(r'```json\s*(.*?)\s*```', notation_response.text, re.DOTALL)
            if m: notation_data = json.loads(m.group(1))
            else: raise
        
        # 2. Qualitative Analysis
        qualitative_prompt = load_prompt("project_assessment", "qualitative")
        qualitative_response = self.client.models.generate_content(
            model=self.model_id,
            contents=[qualitative_prompt, f"Analyze this transcript:\n\n{transcript_text}"]
        )
        qualitative_text = clean_markdown(qualitative_response.text)
        try:
            qualitative_data = json.loads(qualitative_text)
        except json.JSONDecodeError:
            import re
            m = re.search(r'```json\s*(.*?)\s*```', qualitative_response.text, re.DOTALL)
            if m: qualitative_data = json.loads(m.group(1))
            else: raise
        
        return {
            "project_summary": qualitative_data.get("project_summary"),
            "project_data": {
                "notation": notation_data,
                "qualitative": qualitative_data
            }
        }
