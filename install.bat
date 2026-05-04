@echo off
echo.
echo  Synapse Installer for Windows
echo  ================================

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install from https://python.org
    pause
    exit /b 1
)
echo [OK] Python found

:: Check Ollama
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Ollama not found.
    echo        Download from https://ollama.com/download and install it.
    echo        Then re-run this script.
    pause
    exit /b 1
)
echo [OK] Ollama found

:: Install dependencies
echo.
echo Installing Python dependencies...
pip install -r requirements.txt --quiet
echo [OK] Dependencies installed

:: Pull models
echo.
echo Pulling recommended models (this may take a while)...
echo Pulling phi3:mini (~2.3GB)...
ollama pull phi3:mini

echo Pulling qwen2.5-coder:1.5b (~1GB)...
ollama pull qwen2.5-coder:1.5b

echo Pulling moondream (vision, ~1.8GB)...
ollama pull moondream

echo.
echo  Synapse installed successfully!
echo.
echo  Start with:
echo    python main.py          <- CLI mode
echo    python main.py --web    <- Web UI
echo    python main.py --status <- Check system
echo.
pause
