import os
import sys
import argparse
import time
from typing import Tuple
import google.generativeai as genai
from dotenv import load_dotenv

from utils import read_docx, save_docx
from prompt_manager import load_prompt

# Load environmental variables from .env file
load_dotenv()

# Initialize Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Pricing constants
PRICING = {
    "gemini-output": 0.40 / 1000000 
}

def assess_agent_performance(transcript_text: str) -> Tuple[str, float, float]:
    """Generates summary and agent assessment using Gemini 1.5 Flash."""
    start_time = time.time()
    print("[1/2] Analyzing conversation and assessing agent...")
    
    try:
        model = genai.GenerativeModel("models/gemini-flash-latest")
        system_prompt = load_prompt("agent_assessment", "qa_expert")
        
        response = model.generate_content([system_prompt, f"Analyze this transcript:\n\n{transcript_text}"])
        content = response.text
        
        total_tokens = (len(system_prompt.split()) + len(transcript_text.split()) + len(content.split())) * 1.5
        token_cost = total_tokens * PRICING["gemini-output"]
        
        elapsed = time.time() - start_time
        return content, elapsed, token_cost
    except Exception as e:
        print(f"Error during Gemini assessment: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Assess call agent performance from a transcript using Gemini.")
    parser.add_argument("docx_path", nargs="+", help="Path to the transcribed .docx file")
    parser.add_argument("--output", "-o", default=None, help="Output Word file path")
    
    args = parser.parse_args()
    args.docx_path = " ".join(args.docx_path)
    
    if not os.path.exists(args.docx_path):
        print(f"Error: File '{args.docx_path}' not found.")
        sys.exit(1)

    os.makedirs("outputs", exist_ok=True)
    if not args.output:
        base_name = os.path.splitext(os.path.basename(args.docx_path))[0]
        args.output = os.path.join("outputs", f"{base_name}_assessment.docx")
    else:
        # If user provides a path but it's just a filename, put it in outputs
        if not os.path.dirname(args.output):
            args.output = os.path.join("outputs", args.output)

    if not os.getenv("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY not found.")
        sys.exit(1)

    total_start = time.time()
    transcript_text = read_docx(args.docx_path)
    
    if not transcript_text.strip():
        print("Error: The transcription document is empty. Stopping.")
        sys.exit(1)

    analysis, a_time, a_cost = assess_agent_performance(transcript_text)
    
    save_docx(None, analysis, args.output, 'Agent Performance Assessment')
    
    total_time = time.time() - total_start
    print("-" * 40)
    print(f"SUCCESS: Assessment saved to {args.output}")
    print(f"Total Time: {total_time:.2f}s | Est. Assessment Cost: ${a_cost:.6f}")
    print("-" * 40)

if __name__ == "__main__":
    main()
