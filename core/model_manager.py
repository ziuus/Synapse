import json
import time
import requests
from typing import Optional, Generator
from core.logger import get_logger
from core.retry import with_retry

log = get_logger("synapse.model_manager")
OLLAMA_BASE = "http://localhost:11434"


class ModelManager:
    def __init__(self):
        self.current_model: Optional[str] = None
        self.load_time: Optional[float] = None
        self._switch_history: list[dict] = []

    @with_retry(max_attempts=3, base_delay=0.5)
    def is_ollama_running(self) -> bool:
        try:
            r = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=3)
            return r.status_code == 200
        except Exception:
            return False

    def list_installed(self) -> list[str]:
        try:
            r = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=5)
            return [m["name"] for m in r.json().get("models", [])]
        except Exception as e:
            log.warning(f"Could not list installed models: {e}")
            return []

    def is_installed(self, model_name: str) -> bool:
        installed = self.list_installed()
        return any(m == model_name or m.startswith(model_name.split(":")[0]) for m in installed)

    def unload_current(self):
        if not self.current_model:
            return
        log.debug(f"Unloading {self.current_model}")
        try:
            requests.post(f"{OLLAMA_BASE}/api/generate",
                json={"model": self.current_model, "keep_alive": 0}, timeout=5)
        except Exception as e:
            log.warning(f"Could not cleanly unload {self.current_model}: {e}")
        self.current_model = None
        self.load_time = None

    @with_retry(max_attempts=2, base_delay=1.0)
    def switch_to(self, model_name: str) -> tuple[bool, float]:
        if self.current_model == model_name:
            return True, 0.0
        self.unload_current()
        log.info(f"Loading model: {model_name}")
        start = time.time()
        try:
            requests.post(f"{OLLAMA_BASE}/api/generate",
                json={"model": model_name, "prompt": "", "stream": False, "keep_alive": "5m"},
                timeout=60)
            elapsed = round(time.time() - start, 2)
            self.current_model = model_name
            self.load_time = elapsed
            self._switch_history.append({"model": model_name, "load_time": elapsed, "timestamp": time.time()})
            log.info(f"Model {model_name} loaded in {elapsed}s")
            return True, elapsed
        except Exception as e:
            log.error(f"Failed to load {model_name}: {e}")
            return False, 0.0

    def chat_stream(self, model_name: str, messages: list[dict]) -> Generator[str, None, None]:
        try:
            with requests.post(f"{OLLAMA_BASE}/api/chat",
                json={"model": model_name, "messages": messages, "stream": True,
                      "options": {"temperature": 0.7, "num_ctx": 2048}},
                stream=True, timeout=120) as resp:
                for line in resp.iter_lines():
                    if line:
                        chunk = json.loads(line)
                        token = chunk.get("message", {}).get("content", "")
                        if token:
                            yield token
                        if chunk.get("done"):
                            break
        except Exception as e:
            log.error(f"Inference error: {e}")
            yield f"\n[Synapse error: {e}]"

    def pull_model(self, model_name: str) -> Generator[str, None, None]:
        log.info(f"Pulling model: {model_name}")
        try:
            with requests.post(f"{OLLAMA_BASE}/api/pull",
                json={"name": model_name, "stream": True}, stream=True, timeout=600) as resp:
                for line in resp.iter_lines():
                    if line:
                        chunk = json.loads(line)
                        status = chunk.get("status", "")
                        completed = chunk.get("completed", 0)
                        total = chunk.get("total", 0)
                        yield f"{status}: {(completed/total*100):.1f}%" if total > 0 else status
        except Exception as e:
            log.error(f"Pull failed: {e}")
            yield f"Error: {e}"

    def delete_model(self, model_name: str) -> bool:
        try:
            r = requests.delete(f"{OLLAMA_BASE}/api/delete", json={"name": model_name}, timeout=10)
            return r.status_code == 200
        except Exception as e:
            log.error(f"Delete error: {e}")
            return False

    def analytics(self) -> dict:
        if not self._switch_history:
            return {"total_switches": 0}
        times = [s["load_time"] for s in self._switch_history]
        model_counts: dict[str, int] = {}
        for s in self._switch_history:
            model_counts[s["model"]] = model_counts.get(s["model"], 0) + 1
        return {
            "total_switches": len(self._switch_history),
            "avg_load_time": round(sum(times) / len(times), 2),
            "fastest_load": round(min(times), 2),
            "slowest_load": round(max(times), 2),
            "model_usage": model_counts,
            "most_used": max(model_counts, key=model_counts.get)
        }

    def status(self) -> dict:
        return {
            "ollama_running": self.is_ollama_running(),
            "current_model": self.current_model,
            "load_time": self.load_time,
            "installed_models": self.list_installed()
        }
