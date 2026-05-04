"""
Synapse Switcher — 3-layer decision engine
Layer 1: Rule engine (fast keyword matching)
Layer 2: TF-IDF classifier (trained ML model)
Layer 3: AI fallback (tiny LLM for hard cases)
"""

import re
import requests
from core.config_validator import validate
from core.classifier import TFIDFClassifier
from core.context import ContextTracker
from core.logger import get_logger

log = get_logger("synapse.switcher")


class Switcher:
    def __init__(self):
        self.config = validate()
        self.models = self.config["models"]
        self.threshold = self.config["switcher"]["rule_confidence_threshold"]
        self.fallback_model = self.config["switcher"]["fallback_classifier"]
        self.classifier = TFIDFClassifier()
        self._decision_history: list[dict] = []
        log.info(f"Switcher ready — {len(self.models)} models, classifier={'on' if self.classifier.is_available else 'off'}")

    # ── Layer 1: Rule Engine ───────────────────────────────────────────────

    def _rule_score(self, query: str, context_text: str) -> dict[str, float]:
        combined = (query + " " + context_text).lower()
        scores = {}
        for model_type, info in self.models.items():
            keywords = info.get("keywords", [])
            hits = sum(1 for kw in keywords if kw in combined)
            scores[model_type] = hits / max(len(keywords), 1)
        return scores

    # ── Layer 2: TF-IDF Classifier ─────────────────────────────────────────

    def _ml_classify(self, query: str) -> tuple[str, float]:
        return self.classifier.predict(query)

    # ── Layer 3: AI Fallback ───────────────────────────────────────────────

    def _ai_classify(self, query: str, context_text: str) -> str:
        prompt = f"""Classify this query into exactly one category: chat, code, math, vision.
Context: {context_text[-200:] or 'none'}
Query: {query}
Reply with one word only:"""
        try:
            resp = requests.post(
                "http://localhost:11434/api/generate",
                json={"model": self.fallback_model, "prompt": prompt,
                      "stream": False, "options": {"temperature": 0, "num_predict": 5}},
                timeout=15
            )
            word = resp.json().get("response", "").strip().lower().split()[0]
            result = word if word in self.models else "chat"
            log.debug(f"AI classifier → {result}")
            return result
        except Exception as e:
            log.warning(f"AI fallback failed: {e}")
            return "chat"

    # ── Main Decision ──────────────────────────────────────────────────────

    def decide(self, query: str, context: ContextTracker) -> tuple[str, str, str]:
        """Returns (model_type, ollama_model_name, reason)"""

        # Special case: vision
        if any(kw in query.lower() for kw in ["image", "picture", "photo", ".jpg", ".png", ".jpeg"]):
            m = self.models["vision"]
            self._log_decision(query, "vision", "image detected")
            return "vision", m["name"], "image detected"

        context_text = context.get_recent_text(3)

        # Layer 1: Rules
        scores = self._rule_score(query, context_text)
        best_rule_type = max(scores, key=scores.get)
        best_rule_score = scores[best_rule_type]

        if best_rule_score >= self.threshold:
            m = self.models[best_rule_type]
            reason = f"rule engine ({best_rule_score:.0%})"
            self._log_decision(query, best_rule_type, reason)
            return best_rule_type, m["name"], reason

        # Layer 2: ML Classifier
        if self.classifier.is_available:
            ml_type, ml_conf = self._ml_classify(query)
            if ml_conf >= 0.65:
                m = self.models.get(ml_type, self.models["chat"])
                reason = f"ML classifier ({ml_conf:.0%})"
                self._log_decision(query, ml_type, reason)
                return ml_type, m["name"], reason

        # Layer 3: AI fallback
        ai_type = self._ai_classify(query, context_text)
        m = self.models.get(ai_type, self.models["chat"])
        reason = "AI fallback"
        self._log_decision(query, ai_type, reason)
        return ai_type, m["name"], reason

    def _log_decision(self, query: str, model_type: str, reason: str):
        self._decision_history.append({"query": query[:80], "model": model_type, "reason": reason})
        log.debug(f"Decision: {model_type} via {reason} | query: {query[:60]}")

    def decision_history(self) -> list[dict]:
        return self._decision_history

    def list_models(self) -> dict:
        return {k: v["name"] for k, v in self.models.items()}
