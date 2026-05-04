import subprocess
import os

def execute_command(command: str):
    """
    Executes a shell command and returns the output.
    WARNING: This is powerful and should only be used with user consent.
    """
    try:
        # Run command with a timeout to prevent hanging
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True, 
            timeout=30
        )
        output = result.stdout if result.returncode == 0 else result.stderr
        return {
            "status": "success" if result.returncode == 0 else "error",
            "output": output,
            "exit_code": result.returncode
        }
    except Exception as e:
        return {"status": "error", "output": str(e), "exit_code": -1}

def list_files(path="."):
    try:
        files = os.listdir(path)
        return {"status": "success", "output": "\n".join(files)}
    except Exception as e:
        return {"status": "error", "output": str(e)}
