import os
import sys
import argparse
import time
from typing import Tuple, Dict
from openai import OpenAI
from dotenv import load_dotenv
import tiktoken

from utils import get_audio_duration, format_timecode, save_docx
from prompt_manager import load_prompt

# Load environmental variables from .env file
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Pricing constants
PRICING = {
    "whisper": 0.006,  # $0.006 per minute
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

def transcribe_audio(audio_file_path: str) -> Tuple[list, float, float]:
    start_time = time.time()
    audio_duration = get_audio_duration(audio_file_path)
    whisper_cost = (audio_duration / 60.0) * PRICING["whisper"]
    
    print(f"\n[1/3] Transcribing: {os.path.basename(audio_file_path)}...")
    darija_prompt = load_prompt("transcription", "darija_transcription")
    
    try:
        with open(audio_file_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                response_format="verbose_json",
                prompt=darija_prompt
            )
        elapsed = time.time() - start_time
        return response.segments, elapsed, whisper_cost
    except Exception as e:
        print(f"Error during transcription: {e}")
        sys.exit(1)

def identify_speakers(segments: list) -> Tuple[str, float, float]:
    start_time = time.time()
    print("[2/3] Identifying speakers and formatting dialogue...")
    
    raw_text_with_times = ""
    for s in segments:
        raw_text_with_times += f"{format_timecode(s.start)} {s.text}\n"

    system_prompt = """You are an expert at analyzing interview transcripts. 
Your task is to take a transcript with timestamps and assign generic speaker labels (Speaker A, Speaker B, etc.).
Rules:
1. Use 'Speaker A', 'Speaker B', etc. format.
2. Format each line: [Timecode] Speaker X: [Caption]
3. Maintain original language and spelling. Do not translate."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Please identify speakers and format this transcript:\n\n{raw_text_with_times}"}
            ]
        )
        content = response.choices[0].message.content
        metrics = calculate_gpt_cost(system_prompt + raw_text_with_times, content)
        elapsed = time.time() - start_time
        return content, elapsed, metrics["cost"]
    except Exception as e:
        print(f"Error during speaker identification: {e}")
        sys.exit(1)

def summarize_transcript(transcript: str) -> Tuple[str, float, float]:
    start_time = time.time()
    print("[3/3] Generating summary...")
    system_prompt = "You are a helpful assistant that summarizes conversations between a 'Call Agent' and 'Xplorer'."
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript}
            ]
        )
        content = response.choices[0].message.content
        metrics = calculate_gpt_cost(system_prompt + transcript, content)
        elapsed = time.time() - start_time
        return content, elapsed, metrics["cost"]
    except Exception as e:
        print(f"Error during summarization: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Transcribe and summarize audio files with cost tracking.")
    parser.add_argument("audio_path", help="Path to the audio file")
    parser.add_argument("--output", "-o", default=None, help="Output Word file path")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.audio_path):
        print(f"Error: File '{args.audio_path}' not found.")
        sys.exit(1)
        
    os.makedirs("outputs", exist_ok=True)
    if not args.output:
        base_name = os.path.splitext(os.path.basename(args.audio_path))[0]
        args.output = os.path.join("outputs", f"{base_name}_openai.docx")
    else:
        # If user provides a path but it's just a filename, put it in outputs
        if not os.path.dirname(args.output):
            args.output = os.path.join("outputs", args.output)

    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not found.")
        sys.exit(1)

    total_start = time.time()
    segments, time_t, cost_t = transcribe_audio(args.audio_path)
    text_dialogue, time_d, cost_d = identify_speakers(segments)
    summary, time_s, cost_s = summarize_transcript(text_dialogue)
    save_docx(text_dialogue, summary, args.output, 'Conversation Summary & Transcript')
    
    total_time = time.time() - total_start
    total_cost = cost_t + cost_d + cost_s

    print("-" * 40)
    print(f"SUCCESS: Report saved to {args.output}")
    print("-" * 40)
    print(f"{'Step':<20} | {'Time':<10} | {'Cost'}")
    print("-" * 40)
    print(f"{'Whisper Transcribe':<20} | {time_t:>8.2f}s | ${cost_t:.4f}")
    print(f"{'Speaker ID':<20} | {time_d:>8.2f}s | ${cost_d:.4f}")
    print(f"{'Summarization':<20} | {time_s:>8.2f}s | ${cost_s:.4f}")
    print("-" * 40)
    print(f"{'TOTAL':<20} | {total_time:>8.2f}s | ${total_cost:.4f}")
    print("-" * 40)

if __name__ == "__main__":
    main()