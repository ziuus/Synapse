import sys
import time
from core.switcher import Switcher
from core.model_manager import ModelManager
from core.context import ContextTracker

# ── Colors ────────────────────────────────────────────────────────────────
RESET  = "\033[0m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
CYAN   = "\033[96m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
BLUE   = "\033[94m"
MAGENTA= "\033[95m"

BANNER = f"""
{CYAN}{BOLD}
  ███████╗██╗   ██╗███╗   ██╗ █████╗ ██████╗ ███████╗███████╗
  ██╔════╝╚██╗ ██╔╝████╗  ██║██╔══██╗██╔══██╗██╔════╝██╔════╝
  ███████╗ ╚████╔╝ ██╔██╗ ██║███████║██████╔╝███████╗█████╗  
  ╚════██║  ╚██╔╝  ██║╚██╗██║██╔══██║██╔═══╝ ╚════██║██╔══╝  
  ███████║   ██║   ██║ ╚████║██║  ██║██║     ███████║███████╗
  ╚══════╝   ╚═╝   ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚══════╝╚══════╝
{RESET}{DIM}  The connection between you and the right intelligence.{RESET}
"""

HELP_TEXT = f"""
{BOLD}Commands:{RESET}
  {CYAN}/status{RESET}    — Show current model and session info
  {CYAN}/models{RESET}    — List available models
  {CYAN}/clear{RESET}     — Clear conversation history
  {CYAN}/help{RESET}      — Show this help
  {CYAN}/exit{RESET}      — Quit Synapse
"""


def print_status(manager: ModelManager, context: ContextTracker):
    s = manager.status()
    cs = context.summary()
    print(f"\n{BOLD}── Status ────────────────────{RESET}")
    print(f"  Ollama running : {GREEN}yes{RESET}" if s["ollama_running"] else f"  Ollama running : {RED}no{RESET}")
    print(f"  Current model  : {CYAN}{s['current_model'] or 'none'}{RESET}")
    print(f"  Messages       : {cs['total_messages']}")
    print(f"  Session        : {cs['session_duration_mins']} mins")
    print(f"{BOLD}──────────────────────────────{RESET}\n")


def run_cli():
    print(BANNER)

    switcher = Switcher()
    manager  = ModelManager()
    context  = ContextTracker()

    # Check Ollama
    if not manager.is_ollama_running():
        print(f"{RED}✗ Ollama is not running!{RESET}")
        print(f"  Start it with: {CYAN}ollama serve{RESET}")
        sys.exit(1)

    print(f"{GREEN}✓ Ollama connected{RESET}")
    print(f"{DIM}Type /help for commands. Start chatting!{RESET}\n")

    while True:
        try:
            user_input = input(f"{BOLD}You › {RESET}").strip()
        except (KeyboardInterrupt, EOFError):
            print(f"\n{DIM}Goodbye!{RESET}")
            manager.unload_current()
            break

        if not user_input:
            continue

        # ── Commands ──
        if user_input.startswith("/"):
            cmd = user_input.lower()
            if cmd == "/exit":
                print(f"{DIM}Goodbye!{RESET}")
                manager.unload_current()
                break
            elif cmd == "/status":
                print_status(manager, context)
            elif cmd == "/models":
                print(f"\n{BOLD}Available models:{RESET}")
                for k, v in switcher.list_models().items():
                    installed = "✓" if manager.is_installed(v) else "✗ (not pulled)"
                    color = GREEN if manager.is_installed(v) else RED
                    print(f"  {color}{installed}{RESET} {CYAN}{k:10}{RESET} → {v}")
                print()
            elif cmd == "/clear":
                context.clear()
                print(f"{GREEN}Context cleared.{RESET}\n")
            elif cmd == "/help":
                print(HELP_TEXT)
            else:
                print(f"{RED}Unknown command. Type /help{RESET}\n")
            continue

        # ── Smart Switch ──
        model_type, model_name, reason = switcher.decide(user_input, context)

        if manager.current_model != model_name:
            print(f"{DIM}  ⟳ Switching to {CYAN}{model_type}{DIM} model ({reason})...{RESET}", end="", flush=True)

            if not manager.is_installed(model_name):
                print(f"\n{YELLOW}  Model {model_name} not installed. Pull it with: ollama pull {model_name}{RESET}\n")
                continue

            ok, load_time = manager.switch_to(model_name)
            if not ok:
                print(f"\n{RED}  Failed to load model!{RESET}\n")
                continue
            print(f" {GREEN}done{RESET} {DIM}({load_time:.1f}s){RESET}")
        else:
            print(f"{DIM}  ✓ Using {CYAN}{model_type}{DIM} model{RESET}")

        # ── Add to context & stream response ──
        context.add("user", user_input, model_name)
        messages = context.get_history()

        print(f"\n{BOLD}{MAGENTA}AI › {RESET}", end="", flush=True)
        full_response = ""
        for token in manager.chat_stream(model_name, messages):
            print(token, end="", flush=True)
            full_response += token
        print("\n")

        context.add("assistant", full_response, model_name)


if __name__ == "__main__":
    run_cli()
