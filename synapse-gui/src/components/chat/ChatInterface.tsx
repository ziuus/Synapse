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
  return (
    <div className="flex h-full w-full relative">
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-700 ease-[0.23, 1, 0.32, 1]",
        isCanvasOpen ? "w-1/2 opacity-50 grayscale-[0.5]" : "w-full"
      )}>
        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto pr-4 space-y-10 scroll-smooth custom-scrollbar p-10"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-6">
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  filter: ["blur(0px)", "blur(2px)", "blur(0px)"]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="p-4 bg-emerald-glow/5 rounded-3xl border border-emerald-glow/10"
              >
                <Zap size={64} className="text-emerald-glow opacity-20" strokeWidth={0.5} />
              </motion.div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-glow/40">Neural Link Established</p>
                <p className="text-[9px] text-white/10 uppercase tracking-[0.2em]">Awaiting secure transmission...</p>
              </div>
            </div>
          )}
          
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className={cn(
                  "flex group flex-col",
                  msg.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div className={cn(
                  "max-w-[80%] rounded-[2rem] text-sm leading-relaxed relative",
                  msg.role === "user" 
                    ? "bg-emerald-glow text-pure-black px-7 py-4 font-semibold shadow-[0_20px_40px_rgba(104,186,127,0.15)] kinetic-action" 
                    : "glass-panel px-8 py-6 text-white/90 border border-white/5 neural-glow"
                )}>
                  {/* Neural Meta Info */}
                  <div className={cn(
                    "flex items-center gap-2.5 mb-4 text-[8px] uppercase tracking-[0.2em] font-black",
                    msg.role === "user" ? "text-pure-black/40" : "text-emerald-glow/60"
                  )}>
                    {msg.role === "user" ? <User size={10}/> : <Bot size={10} className="animate-pulse" />}
                    <span>{msg.role === "user" ? "TRANSMISSION_SOURCE" : "NEURAL_SYNTHESIS"}</span>
                  </div>
                  
                  {msg.attachment && (
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-black/20 border border-white/5 text-[9px] text-white/50 uppercase tracking-widest font-bold">
                      <FileIcon size={14} className="text-emerald-glow" />
                      <span className="truncate">{msg.attachment}</span>
                    </div>
                  )}
                  
                  <div className="text-neural">
                    {renderContent(msg.content)}
                  </div>
                  
                  {msg.role === "assistant" && msg.model && (
                    <div className="mt-6 pt-5 border-t border-white/5 flex flex-wrap gap-6 text-[8px] text-white/20 uppercase tracking-[0.2em] font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-white/5">NODE_ID:</span> <span className="text-emerald-glow/40">{msg.model}</span>
                      </div>
                      {msg.latency && (
                        <div className="flex items-center gap-2">
                          <span className="text-white/5">LATENCY:</span> <span className="text-emerald-glow/40">{msg.latency}S</span>
                        </div>
                      )}
                      {msg.routing && (
                        <div className="flex items-center gap-2">
                          <span className="text-white/5">ROUTING:</span> <span className="text-emerald-glow/40">{msg.routing}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aesthetic Corner Accents for Assistant */}
                  {msg.role === "assistant" && (
                    <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-emerald-glow/10 border border-emerald-glow/20" />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Floating Input Area */}
        <div className="relative mt-auto p-10 pb-12">
          {/* Neural Call Overlay */}
          <AnimatePresence>
            {isVoiceMode && (
              <motion.div 
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(40px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center space-y-12 bg-pure-black/60 rounded-[3rem] border border-emerald-glow/10"
              >
                 <div className="relative">
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.4, 1],
                        opacity: [0.1, 0.3, 0.1]
                      }}
                      transition={{ repeat: Infinity, duration: 3 }}
                      className="absolute inset-[-40px] bg-emerald-glow/20 blur-[100px] rounded-full"
                    />
                    <div className="relative p-12 rounded-[2.5rem] bg-emerald-glow/5 border border-emerald-glow/20 shadow-[0_0_50px_rgba(104,186,127,0.1)]">
                       <Bot size={80} className={cn("text-emerald-glow transition-all duration-500", isSpeaking ? "scale-110 opacity-100" : "scale-100 opacity-40")} />
                    </div>
                    {isListening && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-emerald-glow text-pure-black text-[8px] font-black px-4 py-1.5 rounded-full shadow-lg tracking-[0.2em]"
                      >
                        NEURAL_LISTENING
                      </motion.div>
                    )}
                 </div>
                 
                 <div className="text-center space-y-3">
                    <h3 className="text-2xl heading-neural uppercase">Neural Link</h3>
                    <p className="text-[10px] text-white/20 tracking-[0.5em] uppercase font-black">Active Biometric Stream</p>
                 </div>

                 <div className="flex items-center gap-10">
                    <button 
                      onClick={toggleListening}
                      className={cn(
                        "p-8 rounded-full transition-all shadow-2xl kinetic-action",
                        isListening ? "bg-red-500/80 text-white" : "bg-white/5 text-white/20 hover:bg-white/10"
                      )}
                    >
                      <Mic size={28} />
                    </button>
                    <button 
                      onClick={() => { setIsVoiceMode(false); window.speechSynthesis.cancel(); }}
                      className="p-8 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-2xl kinetic-action"
                    >
                      <PhoneOff size={28} />
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
                className="absolute bottom-full left-10 mb-6 p-3 glass-panel border-emerald-glow/20 flex items-center gap-4 text-[10px] text-emerald-glow font-bold"
              >
                <div className="p-1.5 bg-emerald-glow/10 rounded-lg">
                  <FileIcon size={14} />
                </div>
                <span className="max-w-[200px] truncate uppercase tracking-widest">{attachment.name}</span>
                <button onClick={() => setAttachment(null)} className="p-1.5 hover:bg-white/5 rounded-lg transition-all">
                  <X size={14} className="text-white/20 hover:text-white" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-w-5xl mx-auto relative group">
             {/* Utility Menu */}
             <AnimatePresence>
               {isUtilityMenuOpen && (
                 <motion.div 
                   initial={{ opacity: 0, y: 20, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 20, scale: 0.95 }}
                   className="absolute bottom-full left-0 mb-6 w-72 glass-panel p-3 z-50 overflow-hidden neural-glow"
                 >
                    <div className="space-y-1.5">
                       {[
                          { id: "canvas", label: "Neural Canvas", icon: Eye, desc: "Multidimensional Workspace", action: () => setIsCanvasOpen(!isCanvasOpen) },
                          { id: "auto", label: "Autonomous Link", icon: Terminal, desc: "Kernel Level Access" },
                          { id: "council", label: "Expert Council", icon: Zap, desc: "Neural Mesh Architecture" },
                       ].map(item => (
                          <button 
                            key={item.id}
                            onClick={() => { item.action?.(); setIsUtilityMenuOpen(false); }}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.03] transition-all group/item text-left kinetic-action"
                          >
                             <div className="p-2.5 bg-white/5 rounded-xl text-white/20 group-hover/item:text-emerald-glow group-hover/item:bg-emerald-glow/10 transition-all">
                                <item.icon size={18} />
                             </div>
                             <div>
                                <p className="text-xs font-bold tracking-tight">{item.label}</p>
                                <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] mt-0.5">{item.desc}</p>
                             </div>
                          </button>
                       ))}
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>

             <div className="glass-panel p-3 flex items-end gap-4 focus-within:border-emerald-glow/20 focus-within:shadow-[0_0_50px_rgba(104,186,127,0.05)] transition-all duration-500">
                <button 
                  onClick={() => setIsUtilityMenuOpen(!isUtilityMenuOpen)}
                  className={cn(
                    "p-3.5 rounded-2xl transition-all kinetic-action",
                    isUtilityMenuOpen ? "bg-emerald-glow text-pure-black shadow-lg" : "bg-white/5 text-white/30 hover:bg-white/10"
                  )}
                >
                  <Plus size={20} strokeWidth={2.5} />
                </button>

                <div className="flex-1 flex flex-col min-w-0 pb-1">
                   <textarea
                     rows={1}
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === "Enter" && !e.shiftKey) {
                         e.preventDefault();
                         handleSend();
                       }
                     }}
                     placeholder="Relay neural command..."
                     className="bg-transparent border-none outline-none py-3 text-sm text-white placeholder:text-white/10 resize-none max-h-40 custom-scrollbar"
                   />
                </div>

                <div className="flex items-center gap-2 pb-1.5">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-white/20 hover:text-white hover:bg-white/5 rounded-xl transition-all kinetic-action"
                  >
                    <Paperclip size={18} />
                  </button>
                  
                  <button
                    onClick={toggleListening}
                    className={cn(
                      "p-3 rounded-xl transition-all kinetic-action",
                      isListening ? "bg-red-500/10 text-red-500 animate-pulse" : "text-white/20 hover:text-emerald-glow"
                    )}
                  >
                    <Mic size={18} />
                  </button>

                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className={cn(
                      "p-3.5 rounded-2xl transition-all kinetic-action ml-2",
                      isLoading || !input.trim() 
                        ? "bg-white/5 text-white/10 opacity-50" 
                        : "bg-emerald-glow text-pure-black shadow-[0_10px_20px_rgba(104,186,127,0.2)]"
                    )}
                  >
                    {isLoading ? <RefreshCcw className="animate-spin" size={20} /> : <Send size={20} />}
                  </button>
                </div>

                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
             </div>
          </div>
        </div>
      </div>

      {/* Neural Canvas Overlay */}
      <AnimatePresence>
        {isCanvasOpen && (
          <motion.div 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-[45%] border-l border-white/5 bg-space-grey/30 backdrop-blur-3xl flex flex-col z-50 shadow-[-50px_0_100px_rgba(0,0,0,0.5)]"
          >
             <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-4">
                   <div className="p-2.5 bg-emerald-glow/10 rounded-xl text-emerald-glow shadow-inner">
                      <Eye size={20} />
                   </div>
                   <div className="space-y-0.5">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-white/80">NEURAL_CANVAS</span>
                      <p className="text-[8px] text-white/20 uppercase tracking-widest font-bold">Spatial Synthesis Workspace</p>
                   </div>
                </div>
                <button onClick={() => setIsCanvasOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/20 hover:text-white kinetic-action">
                   <X size={20} />
                </button>
             </div>
             <div className="flex-1 p-10 overflow-y-auto custom-scrollbar font-mono text-xs leading-loose text-white/60 selection:bg-emerald-glow/20">
                {canvasContent || (
                   <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-10">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      >
                        <Blocks size={64} strokeWidth={0.5} />
                      </motion.div>
                      <p className="uppercase tracking-[0.4em] text-[10px] font-black">Awaiting Synthesis Data</p>
                   </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
