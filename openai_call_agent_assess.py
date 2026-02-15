import os
import sys
import argparse
import time
from typing import Tuple, Dict
from openai import OpenAI
from dotenv import load_dotenv
import tiktoken

from utils import read_docx, save_json, clean_markdown
from prompt_manager import load_prompt

# Load environmental variables from .env file
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Pricing constants
PRICING = {
    "gpt-4o": {
        "input": 0.0025 / 1000,
        "output": 0.010 / 1000
    }
}

def calculate_gpt_cost(prompt: str, completion: str) -> Dict[str, float]:
    try:
        encoding = tiktoken.encoding_for_model("gpt-4o")
        in_tokens = len(encoding.encode(prompt))
        out_tokens = len(encoding.encode(completion))
        cost = (in_tokens * PRICING["gpt-4o"]["input"]) + (out_tokens * PRICING["gpt-4o"]["output"])
        return {"cost": cost, "in_tokens": in_tokens, "out_tokens": out_tokens}
    except Exception:
        return {"cost": 0.0, "in_tokens": 0, "out_tokens": 0}

def assess_agent_performance(transcript_text: str) -> Tuple[str, float, float]:
    """Generates summary and agent assessment using OpenAI GPT-4o."""
    start_time = time.time()
    print("[1/2] Analyzing conversation and assessing agent...")
    
    try:
        system_prompt = load_prompt("agent_assessment", "qa_expert")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this transcript:\n\n{transcript_text}"}
            ]
        )
        content = response.choices[0].message.content
        metrics = calculate_gpt_cost(system_prompt + transcript_text, content)
        elapsed = time.time() - start_time
        return content, elapsed, metrics["cost"]
    except Exception as e:
        print(f"Error during assessment: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Assess call agent performance from a transcript using OpenAI.")
    parser.add_argument("docx_path", help="Path to the transcribed .docx file")
    parser.add_argument("--output", "-o", default=None, help="Output Word file path")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.docx_path):
        print(f"Error: File '{args.docx_path}' not found.")
        sys.exit(1)

    os.makedirs("outputs", exist_ok=True)
    if not args.output:
        base_name = os.path.splitext(os.path.basename(args.docx_path))[0]
        args.output = os.path.join("outputs", f"{base_name}_assessment.json")
    else:
        # If user provides a path but it's just a filename, put it in outputs
        if not os.path.dirname(args.output):
            args.output = os.path.join("outputs", args.output)

    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not found.")
        sys.exit(1)

    total_start = time.time()
    transcript_text = read_docx(args.docx_path)
    
    if not transcript_text.strip():
        print("Error: The transcription document is empty. Stopping.")
        sys.exit(1)

    analysis, a_time, a_cost = assess_agent_performance(transcript_text)
    
    # Clean and parse JSON
    json_text = clean_markdown(analysis)
    import json
    try:
        data = json.loads(json_text)
        
        # Save JSON
        save_json(json_text, args.output)
        
        # Save Docx (replace .json with .docx in path)
        docx_output = args.output.replace('.json', '.docx')
        from utils import save_assessment_docx
        save_assessment_docx(data, docx_output)
        
        success_msg = f"Assessment saved to {args.output} and {docx_output}"
    except Exception as e:
        print(f"Warning: Could not parse assessment as JSON for Docx generation: {e}")
        save_json(json_text, args.output)
        success_msg = f"Assessment saved to {args.output} (JSON only)"
    
    total_time = time.time() - total_start
    print("-" * 40)
    print(f"SUCCESS: {success_msg}")
    print(f"Total Time: {total_time:.2f}s | Assessment Cost: ${a_cost:.4f}")
    print("-" * 40)

if __name__ == "__main__":
    main()
