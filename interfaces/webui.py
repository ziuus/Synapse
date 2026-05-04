"""
Synapse Web UI — v1.0
Full interface with chat, model manager, analytics dashboard.
"""

import time
import gradio as gr
from core.switcher import Switcher
from core.model_manager import ModelManager
from core.context import ContextTracker
from core.logger import get_logger

log = get_logger("synapse.webui")

switcher = Switcher()
manager  = ModelManager()
context  = ContextTracker()


# ── Chat ───────────────────────────────────────────────────────────────────

def chat(user_message: str, history: list):
    if not user_message.strip():
        return "", history

    model_type, model_name, reason = switcher.decide(user_message, context)

    if manager.current_model != model_name:
        if not manager.is_installed(model_name):
            history.append((user_message, f"⚠️ Model `{model_name}` not installed. Go to **Model Manager** tab to pull it."))
            return "", history
        ok, load_time = manager.switch_to(model_name)
        if not ok:
            history.append((user_message, "❌ Failed to load model. Check logs."))
            return "", history
        switch_note = f"*⟳ Switched to **{model_type}** ({reason}) in {load_time:.1f}s*\n\n"
    else:
        switch_note = f"*✓ {model_type} model*\n\n"

    context.add("user", user_message, model_name)
    messages = context.get_history()
    history.append((user_message, switch_note))
    full_response = switch_note

    for token in manager.chat_stream(model_name, messages):
        full_response += token
        history[-1] = (user_message, full_response)
        yield "", history

    context.add("assistant", full_response.replace(switch_note, ""), model_name)


def clear_chat():
    context.clear()
    return [], "✓ Context cleared"


# ── Model Manager ──────────────────────────────────────────────────────────

def get_installed_models():
    return manager.list_installed()

def pull_model(model_name: str):
    if not model_name.strip():
        return "⚠️ Enter a model name first (e.g. phi3:mini)"
    log.info(f"UI: pulling {model_name}")
    output = ""
    for status in manager.pull_model(model_name.strip()):
        output = status
    return f"✓ Done pulling {model_name}" if "error" not in output.lower() else f"✗ {output}"

def delete_model(model_name: str):
    if not model_name:
        return "Select a model first", get_installed_models()
    ok = manager.delete_model(model_name)
    msg = f"✓ Deleted {model_name}" if ok else f"✗ Could not delete {model_name}"
    return msg, get_installed_models()


# ── Analytics ──────────────────────────────────────────────────────────────

def get_analytics():
    a = manager.analytics()
    cs = context.summary()
    history = switcher.decision_history()[-10:]

    if not a.get("total_switches"):
        return "No switches yet — start chatting!", "", ""

    stats = f"""**Session Stats**
- Messages: {cs['total_messages']}
- Model switches: {a['total_switches']}
- Avg load time: {a['avg_load_time']}s
- Fastest: {a['fastest_load']}s
- Slowest: {a['slowest_load']}s
- Most used: `{a.get('most_used', 'N/A')}`
- Session: {cs['session_duration_mins']} mins
"""
    usage = "\n".join(
        f"- `{model}`: {count} time(s)"
        for model, count in a.get("model_usage", {}).items()
    )

    decisions = "\n".join(
        f"- **{d['model']}** via *{d['reason']}* — `{d['query'][:50]}`"
        for d in reversed(history)
    )

    return stats, f"**Model Usage**\n{usage}", f"**Recent Decisions**\n{decisions}"


# ── Status ─────────────────────────────────────────────────────────────────

def get_status():
    s = manager.status()
    cs = context.summary()
    models_info = "\n".join(
        f"  {'✓' if manager.is_installed(v) else '✗'} {k:12} → {v}"
        for k, v in switcher.list_models().items()
    )
    return f"""Ollama: {'🟢 Running' if s['ollama_running'] else '🔴 Stopped'}
Active model: {s['current_model'] or 'None'}
Messages: {cs['total_messages']}
Session: {cs['session_duration_mins']} mins

Models:
{models_info}"""


# ── UI Build ───────────────────────────────────────────────────────────────

def build_ui():
    with gr.Blocks(
        title="Synapse",
        theme=gr.themes.Base(
            primary_hue="cyan",
            neutral_hue="slate",
            font=[gr.themes.GoogleFont("JetBrains Mono"), "monospace"]
        ),
        css="""
        .gradio-container { max-width: 1000px !important; }
        #title { text-align:center; padding: 16px 0 4px; font-size: 2em; }
        #subtitle { text-align:center; color:#64748b; margin-bottom:16px; font-size:0.95em; }
        """
    ) as demo:

        gr.Markdown("# ⚡ Synapse", elem_id="title")
        gr.Markdown("*The connection between you and the right intelligence.*", elem_id="subtitle")

        with gr.Tabs():

            # ── Tab 1: Chat ──
            with gr.TabItem("💬 Chat"):
                with gr.Row():
                    with gr.Column(scale=3):
                        chatbot = gr.Chatbot(height=480, show_label=False, avatar_images=(None, "⚡"))
                        with gr.Row():
                            msg = gr.Textbox(placeholder="Ask anything — Synapse picks the right model...",
                                           show_label=False, scale=5, container=False)
                            send = gr.Button("Send ▶", variant="primary", scale=1)
                        with gr.Row():
                            clear_btn = gr.Button("🗑 Clear", scale=1)
                            clear_out  = gr.Textbox(show_label=False, interactive=False, scale=4)

                    with gr.Column(scale=1):
                        status_box = gr.Textbox(label="Status", value=get_status,
                                               lines=16, interactive=False, every=4)

                send.click(chat, [msg, chatbot], [msg, chatbot])
                msg.submit(chat, [msg, chatbot], [msg, chatbot])
                clear_btn.click(clear_chat, outputs=[chatbot, clear_out])

            # ── Tab 2: Model Manager ──
            with gr.TabItem("📦 Model Manager"):
                gr.Markdown("### Pull New Models")
                with gr.Row():
                    pull_input = gr.Textbox(placeholder="e.g. phi3:mini, qwen2.5-coder:1.5b, moondream",
                                           label="Model name", scale=3)
                    pull_btn = gr.Button("⬇ Pull", variant="primary", scale=1)
                pull_out = gr.Textbox(label="Output", interactive=False)

                gr.Markdown("### Installed Models")
                installed_list = gr.Dropdown(choices=get_installed_models,
                                             label="Select model to delete", every=5)
                with gr.Row():
                    refresh_btn = gr.Button("↻ Refresh")
                    delete_btn  = gr.Button("🗑 Delete selected", variant="stop")
                delete_out = gr.Textbox(label="Result", interactive=False)

                pull_btn.click(pull_model, [pull_input], pull_out)
                refresh_btn.click(get_installed_models, outputs=installed_list)
                delete_btn.click(delete_model, [installed_list], [delete_out, installed_list])

            # ── Tab 3: Analytics ──
            with gr.TabItem("📊 Analytics"):
                refresh_analytics = gr.Button("↻ Refresh Analytics")
                with gr.Row():
                    stats_out    = gr.Markdown()
                    usage_out    = gr.Markdown()
                decisions_out = gr.Markdown()

                refresh_analytics.click(get_analytics, outputs=[stats_out, usage_out, decisions_out])
                demo.load(get_analytics, outputs=[stats_out, usage_out, decisions_out])

    return demo


if __name__ == "__main__":
    demo = build_ui()
    demo.queue()
    demo.launch(server_name="0.0.0.0", server_port=7860)
