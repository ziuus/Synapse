"""
Synapse Plugin System
Drop a .yaml file into /plugins/ to add a new specialist model.

Plugin YAML format:
  name: "my-model:tag"
  type: "mytype"
  description: "What this model does"
  size_gb: 1.5
  keywords: ["word1", "word2"]
"""

import yaml
from pathlib import Path
from core.logger import get_logger

log = get_logger("synapse.plugins")
PLUGIN_DIR = Path(__file__).parent.parent / "plugins"
REQUIRED_FIELDS = {"name", "type", "description", "size_gb", "keywords"}


def load_plugins() -> dict[str, dict]:
    """Load all valid plugin YAML files. Returns dict keyed by model type."""
    plugins = {}
    PLUGIN_DIR.mkdir(exist_ok=True)

    for path in PLUGIN_DIR.glob("*.yaml"):
        try:
            with open(path) as f:
                data = yaml.safe_load(f)

            missing = REQUIRED_FIELDS - set(data.keys())
            if missing:
                log.warning(f"Plugin {path.name} missing fields: {missing}")
                continue

            model_type = data.pop("type")
            plugins[model_type] = data
            log.info(f"Plugin loaded: {model_type} → {data['name']}")
        except Exception as e:
            log.warning(f"Failed to load plugin {path.name}: {e}")

    return plugins


def write_example_plugin():
    """Write an example plugin file for reference."""
    example = PLUGIN_DIR / "example_translation.yaml.example"
    if not example.exists():
        content = """# Synapse Plugin — Drop this file as .yaml to activate
name: "aya:8b"
type: "translation"
description: "Multilingual translation model"
size_gb: 4.8
keywords:
  - translate
  - translation
  - french
  - spanish
  - german
  - arabic
  - hindi
  - convert to language
"""
        example.write_text(content)
        log.debug("Example plugin written")
