from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import time
import json
import os
import shutil
import yaml
import psutil
from pathlib import Path

from core.switcher import Switcher
from core.model_manager import ModelManager
from core.context import ContextTracker
from core.commands import CommandEngine
from core.memory import VectorMemory
from skills.terminal import execute_command
from skills.vision_capture import capture_screen
from skills.ui_control import mouse_click, type_text, press_key
import psutil
from core.logger import get_logger
import interfaces.db as db
try:
    from skills.web_search import search_internet, format_search_results
except ImportError:
    log.warning("duckduckgo-search not installed. Search Skill disabled.")
    def search_internet(*args, **kwargs): return []
    def format_search_results(*args, **kwargs): return "Search Skill unavailable."
from fastapi import UploadFile, File

log = get_logger("synapse.api")

app = FastAPI(title="Synapse Agentic API", version="1.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

switcher = Switcher()
manager = ModelManager()
commands = CommandEngine(switcher, manager)
memory = VectorMemory()

@app.get("/")
async def root():
    return {
        "name": "Synapse Agentic API",
        "version": "1.1",
        "routes": [route.path for route in app.routes]
    }

SYSTEM_PROMPT = """
You are Synapse, a premium, high-intelligence personal AI assistant. 
Your tone is professional, helpful, and highly structured.
You MUST follow these formatting rules:
1. Use Markdown headers (###) for sections.
2. Use bolding for key terms.
3. Use bullet points for lists.
4. If you have search results, synthesize them into a clear, cohesive answer.
5. Never mention you are a 'large language model'. You are Synapse.
6. You can suggest shell commands using # RUN_COMMAND.
7. You can interact with the UI. When you do, use this exact format:
```javascript
# UI_ACTION
{ "type": "ui", "command": "click", "params": { "x": 500, "y": 500 } }
// OR
{ "type": "ui", "command": "type", "params": { "text": "hello" } }
```
"""

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class ChatRequest(BaseModel):
    message: str
    file_path: str = None

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"path": str(file_path), "filename": file.filename}

@app.get("/api/sessions")
async def get_sessions():
    return db.get_sessions()

@app.post("/api/sessions")
async def create_session():
    session_id = db.create_session()
    return {"id": session_id}

@app.get("/api/sessions/{session_id}")
async def get_session_history(session_id: str):
    return db.get_messages(session_id)

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    db.delete_session(session_id)
    return {"status": "deleted"}

@app.get("/api/roles")
async def get_roles():
    config_path = Path("config/models.yaml")
    if config_path.exists():
        with open(config_path, "r") as f:
            cfg = yaml.safe_load(f)
            return cfg.get("roles", {})
    return {}

@app.put("/api/sessions/{session_id}")
async def update_session(session_id: str, req: dict):
    title = req.get("title")
    role = req.get("role")
    if title:
        db.update_session_title(session_id, title)
    if role:
        db.update_session_role(session_id, role)
    return {"status": "updated"}

@app.get("/api/sessions/{session_id}/export")
async def export_session(session_id: str):
    messages = db.get_messages(session_id)
    md = f"# Synapse Chat Export\nID: {session_id}\n\n"
    for m in messages:
        role = m["role"].upper()
        md += f"## {role}\n{m['content']}\n\n---\n\n"
    return {"markdown": md}

def detect_search_intent(query: str) -> bool:
    keywords = ["news", "weather", "today", "current", "latest", "who is", "what is happening", "results", "price"]
    return any(kw in query.lower() for kw in keywords)

@app.post("/api/sessions/{session_id}/chat")
async def chat_endpoint(session_id: str, req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    start_time = time.time()
    
    def generate():
        nonlocal start_time
        # 0. Command & Mention Engine
        cmd_type, cmd_model, cmd_query, cmd_reason = commands.execute(req.message)
        
        # 0. Performance Tier Check
        config_path = Path("config/models.yaml")
        tier = "balanced"
        if config_path.exists():
            with open(config_path, "r") as f:
                cfg = yaml.safe_load(f)
                tier = cfg.get("performance_tier", "balanced")
        
        # Get session info (for role)
        session = db.get_session(session_id)
        role_id = session.get("role", "generalist")
        role_cfg = cfg.get("roles", {}).get(role_id, {})
        role_system_prompt = role_cfg.get("system_prompt", SYSTEM_PROMPT)
        
        # Default routing
        model_type, model_name, processed_query, reason = switcher.route(req.message)
        
        # Override model name if role has a specific mapping for this type
        expert_map = role_cfg.get("expert_map", {})
        if model_type in expert_map:
            model_name = expert_map[model_type]
            reason = f"role override ({role_id})"
        
        if cmd_type:
            model_type, model_name, processed_query, reason = cmd_type, cmd_model, cmd_query, cmd_reason

        # 1. Collaborative Loop: Check if chaining is needed
        is_chained = "research" in req.message.lower() and ("code" in req.message.lower() or "python" in req.message.lower())
        search_context = ""
        
        if is_chained:
            yield "💭 *Council Deliberation: Multi-expert chain detected...*\n\n"
            results = search_internet(req.message)
            search_context = f"\nRESEARCH DATA FOUND:\n{format_search_results(results)}\n"
            yield "🔍 *Researcher has completed data retrieval. Handing off to Coder expert...*\n\n"
            model_type, model_name, reason = "code", switcher.models["code"]["name"], "chained handoff (search -> code)"
        
        # 2. Vector Memory (RAG)
        rag_context = ""
        try:
            relevant = memory.search(processed_query)
            if relevant:
                rag_context = "\n\nRELEVANT PAST KNOWLEDGE:\n" + "\n".join([f"- {m['content']}" for m in relevant if m['similarity'] > 0.7])
        except Exception as e:
            log.warn(f"RAG search failed: {e}")

        # 3. Web Search Fallback
        is_searching = detect_search_intent(processed_query) and not is_chained
        if is_searching:
            yield "💭 *Searching the neural web for real-time data...*\n\n"
            results = search_internet(processed_query)
            search_context = format_search_results(results)

        # 4. Message Construction
        history = db.get_messages(session_id)[-10:]
        db.add_message(session_id, "user", req.message, model_name)
        
        history_msgs = [{"role": m["role"], "content": m["content"]} for m in history]
        history_msgs.append({"role": "user", "content": processed_query + rag_context})
        
        full_messages = [
            {"role": "system", "content": role_system_prompt},
            {"role": "system", "content": f"Real-time Context: {search_context}" if search_context else "No real-time context available."}
        ] + history_msgs

        # 5. Model Execution
        full_response = ""
        for token in manager.chat_stream(model_name, full_messages):
            full_response += token
            yield token
        
        latency = round(time.time() - start_time, 2)
        db.add_message(session_id, "assistant", full_response, model_name, latency)
        
        metadata = json.dumps({
            "type": "metadata",
            "model": model_name,
            "latency": latency,
            "routing": reason
        })
        yield f"\n\n<!--METADATA:{metadata}-->"

    return StreamingResponse(generate(), media_type="text/plain")

@app.get("/api/status")
async def get_status():
    try:
        mem = psutil.virtual_memory()
        cpu = psutil.cpu_percent()
        # Real load distribution based on historical activity
        try:
            load_dist = [db.get_activity_score(i) for i in range(15)]
        except:
            load_dist = [20] * 15
        
        return {
            "ollama_running": manager.is_running(),
            "current_model": manager.current_model or "Standby",
            "requests_total": db.get_total_messages(),
            "uptime": "8h 12m",
            "load_distribution": load_dist,
            "vram": {
                "used": f"{(mem.used / 1024**3):.1f}GB",
                "total": f"{(mem.total / 1024**3):.1f}GB",
                "percent": mem.percent
            },
            "cpu": {
                "percent": cpu,
                "cores": psutil.cpu_count()
            }
        }
    except Exception as e:
        print(f"Status error: {e}")
        return {"status": "degraded", "error": str(e)}

@app.get("/api/models")
async def get_models():
    # Return detailed model info for the dashboard
    installed = manager.list_installed()
    available = switcher.list_models()
    
    detailed_installed = []
    for name in installed:
        # Match with switcher config if possible
        m_type = "unknown"
        for k, v in available.items():
            if v == name: m_type = k
        
        detailed_installed.append({
            "name": name,
            "type": m_type,
            "status": "loaded" if name == manager.current_model else "standby",
            "size": "2.3GB" if "phi3" in name else "1.5GB"
        })
    
    return {"installed": detailed_installed, "available": available}

@app.get("/api/logs")
async def get_logs():
    log_path = Path("synapse.log")
    if not log_path.exists():
        return {"logs": ["Log file not found."]}
    
    with open(log_path, "r") as f:
        lines = f.readlines()
        return {"logs": lines[-50:]}

@app.post("/api/models/pull")
async def pull_model(req: dict):
    name = req.get("name")
    def generate():
        for status in manager.pull_model(name):
            yield f"{status}\n"
    return StreamingResponse(generate(), media_type="text/plain")

@app.delete("/api/models/{model_name}")
async def delete_model(model_name: str):
    ok = manager.delete_model(model_name)
    return {"status": "deleted" if ok else "failed"}

@app.get("/api/vision/capture")
async def get_screenshot():
    path = capture_screen()
    if path:
        return {"status": "success", "path": path}
    return {"status": "error", "message": "Capture failed"}

@app.post("/api/actions/run")
async def run_action(req: dict):
    action_type = req.get("type")
    command = req.get("command")
    params = req.get("params", {})
    
    if action_type == "terminal":
        log.info(f"Executing terminal action: {command}")
        return execute_command(command)
        
    if action_type == "ui":
        log.info(f"Executing UI action: {command} with {params}")
        if command == "click":
            ok = mouse_click(params.get("x"), params.get("y"))
        elif command == "type":
            ok = type_text(params.get("text"))
        elif command == "key":
            ok = press_key(params.get("key"))
        return {"status": "success" if ok else "error"}
    
    return {"status": "error", "message": "Unknown action type"}

@app.get("/api/config/models")
async def get_config_models():
    import yaml
    path = Path("config/models.yaml")
    if not path.exists():
        return {"error": "Config not found"}
    with open(path, "r") as f:
        return yaml.safe_load(f)

@app.post("/api/config/models")
async def save_config_models(req: dict):
    import yaml
    path = Path("config/models.yaml")
    with open(path, "w") as f:
        yaml.safe_dump(req, f)
    return {"status": "saved"}


@app.get("/api/skills")
async def list_skills():
    cmd_dir = Path("commands")
    skills = []
    if cmd_dir.exists():
        for file in cmd_dir.glob("*.py"):
            if file.name != "__init__.py":
                skills.append({"id": file.stem, "type": "python", "path": str(file)})
    return {"skills": skills}

@app.post("/api/skills")
async def create_skill(req: dict):
    name = req.get("name")
    code = req.get("code")
    if not name or not code:
        raise HTTPException(status_code=400, detail="Name and code are required")
    
    path = Path("commands") / f"{name}.py"
    with open(path, "w") as f:
        f.write(code)
    
    # Reload command engine
    commands.load_custom_commands()
    return {"status": "created", "path": str(path)}

if __name__ == "__main__":
    uvicorn.run("interfaces.api:app", host="0.0.0.0", port=8000, reload=True)
