"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Package, BarChart3, Settings, Shield, Zap, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatInterface from "@/components/chat/ChatInterface";
import ModelManager from "@/components/models/ModelManager";
import Analytics from "@/components/analytics/Analytics";
import Logs from "@/components/logs/Logs";
import Config from "@/components/config/Config";
import Workflows from "@/components/workflows/Workflows";

import NoSSR from "@/components/NoSSR";
import { Plus, Terminal, Server, Clock, Blocks, Wrench, Settings as CfgIcon, Bug, FileText, Search, Edit3, Trash2, Download, Check, X } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const fetchSessions = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/sessions");
      if (res.ok) setSessions(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchSessions(); }, []);

  const createSession = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/sessions", { method: "POST" });
      if (res.ok) {
        const { id } = await res.json();
        setCurrentSessionId(id);
        setActiveTab("chat");
        fetchSessions();
      }
    } catch (e) { console.error(e); }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this session?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (currentSessionId === id) setCurrentSessionId("");
        fetchSessions();
      }
    } catch (e) { console.error(e); }
  };

  const startEditing = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setEditTitle(title || "New Chat");
  };

  const saveTitle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:8000/api/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      if (res.ok) {
        setEditingSessionId(null);
        fetchSessions();
      }
    } catch (e) { console.error(e); }
  };

  const exportSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:8000/api/sessions/${id}/export`);
      if (res.ok) {
        const { markdown } = await res.json();
        const blob = new Blob([markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `synapse-chat-${id.slice(0, 8)}.md`;
        a.click();
      }
    } catch (e) { console.error(e); }
  };

  // Auto-select session or create first one
  useEffect(() => {
    if (activeTab === "chat" && !currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    } else if (activeTab === "chat" && !currentSessionId && sessions.length === 0) {
      createSession();
    }
  }, [sessions, activeTab, currentSessionId]);

  const filteredSessions = sessions.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.id.includes(searchQuery)
  );

  const navGroups = [
    {
      title: "Control",
      items: [
        { id: "overview", label: "Overview", icon: BarChart3 },
        { id: "channels", label: "Channels", icon: Globe },
        { id: "instances", label: "Instances", icon: Server },
        { id: "sessions", label: "Sessions", icon: Clock },
      ]
    },
    {
      title: "Agent",
      items: [
        { id: "skills", label: "Skills", icon: Wrench },
        { id: "nodes", label: "Nodes", icon: Blocks },
        { id: "archives", label: "Archives", icon: Package },
      ]
    },
    {
      title: "Settings",
      items: [
        { id: "roles", label: "Archetypes", icon: Shield },
        { id: "config", label: "Config", icon: CfgIcon },
        { id: "debug", label: "Debug", icon: Bug },
        { id: "logs", label: "Logs", icon: FileText },
      ]
    }
  ];

  return (
    <NoSSR>
      <main className="flex h-screen bg-pure-black overflow-hidden selection:bg-emerald-glow selection:text-pure-black text-sm">
        {/* Sidebar */}
        <div className="w-72 border-r border-white/5 flex flex-col bg-space-grey/50 backdrop-blur-xl overflow-hidden custom-scrollbar">
          
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="p-2 bg-emerald-glow rounded-xl shadow-[0_0_20px_rgba(104,186,127,0.4)]">
              <Zap size={16} className="text-pure-black" />
            </div>
            <div>
               <h1 className="font-bold tracking-tighter leading-tight">SYNAPSE</h1>
               <p className="text-[9px] text-white/40 uppercase tracking-widest">Gateway Dashboard</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Chat Group */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Neural Streams</span>
                 <button onClick={createSession} className="text-white/40 hover:text-emerald-glow transition-colors p-1 hover:bg-white/5 rounded">
                    <Plus size={14} />
                 </button>
              </div>

              {/* Search Sessions */}
              <div className="relative px-2">
                <Search size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="text" 
                  placeholder="Filter streams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-lg py-2 pl-8 pr-4 text-[10px] outline-none focus:border-emerald-glow/30 transition-all placeholder:text-white/10"
                />
              </div>

              <div className="space-y-1">
                {filteredSessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setActiveTab("chat"); setCurrentSessionId(s.id); }}
                    className={cn(
                      "group w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer relative",
                      activeTab === "chat" && currentSessionId === s.id 
                        ? "bg-white/5 text-emerald-glow border border-emerald-glow/20" 
                        : "text-white/50 hover:text-white hover:bg-white/[0.02]"
                    )}
                  >
                    <MessageSquare size={14} className="shrink-0" />
                    
                    {editingSessionId === s.id ? (
                      <input 
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveTitle(s.id, e as any)}
                        className="bg-transparent border-none outline-none text-xs w-full text-white"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate text-xs flex-1">{s.title || "New Chat"}</span>
                    )}

                    {/* Actions */}
                    <div className={cn(
                      "flex items-center gap-1 transition-opacity",
                      editingSessionId === s.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      {editingSessionId === s.id ? (
                        <button onClick={(e) => saveTitle(s.id, e)} className="p-1 hover:text-emerald-glow"><Check size={12}/></button>
                      ) : (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEditing(s.id, s.title, e); }} 
                            className="p-1 hover:text-emerald-glow transition-colors"
                          >
                            <Edit3 size={10}/>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); exportSession(s.id, e); }} 
                            className="p-1 hover:text-emerald-glow transition-colors"
                          >
                            <Download size={10}/>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteSession(s.id, e); }} 
                            className="p-1 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={10}/>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Groups */}
            {navGroups.map(group => (
              <div key={group.title} className="space-y-1">
                 <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest px-2 mb-2 block">{group.title}</span>
                 {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                        activeTab === item.id 
                          ? "bg-white/5 text-emerald-glow border border-emerald-glow/20" 
                          : "text-white/50 hover:text-white hover:bg-white/[0.02]"
                      )}
                    >
                      <item.icon size={14} className="shrink-0" />
                      <span className="text-xs">{item.label}</span>
                    </button>
                 ))}
              </div>
            ))}
          </div>

          <div className="p-4 mt-auto border-t border-white/5">
             <div className="flex items-center justify-between text-white/30">
                <div className="flex items-center gap-2">
                   <Shield size={12} className="text-emerald-glow" />
                   <span className="text-[10px] uppercase tracking-widest">Local Node</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-glow animate-pulse" />
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_50%_50%,rgba(104,186,127,0.03),transparent_70%)]">
          
          <div className="flex-1 p-8 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + (activeTab === "chat" ? currentSessionId : "")}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {activeTab === "chat" && currentSessionId && <ChatInterface sessionId={currentSessionId} />}
                {activeTab === "archives" && <ModelManager />}
                {activeTab === "overview" && <Analytics />}
                {activeTab === "logs" && <Logs />}
                {activeTab === "instances" && <ModelManager />}
                {activeTab === "config" && <Config />}
                {activeTab === "skills" && <Workflows />}
                {activeTab === "roles" && (
                   <div className="space-y-8 h-full overflow-y-auto pr-4 custom-scrollbar">
                      <div className="space-y-4">
                        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                          <Shield className="text-emerald-glow" size={20} />
                          Archetype Management
                        </h2>
                        <p className="text-xs text-white/40 max-w-md uppercase tracking-[0.1em] font-light">
                          Configure intelligence personas and their allocated neural expert clusters.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {["Generalist", "Deep Researcher", "Software Engineer"].map((role) => (
                            <div key={role} className="glass-panel p-6 space-y-4 hover:border-emerald-glow/20 transition-all cursor-pointer">
                               <div className="p-3 bg-emerald-glow/10 rounded-xl w-fit text-emerald-glow">
                                  <Shield size={20} />
                                </div>
                                <div>
                                  <h4 className="font-bold">{role}</h4>
                                  <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Status: Active Cluster</p>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex gap-2">
                                   <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded-full text-white/40">CHAT</span>
                                   <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded-full text-white/40">CODE</span>
                                   <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded-full text-white/40">VISION</span>
                                </div>
                            </div>
                         ))}
                      </div>
                   </div>
                )}
                
                {/* Placeholder for missing tabs */}
                {!["chat", "archives", "overview", "logs", "instances", "config", "skills"].includes(activeTab) && (
                   <div className="flex flex-col items-center justify-center h-full text-white/20 space-y-4">
                      <Terminal size={48} strokeWidth={1} />
                      <p className="uppercase tracking-[0.2em] text-xs">Module initializing: {activeTab}</p>
                   </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Background Grain/Noise Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay" 
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
          />
        </div>
      </main>
    </NoSSR>
  );
}
