import json
from typing import List, Dict
import requests

class Council:
    def __init__(self, switcher, manager):
        self.switcher = switcher
        self.manager = manager

    def needs_collaboration(self, query: str) -> bool:
        # Simple heuristic: look for "and", "then", or multiple task keywords
        keywords = ["and", "then", "also", "build", "create", "research"]
        task_count = sum(1 for kw in ["code", "image", "vision", "search", "write"] if kw in query.lower())
        return task_count > 1 or any(kw in query.lower() for kw in ["complex", "full", "complete"])

    async def deliberate(self, query: str, history: List[Dict]):
        # 1. Planning phase (using chat expert)
        plan_prompt = f"Break this complex request into sub-tasks for a Coder, a Researcher, and a Generalist. Query: {query}"
        
        # In a real collaborative system, we'd call the models sequentially
        # For now, let's simulate the "Council" logic by chaining calls
        
        # Step A: Research (if needed)
        # Step B: Code (if needed)
        # Step C: Synthesis
        
        # This is a placeholder for the future advanced sequential logic
        # For Synapse 1.5, we'll implement the "Synthesis" flow where the Orchestrator
        # collects insights from the Search skill automatically (already done in api.py)
        # and we'll add a "Self-Correction" step.
        
        return "Collaborative intelligence is initializing..."

    def synthesize(self, outputs: List[str]) -> str:
        # Combine specialist outputs into a cohesive final response
        return "\n\n---\n\n".join(outputs)
