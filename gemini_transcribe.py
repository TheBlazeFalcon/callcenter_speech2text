import os
import sys
import argparse
import time
from typing import Tuple
import google.generativeai as genai
from dotenv import load_dotenv

from utils import get_audio_duration, save_docx
from prompt_manager import load_prompt

# Load environmental variables from .env file
load_dotenv()

# Initialize Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Pricing constants for Gemini 1.5 Flash (Approximate)
PRICING = {
    "gemini-audio": 0.05 / 3600,   # $0.05 per hour
    "gemini-output": 0.40 / 1000000 # $0.40 per 1M tokens
}

def process_with_gemini(audio_path: str) -> Tuple[str, str, float, float]:
    """Transcribes and summarizes audio using Gemini 1.5 Flash."""
    start_time = time.time()
    audio_duration = get_audio_duration(audio_path)
    
    print(f"\n[1/2] Uploading and processing audio: {os.path.basename(audio_path)}...")
    
    try:
        audio_file = genai.upload_file(path=audio_path)
        while audio_file.state.name == "PROCESSING":
            time.sleep(1)
            audio_file = genai.get_file(audio_file.name)

        if audio_file.state.name == "FAILED":
            raise Exception("Gemini file processing failed.")

        model = genai.GenerativeModel("models/gemini-flash-latest")

        # 1. Transcription
        print("      Transcribing and identifying speakers...")
        transcription_prompt = load_prompt("transcription", "darija_transcription")
        response = model.generate_content([audio_file, transcription_prompt])
        transcript = response.text
        
        # 2. Summarization
        print("[2/2] Generating summary...")
        summary_prompt = "Provide a concise summary of this interview including key points and action items."
        summary_response = model.generate_content([transcript, summary_prompt])
        summary = summary_response.text

        # Cost calculation
        audio_cost = audio_duration * PRICING["gemini-audio"]
        total_tokens = (len(transcript.split()) + len(summary.split())) * 1.5
        token_cost = total_tokens * PRICING["gemini-output"]
        
        elapsed = time.time() - start_time
        genai.delete_file(audio_file.name)
        
        return transcript, summary, elapsed, (audio_cost + token_cost)
        
    except Exception as e:
        print(f"Error during Gemini processing: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Transcribe and summarize audio using Google Gemini.")
    parser.add_argument("audio_path", help="Path to the audio file")
    parser.add_argument("--output", "-o", default=None, help="Output Word file path")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.audio_path):
        print(f"Error: File '{args.audio_path}' not found.")
        sys.exit(1)
        
    os.makedirs("outputs", exist_ok=True)
    if not args.output:
        base_name = os.path.splitext(os.path.basename(args.audio_path))[0]
        args.output = os.path.join("outputs", f"{base_name}_gemini.docx")
    else:
        # If user provides a path but it's just a filename, put it in outputs
        if not os.path.dirname(args.output):
            args.output = os.path.join("outputs", args.output)

    if not os.getenv("GEMINI_API_KEY"):
        print("Error: GEMINI_API_KEY not found.")
        sys.exit(1)

    total_start = time.time()
    transcript, summary, elapsed, cost = process_with_gemini(args.audio_path)
    save_docx(transcript, summary, args.output, 'Conversation Summary & Transcript')
    total_time = time.time() - total_start

    print("-" * 40)
    print(f"SUCCESS: Report saved to {args.output}")
    print("-" * 40)
    print(f"{'Metric':<20} | {'Value'}")
    print("-" * 40)
    print(f"{'Total Time':<20} | {total_time:.2f}s")
    print(f"{'Estimated Cost':<20} | ${cost:.6f}")
    print("-" * 40)

if __name__ == "__main__":
    main()