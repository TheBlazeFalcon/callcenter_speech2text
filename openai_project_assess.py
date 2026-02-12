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

def run_analysis(transcript_text: str, prompt_category: str, prompt_name: str) -> Tuple[str, float, float]:
    """Runs a specific analysis using a prompt."""
    start_time = time.time()
    prompt_content = load_prompt(prompt_category, prompt_name)

    print(f"      Running analysis: {prompt_name}...")
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt_content},
                {"role": "user", "content": f"Transcript to analyze:\n\n{transcript_text}"}
            ]
        )
        content = response.choices[0].message.content.strip()
        metrics = calculate_gpt_cost(prompt_content + transcript_text, content)
        elapsed = time.time() - start_time
        return content, elapsed, metrics["cost"]
    except Exception as e:
        print(f"Error during OpenAI analysis: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Analyze transcript using multiple OpenAI project assessment prompts.")
    parser.add_argument("docx_path", help="Path to the transcribed .docx file")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.docx_path):
        print(f"Error: File '{args.docx_path}' not found.")
        sys.exit(1)

    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not found.")
        sys.exit(1)

    total_start = time.time()
    transcript_text = read_docx(args.docx_path)
    
    if not transcript_text.strip():
        print("Error: The transcription document is empty. Stopping.")
        sys.exit(1)

    print(f"\n[1/3] Reading: {os.path.basename(args.docx_path)}...")
    print("[2/3] Performing qualitative and notation analyses (Project Assessment)...")
    base_name = os.path.splitext(os.path.basename(args.docx_path))[0]
    
    analyses = [
        ("project_assessment", "qualitative"),
        ("project_assessment", "notations")
    ]
    
    total_cost = 0.0
    results = {}

    os.makedirs("outputs", exist_ok=True)
    for cat, name in analyses:
        content, elapsed, cost = run_analysis(transcript_text, cat, name)
        clean_content = clean_markdown(content)
        results[name] = clean_content
        total_cost += cost
        output_filename = os.path.join("outputs", f"{base_name}_{name}.json")
        save_json(clean_content, output_filename)

    print("\n[3/3] Final JSON Results (Project Assessment):")
    for name, content in results.items():
        print(f"\n--- {name.upper()} ANALYSIS ---")
        print(content)
    
    total_time = time.time() - total_start
    print("-" * 40)
    print(f"SUCCESS: Analysis completed.")
    print(f"Total Time: {total_time:.2f}s | Total Cost: ${total_cost:.4f}")
    print("-" * 40)

if __name__ == "__main__":
    main()
