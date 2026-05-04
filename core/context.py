from collections import deque
from dataclasses import dataclass, field
from typing import Optional
import time


@dataclass
class Message:
    role: str           # "user" or "assistant"
    content: str
    model_used: str
    timestamp: float = field(default_factory=time.time)


class ContextTracker:
    """
    Tracks conversation history and provides context
    to the switcher for smarter model decisions.
    """

    def __init__(self, max_messages: int = 10):
        self.messages: deque[Message] = deque(maxlen=max_messages)
        self.current_model: Optional[str] = None
        self.session_start = time.time()

    def add(self, role: str, content: str, model_used: str = "unknown"):
        self.messages.append(Message(role=role, content=content, model_used=model_used))
        if role == "assistant":
            self.current_model = model_used

    def get_history(self) -> list[dict]:
        """Returns history in Ollama-compatible format."""
        return [{"role": m.role, "content": m.content} for m in self.messages]

    def get_recent_text(self, n: int = 3) -> str:
        """Get last N messages as plain text for context analysis."""
        recent = list(self.messages)[-n:]
        return " ".join(m.content for m in recent)

    def last_model(self) -> Optional[str]:
        return self.current_model

    def clear(self):
        self.messages.clear()
        self.current_model = None

    def summary(self) -> dict:
        return {
            "total_messages": len(self.messages),
            "current_model": self.current_model,
            "session_duration_mins": round((time.time() - self.session_start) / 60, 1)
        }
