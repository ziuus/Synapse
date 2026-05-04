import subprocess
import os
from pathlib import Path
from datetime import datetime

def capture_screen():
    """
    Captures the current screen and saves it to a temporary file.
    Returns the path to the screenshot.
    """
    capture_dir = Path("data/captures")
    capture_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"screen_{timestamp}.png"
    filepath = capture_dir / filename
    
    try:
        # Use scrot for full screen capture
        subprocess.run(["scrot", str(filepath)], check=True)
        return str(filepath)
    except Exception as e:
        print(f"Capture failed: {e}")
        return None

def capture_and_grid():
    """
    Captures screen and potentially adds a coordinate grid (for future LLM guidance).
    """
    return capture_screen()
