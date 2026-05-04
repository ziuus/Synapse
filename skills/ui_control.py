import subprocess

def mouse_click(x, y):
    try:
        subprocess.run(["xdotool", "mousemove", str(x), str(y), "click", "1"], check=True)
        return True
    except:
        return False

def type_text(text):
    try:
        subprocess.run(["xdotool", "type", text], check=True)
        return True
    except:
        return False

def press_key(key):
    try:
        subprocess.run(["xdotool", "key", key], check=True)
        return True
    except:
        return False

def scroll(direction="down"):
    key = "button4" if direction == "up" else "button5"
    try:
        subprocess.run(["xdotool", "click", key], check=True)
        return True
    except:
        return False
