import re
import importlib
import os
from pathlib import Path
from skills.web_search import search_internet, format_search_results

class CommandEngine:
    def __init__(self, switcher, manager):
        self.switcher = switcher
        self.manager = manager
        self.custom_commands = {}
        self.load_custom_commands()

    def load_custom_commands(self):
        # Scan commands/ directory for python files
        cmd_dir = Path("commands")
        if not cmd_dir.exists():
            return
            
        for file in cmd_dir.glob("*.py"):
            if file.name == "__init__.py":
                continue
            
            module_name = f"commands.{file.stem}"
            try:
                module = importlib.import_module(module_name)
                if hasattr(module, "handle"):
                    self.custom_commands[file.stem] = module.handle
            except Exception as e:
                print(f"Failed to load command {file.stem}: {e}")

    def parse(self, text: str):
        # 1. Check for @ mentions
        mention_match = re.search(r"@(\w+)", text)
        mention = mention_match.group(1) if mention_match else None
        
        # 2. Check for slash commands
        command_match = re.search(r"/(\w+)", text)
        command = command_match.group(1) if command_match else None
        
        # Clean text
        clean_text = re.sub(r"[@/]\w+", "", text).strip()
        return command, mention, clean_text

    def execute(self, text: str):
        command, mention, query = self.parse(text)
        
        if command == "help":
            help_text = """### SYNAPSE COMMANDS:
- `/search [query]` : Manual web research.
- `/code [query]` : Force code expert.
- `/vision [query]` : Force vision expert.
- `/summarize` : Summarize the current conversation.
- `/clear` : Reset temporary context for this stream.
- `@model` : Mention a specific model type to override routing.
"""
            return "chat", self.switcher.models["chat"]["name"], help_text, "help command"

        if command == "summarize":
            return "chat", self.switcher.models["chat"]["name"], "Please provide a concise summary of our conversation so far.", "summarize workflow"

        if command == "screen" or command == "vision":
            return "vision", self.switcher.models["vision"]["name"], "I have taken a screenshot. Analyze it and tell me what you see.", "ui perception"

        if command == "clear":
            return "chat", self.switcher.models["chat"]["name"], "Context cleared. How can I help you from a fresh perspective?", "clear workflow"

        if command in self.custom_commands:
            try:
                # Custom commands return (type, model, query, reason)
                return self.custom_commands[command](query, self.switcher)
            except Exception as e:
                return "chat", self.switcher.models["chat"]["name"], f"Error in custom command /{command}: {e}", "command error"

        # Override routing if @mention or /command exists
        if command == "search" or command == "research":
            results = search_internet(query or "latest news")
            return "chat", self.switcher.models["chat"]["name"], f"Manual search: {format_search_results(results)}", "slash command"
            
        if command == "code":
            return "code", self.switcher.models["code"]["name"], query, "slash command"

        if command == "vision" or command == "image":
            return "vision", self.switcher.models["vision"]["name"], query, "slash command"

        if mention:
            # Check if mention is a model type (chat, code, math, vision)
            if mention in self.switcher.models:
                return mention, self.switcher.models[mention]["name"], query, "mention override"
            
            # Check if mention is a specific model name (partial match)
            for m_type, m_info in self.switcher.models.items():
                if mention.lower() in m_info["name"].lower():
                    return m_type, m_info["name"], query, f"mention override ({mention})"

        # Fallback to normal routing
        return None, None, query, None
