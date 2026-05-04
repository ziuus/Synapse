"""
Synapse Test Suite
Run with: pytest tests/
"""

import pytest
import sys
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))

from core.context import ContextTracker
from core.classifier import TFIDFClassifier
from core.retry import with_retry, safe_call


# ── Context Tracker ────────────────────────────────────────────────────────

class TestContextTracker:
    def test_add_and_retrieve(self):
        ctx = ContextTracker(max_messages=5)
        ctx.add("user", "Hello", "phi3:mini")
        ctx.add("assistant", "Hi there!", "phi3:mini")
        history = ctx.get_history()
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[1]["role"] == "assistant"

    def test_max_messages_respected(self):
        ctx = ContextTracker(max_messages=3)
        for i in range(10):
            ctx.add("user", f"message {i}", "phi3:mini")
        assert len(ctx.get_history()) == 3

    def test_clear(self):
        ctx = ContextTracker()
        ctx.add("user", "test", "phi3:mini")
        ctx.clear()
        assert len(ctx.get_history()) == 0
        assert ctx.current_model is None

    def test_last_model(self):
        ctx = ContextTracker()
        assert ctx.last_model() is None
        ctx.add("assistant", "reply", "qwen2.5-coder:1.5b")
        assert ctx.last_model() == "qwen2.5-coder:1.5b"

    def test_recent_text(self):
        ctx = ContextTracker()
        ctx.add("user", "write python code", "phi3:mini")
        text = ctx.get_recent_text(1)
        assert "python" in text.lower()

    def test_summary(self):
        ctx = ContextTracker()
        ctx.add("user", "hi", "phi3:mini")
        s = ctx.summary()
        assert "total_messages" in s
        assert s["total_messages"] == 1


# ── TF-IDF Classifier ──────────────────────────────────────────────────────

class TestClassifier:
    def setup_method(self):
        self.clf = TFIDFClassifier()

    def test_code_detection(self):
        if not self.clf.is_available:
            pytest.skip("sklearn not installed")
        label, conf = self.clf.predict("write a python function to sort a list")
        assert label == "code"
        assert conf > 0.5

    def test_math_detection(self):
        if not self.clf.is_available:
            pytest.skip("sklearn not installed")
        label, conf = self.clf.predict("solve this equation x squared plus 4")
        assert label == "math"

    def test_chat_detection(self):
        if not self.clf.is_available:
            pytest.skip("sklearn not installed")
        label, conf = self.clf.predict("hello how are you today")
        assert label == "chat"

    def test_returns_valid_label(self):
        if not self.clf.is_available:
            pytest.skip("sklearn not installed")
        valid_labels = {"chat", "code", "math", "vision"}
        label, conf = self.clf.predict("some random query")
        assert label in valid_labels
        assert 0.0 <= conf <= 1.0


# ── Retry Utility ──────────────────────────────────────────────────────────

class TestRetry:
    def test_succeeds_on_first_try(self):
        calls = []
        @with_retry(max_attempts=3)
        def ok():
            calls.append(1)
            return "done"
        result = ok()
        assert result == "done"
        assert len(calls) == 1

    def test_retries_on_failure(self):
        calls = []
        @with_retry(max_attempts=3, base_delay=0.01)
        def flaky():
            calls.append(1)
            if len(calls) < 3:
                raise ConnectionError("fail")
            return "ok"
        result = flaky()
        assert result == "ok"
        assert len(calls) == 3

    def test_raises_after_max_attempts(self):
        @with_retry(max_attempts=2, base_delay=0.01)
        def always_fails():
            raise ValueError("nope")
        with pytest.raises(ValueError):
            always_fails()

    def test_safe_call_returns_default(self):
        def bad():
            raise RuntimeError("boom")
        result = safe_call(bad, default="fallback")
        assert result == "fallback"

    def test_safe_call_returns_value(self):
        result = safe_call(lambda: 42, default=0)
        assert result == 42
