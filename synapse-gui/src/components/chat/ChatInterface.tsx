"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Zap, Bot, User, RefreshCcw, Paperclip, X, File as FileIcon, Play, Terminal, MousePointer, Keyboard, Eye, Mic, Phone, Volume2, PhoneOff, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
  latency?: number;
  routing?: string;
  attachment?: string;
}

interface ChatProps {
  sessionId: string;
}

export default function ChatInterface({ sessionId }: ChatProps) {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && ("WebkitSpeechRecognition" in window || "speechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // Automatically send after voice input
        setTimeout(() => handleSend(), 500);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if (typeof window !== "undefined" && isVoiceMode) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ path: string, name: string } | null>(null);
  const [roles, setRoles] = useState<any>({});
  const [currentRole, setCurrentRole] = useState("generalist");
  const [isUtilityMenuOpen, setIsUtilityMenuOpen] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasContent, setCanvasContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleRunAction = async (command: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/actions/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "terminal", command }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `> **COMMAND OUTPUT:**\n\`\`\`bash\n${data.output}\n\`\`\``,
          model: "Action Layer" 
        }]);
      }
    } catch (e) {
      console.error("Action failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunUIAction = async (action: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/actions/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      if (res.ok) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `✅ UI Action executed: **${action.command}**`,
          model: "Action Layer" 
        }]);
      }
    } catch (e) {
      console.error("UI Action failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const [sRes, rRes] = await Promise.all([
           fetch(`http://localhost:8000/api/sessions/${sessionId}`),
           fetch("http://localhost:8000/api/roles")
        ]);
        if (sRes.ok) {
           const sData = await sRes.json();
           setMessages(sData);
        }
        if (rRes.ok) {
           setRoles(await rRes.json());
        }
      } catch (e) {
        console.error("Failed to load session", e);
      }
    };
    fetchSessionData();
  }, [sessionId]);

  const changeRole = async (roleKey: string) => {
     setCurrentRole(roleKey);
     try {
        await fetch(`http://localhost:8000/api/sessions/${sessionId}`, {
           method: "PUT",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ role: roleKey }),
        });
     } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAttachment({ path: data.path, name: data.filename });
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || isLoading || !sessionId) return;

    const userMsg = input.trim();
    const currentAttachment = attachment;
    
    setInput("");
    setAttachment(null);
    setMessages((prev) => [...prev, { 
      role: "user", 
      content: userMsg || (currentAttachment ? `Attached: ${currentAttachment.name}` : ""),
      attachment: currentAttachment?.name
    }]);
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg,
          file_path: currentAttachment?.path 
        }),
      });

      if (!response.ok) throw new Error("API Offline");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        const chunk = decoder.decode(value);
        
        if (chunk.includes("<!--METADATA:")) {
          const parts = chunk.split("<!--METADATA:");
          assistantContent += parts[0];
          const metaStr = parts[1].replace("-->", "").trim();
          try {
            const meta = JSON.parse(metaStr);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              return [...prev.slice(0, -1), { 
                ...last, 
                content: assistantContent,
                model: meta.model,
                latency: meta.latency,
                routing: meta.routing
              }];
            });
          } catch (e) { console.error("Metadata parse error", e); }
        } else {
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, content: assistantContent }];
          });
        }
      }
      
      if (isVoiceMode) {
        speak(assistantContent);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Connection failed. Is Synapse API running?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = (content: string) => {
    if (content.includes("# RUN_COMMAND")) {
      const parts = content.split("```bash");
      const before = parts[0];
      const codeBlock = parts[1]?.split("```")[0];
      const after = parts[1]?.split("```")[1] || "";
      const command = codeBlock?.replace("# RUN_COMMAND", "").trim();

      return (
        <>
          <div className="whitespace-pre-wrap">{before}</div>
          {command && (
            <div className="my-4 p-4 rounded-xl bg-pure-black/50 border border-emerald-glow/20 space-y-3">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-glow text-[10px] uppercase font-bold">
                     <Terminal size={12} /> Pending Action
                  </div>
                  <button 
                    onClick={() => handleRunAction(command)}
                    className="flex items-center gap-2 bg-emerald-glow text-pure-black px-4 py-1.5 rounded-lg text-[10px] font-bold hover:scale-105 active:scale-95 transition-all"
                  >
                    <Play size={10} /> Execute Command
                  </button>
               </div>
               <code className="block text-white/70 text-xs font-mono bg-black/30 p-2 rounded border border-white/5 truncate">
                 {command}
               </code>
            </div>
          )}
          <div className="whitespace-pre-wrap">{after}</div>
        </>
      );
    }

    // 2. Check for UI Actions
    if (content.includes("# UI_ACTION")) {
       const parts = content.split("```javascript");
       const before = parts[0];
       const jsonBlock = parts[1]?.split("```")[0];
       const after = parts[1]?.split("```")[1] || "";
       
       try {
          const action = JSON.parse(jsonBlock?.replace("# UI_ACTION", "").trim() || "{}");
          return (
            <>
              <div className="whitespace-pre-wrap">{before}</div>
              <div className="my-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400 text-[10px] uppercase font-bold">
                       <MousePointer size={12} /> Pending UI Interaction
                    </div>
                    <button 
                      onClick={() => handleRunUIAction(action)}
                      className="flex items-center gap-2 bg-blue-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold hover:scale-105 active:scale-95 transition-all"
                    >
                      <Play size={10} /> Confirm Move
                    </button>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-white/40 font-mono">
                   <span>Target: <span className="text-white">{action.command}</span></span>
                   {action.params?.x && <span>Coords: <span className="text-white">({action.params.x}, {action.params.y})</span></span>}
                   {action.params?.text && <span>Input: <span className="text-white">"{action.params.text}"</span></span>}
                </div>
              </div>
              <div className="whitespace-pre-wrap">{after}</div>
            </>
          );
       } catch (e) { console.error("UI Action parse error", e); }
    }
    return <div className="whitespace-pre-wrap font-light tracking-wide">{content}</div>;
  };

  return (
    <div className="flex h-full w-full">
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-500",
        isCanvasOpen ? "w-1/2" : "w-full"
      )}>
        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto pr-2 space-y-6 scroll-smooth custom-scrollbar p-6"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4 opacity-50">
              <Zap size={48} className="text-emerald-glow animate-pulse" strokeWidth={1} />
              <p className="text-sm font-light uppercase tracking-widest">Neural Link Established</p>
            </div>
          )}
          
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className={cn(
                  "flex group flex-col",
                  msg.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div className={cn(
                  "max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed",
                  msg.role === "user" 
                    ? "bg-emerald-glow text-pure-black font-medium shadow-[0_0_20px_rgba(104,186,127,0.2)]" 
                    : "glass-panel text-white/90 border border-white/5"
                )}>
                  <div className="flex items-center gap-2 mb-2 opacity-50 text-[10px] uppercase tracking-tighter font-bold">
                    {msg.role === "user" ? <User size={10}/> : <Zap size={10} className="text-emerald-glow" />}
                    {msg.role === "user" ? "User" : "Synapse Neural Link"}
                  </div>
                  
                  {msg.attachment && (
                    <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-black/20 text-[10px] text-white/60">
                      <FileIcon size={12} />
                      <span className="truncate">{msg.attachment}</span>
                    </div>
                  )}
                  
                  {renderContent(msg.content)}
                  
                  {msg.role === "assistant" && msg.model && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-4 text-[9px] text-white/30 uppercase tracking-[0.1em]">
                      <div className="flex items-center gap-1">
                        <span className="font-bold">Model:</span> {msg.model}
                      </div>
                      {msg.latency && (
                        <div className="flex items-center gap-1">
                          <span className="font-bold">Latency:</span> {msg.latency}s
                        </div>
                      )}
                      {msg.routing && (
                        <div className="flex items-center gap-1">
                          <span className="font-bold">Via:</span> {msg.routing}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="relative mt-auto pt-4 p-6">
          {/* Voice Call Overlay */}
          <AnimatePresence>
            {isVoiceMode && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-50 glass-panel bg-pure-black/80 flex flex-col items-center justify-center space-y-8 backdrop-blur-2xl border-emerald-glow/20"
              >
                 <div className="relative">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-emerald-glow/20 blur-3xl rounded-full"
                    />
                    <div className="relative p-10 rounded-full bg-emerald-glow/10 border border-emerald-glow/30">
                       <Bot size={64} className={cn("text-emerald-glow", isSpeaking && "animate-pulse")} />
                    </div>
                    {isListening && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-glow text-pure-black text-[10px] font-bold px-3 py-1 rounded-full animate-bounce"
                      >
                        LISTENING
                      </motion.div>
                    )}
                 </div>
                 
                 <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold tracking-widest uppercase">Synapse Neural Link</h3>
                    <p className="text-xs text-white/40 tracking-[0.3em] uppercase font-light">Active Voice Session</p>
                 </div>

                 <div className="flex items-center gap-6">
                    <button 
                      onClick={toggleListening}
                      className={cn(
                        "p-6 rounded-full transition-all shadow-2xl",
                        isListening ? "bg-red-500 text-white animate-pulse" : "bg-white/5 text-white/40 hover:bg-white/10"
                      )}
                    >
                      <Mic size={24} />
                    </button>
                    <button 
                      onClick={() => { setIsVoiceMode(false); window.speechSynthesis.cancel(); }}
                      className="p-6 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all shadow-2xl"
                    >
                      <PhoneOff size={24} />
                    </button>
                    <button 
                      className="p-6 rounded-full bg-white/5 text-white/40 hover:bg-white/10 transition-all"
                    >
                      <Volume2 size={24} />
                    </button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {attachment && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 mb-4 p-2 glass-panel border border-emerald-glow/30 flex items-center gap-3 text-xs text-emerald-glow"
              >
                <FileIcon size={14} />
                <span className="max-w-[150px] truncate">{attachment.name}</span>
                <button onClick={() => setAttachment(null)} className="hover:text-white">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-w-4xl mx-auto relative">
             <AnimatePresence>
               {isUtilityMenuOpen && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                   className="absolute bottom-full left-0 mb-4 w-64 bg-space-grey/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                 >
                    <div className="p-2 space-y-1">
                       {[
                          { id: "canvas", label: "Canvas Mode", icon: Eye, desc: "Side-by-side editing", action: () => setIsCanvasOpen(!isCanvasOpen) },
                          { id: "auto", label: "Autonomous", icon: Terminal, desc: "System control enabled" },
                          { id: "council", label: "Council", icon: Zap, desc: "Multi-expert chaining" },
                       ].map(item => (
                          <button 
                            key={item.id}
                            onClick={() => { item.action?.(); setIsUtilityMenuOpen(false); }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group text-left"
                          >
                             <div className="p-2 bg-white/5 rounded-lg text-white/40 group-hover:text-emerald-glow transition-colors">
                                <item.icon size={16} />
                             </div>
                             <div>
                                <p className="text-[11px] font-bold">{item.label}</p>
                                <p className="text-[9px] text-white/20 uppercase tracking-widest">{item.desc}</p>
                             </div>
                          </button>
                       ))}
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>

             <div className="glass-panel p-2 flex items-end gap-3 focus-within:border-emerald-glow/30 transition-all bg-white/[0.02]">
                <button 
                  onClick={() => setIsUtilityMenuOpen(!isUtilityMenuOpen)}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    isUtilityMenuOpen ? "bg-emerald-glow text-pure-black" : "bg-white/5 text-white/30 hover:bg-white/10"
                  )}
                >
                  <Plus size={18} />
                </button>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-white/5 text-white/30 rounded-xl hover:bg-white/10 transition-all"
                >
                  <Paperclip size={18} />
                </button>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Relay a command or upload a file..."
                  className="flex-1 bg-transparent border-none outline-none py-2 text-sm text-white placeholder:text-white/20"
                />
                
                <button
                  onClick={toggleListening}
                  className={cn(
                    "p-3 transition-colors",
                    isListening ? "text-red-500 animate-pulse" : "text-white/30 hover:text-emerald-glow"
                  )}
                >
                  <Mic size={18} />
                </button>

                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    isLoading ? "bg-white/5 text-white/20" : "bg-emerald-glow text-pure-black hover:scale-105 active:scale-95 shadow-lg"
                  )}
                >
                  {isLoading ? <RefreshCcw className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <AnimatePresence>
        {isCanvasOpen && (
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-1/2 border-l border-white/5 bg-space-grey/30 backdrop-blur-3xl flex flex-col"
          >
             <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-400/10 rounded-lg text-blue-400">
                      <Eye size={16} />
                   </div>
                   <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Neural Canvas</span>
                </div>
                <button onClick={() => setIsCanvasOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/20 hover:text-white">
                   <X size={16} />
                </button>
             </div>
             <div className="flex-1 p-8 overflow-y-auto custom-scrollbar font-mono text-sm leading-relaxed text-white/80">
                {canvasContent || (
                   <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                      <Terminal size={48} strokeWidth={1} />
                      <p className="uppercase tracking-[0.2em] text-xs">Ready for dynamic synthesis...</p>
                   </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
