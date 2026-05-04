#!/usr/bin/env python3
"""
Synapse v1.0 — The connection between you and the right intelligence.

Usage:
  python main.py             → CLI mode
  python main.py --web       → Web UI (localhost:7860)
  python main.py --status    → System status check
  python main.py --benchmark → Run switcher accuracy benchmark
"""

import sys
import argparse
from core.logger import get_logger

log = get_logger("synapse")


def check_status():
    from core.model_manager import ModelManager
    from core.config_validator import validate
    manager = ModelManager()
    try:
        config = validate()
        print(f"\n── Synapse v1.0 Status ─────────────────")
        print(f"  Config         : ✓ valid ({len(config['models'])} models)")
    except Exception as e:
        print(f"  Config         : ✗ {e}")

    s = manager.status()
    print(f"  Ollama         : {'✓ running' if s['ollama_running'] else '✗ not running  ← run: ollama serve'}")
    print(f"  Active model   : {s['current_model'] or 'none'}")
    print(f"  Installed      : {len(s['installed_models'])} model(s)")
    for m in s["installed_models"]:
        print(f"    • {m}")
    print(f"────────────────────────────────────────\n")


def main():
    parser = argparse.ArgumentParser(description="Synapse v1.0")
    parser.add_argument("--serve",     action="store_true", help="Launch Unified System (API + GUI)")
    parser.add_argument("--web",       action="store_true", help="Launch Legacy Web UI")
    parser.add_argument("--api",       action="store_true", help="Launch FastAPI Backend")
    parser.add_argument("--status",    action="store_true", help="System status")
    parser.add_argument("--benchmark", action="store_true", help="Benchmark switcher accuracy")
    args = parser.parse_args()

    log.info("Synapse starting")

    if args.status:
        check_status()
    elif args.benchmark:
        from tools.benchmark import run_benchmark
        run_benchmark()
    elif args.serve:
        import uvicorn
        log.info("Starting Synapse Unified System at http://localhost:8000")
        print("\n⚡ SYNAPSE UNIFIED SYSTEM ACTIVE")
        print("🌍 Access Neural Dashboard → http://localhost:8000")
        uvicorn.run("interfaces.api:app", host="0.0.0.0", port=8000, reload=False)
    elif args.api:
        import uvicorn
        log.info("Starting Synapse API at http://localhost:8000")
        print("⚡ Synapse API Engine → http://localhost:8000")
        uvicorn.run("interfaces.api:app", host="0.0.0.0", port=8000, reload=True)
    elif args.web:
        from interfaces.webui import build_ui
        log.info("Starting Web UI at http://localhost:7860")
        print("⚡ Synapse Web UI → http://localhost:7860")
        demo = build_ui()
        demo.queue()
        demo.launch(server_name="0.0.0.0", server_port=7860)
    else:
        from interfaces.cli import run_cli
        run_cli()


if __name__ == "__main__":
    main()
