"""
Synapse Config Validator
Validates models.yaml on startup and gives clear error messages.
"""

import yaml
from pathlib import Path
from core.logger import get_logger

log = get_logger("synapse.config")
CONFIG_PATH = Path(__file__).parent.parent / "config" / "models.yaml"

REQUIRED_MODEL_FIELDS = {"name", "description", "size_gb", "keywords"}
REQUIRED_SWITCHER_FIELDS = {"rule_confidence_threshold", "fallback_classifier", "context_window", "idle_timeout"}


def validate() -> dict:
    """Load and validate config. Raises on error."""

    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"Config not found at {CONFIG_PATH}")

    with open(CONFIG_PATH) as f:
        config = yaml.safe_load(f)

    errors = []

    # Check top-level keys
    for key in ("models", "switcher"):
        if key not in config:
            errors.append(f"Missing top-level key: '{key}'")

    if errors:
        raise ValueError("Config validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

    # Validate each model
    for model_type, info in config.get("models", {}).items():
        for field in REQUIRED_MODEL_FIELDS:
            if field not in info:
                errors.append(f"Model '{model_type}' missing field: '{field}'")
        if not isinstance(info.get("keywords", []), list):
            errors.append(f"Model '{model_type}' keywords must be a list")

    # Validate switcher section
    switcher = config.get("switcher", {})
    for field in REQUIRED_SWITCHER_FIELDS:
        if field not in switcher:
            errors.append(f"Switcher missing field: '{field}'")

    threshold = switcher.get("rule_confidence_threshold", 0)
    if not (0.0 <= threshold <= 1.0):
        errors.append("rule_confidence_threshold must be between 0.0 and 1.0")

    if errors:
        raise ValueError("Config validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

    log.info(f"Config valid — {len(config['models'])} models loaded")
    return config
