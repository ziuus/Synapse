# ⚡ SYNAPSE
**High-Fidelity Agentic OS with Dynamic Expert Routing**

Synapse is an industrial-grade intelligence platform designed to maximize local resource efficiency. It orchestrates a "Council of Experts" (specialized SLMs) through a lightweight neural switcher, ensuring only one high-performance model occupies RAM at any given time.

---

## 🚀 Key Innovations

### 🧠 Neural Archetypes
Choose your cognitive partner. Synapse supports selectable personas including **Deep Researcher**, **Software Engineer**, and **Generalist**. Each archetype is pre-configured with optimized model clusters and system prompts.

### 🖼️ Neural Canvas
A dedicated side-by-side workspace for high-productivity synthesis. Generate code, write documentation, or analyze logs in the Canvas while maintaining active neural link with the agent.

### 🎯 Council of Experts
Intent is automatically routed to specialized nodes:
- **Chat Expert**: General logic and conversation (`phi3:mini`)
- **Coding Expert**: Precision software engineering (`qwen2.5-coder`)
- **Vision Expert**: Real-time image understanding (`moondream`)
- **Action Expert**: OS-level terminal and UI automation.

### 📊 System-Aware Dashboard
Real-time telemetry monitoring your neural footprint. Track VRAM allocation, CPU saturation, and message density live from the industrial dashboard.

---

## 🛠️ Deployment

### Prerequisites
- **Python 3.11+**
- **[Ollama](https://ollama.com)** (Core Inference Engine)
- **Linux** (Optimized for Ubuntu/Fedora)

### Rapid Start
```bash
# Clone and Initialize
git clone https://github.com/ziuus/Synapse.git
cd Synapse
bash install.sh

# Launch Unified Neural Link
python main.py --serve
```

## ⚙️ Configuration
Expert models and role behaviors are defined in `config/models.yaml`. Customize your neural cluster by adding new models and defining their semantic trigger keywords.

---

## ⚖️ License
MIT License - Open Source, Local, and Private Forever.
