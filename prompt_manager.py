import os

PROMPTS_DIR = "prompts"

def load_prompt(category: str, name: str) -> str:
    """
    Loads a prompt from the prompts directory.
    category: transcription, agent_assessment, or project_assessment
    name: the filename without the .md extension
    """
    path = os.path.join(PROMPTS_DIR, category, f"{name}.md")
    if not os.path.exists(path):
        # Fallback to old structure if not found (root of prompts/)
        path = os.path.join(PROMPTS_DIR, f"transcript_analysis_{name}.md")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Prompt file not found: {path} (checked both subfolder and root)")
    
    with open(path, 'r') as f:
        return f.read().strip()
