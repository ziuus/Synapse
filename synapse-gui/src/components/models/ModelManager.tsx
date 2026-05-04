"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Download, Trash2, Database, Activity, CheckCircle2, RefreshCcw, Cpu, Cpu as VramIcon, HardDrive, Clock, Search, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelInfo {
  name: string;
  type: string;
  status: "loaded" | "standby";
  size: string;
}

export default function ModelManager() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [pullInput, setPullInput] = useState("");
  const [pullStatus, setPullStatus] = useState("");
  const [isPulling, setIsPulling] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const [mRes, sRes] = await Promise.all([
        fetch("http://localhost:8000/api/models"),
        fetch("http://localhost:8000/api/status")
      ]);
      const mData = await mRes.json();
      const sData = await sRes.json();
      setModels(mData.installed);
      setStatus(sData);
    } catch (e) {
      console.error("Failed to fetch models");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePull = async () => {
    if (!pullInput.trim() || isPulling) return;
    setIsPulling(true);
    setPullStatus("Initializing pull...");
    
    try {
      const response = await fetch("http://localhost:8000/api/models/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pullInput.trim() }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setPullStatus(chunk.split("\n").filter(Boolean).pop() || "");
      }
      
      setPullStatus("✓ Success");
      setPullInput("");
      fetchData();
    } catch (e) {
      setPullStatus("✗ Failed");
    } finally {
      setIsPulling(false);
    }
  };

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete ${modelName}?`)) return;
    try {
      await fetch(`http://localhost:8000/api/models/${modelName}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      alert("Failed to delete model");
    }
  };

  const filteredModels = models.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 pb-20 overflow-y-auto h-full pr-2 custom-scrollbar">
      
      {/* Header & System Stats */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
           <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
             <Server className="text-emerald-glow" size={20} />
             Instances Dashboard
           </h2>
           <p className="text-xs text-white/40 max-w-md uppercase tracking-[0.1em] font-light">
             Real-time monitoring of local neural engine, VRAM allocation, and expert status.
           </p>
        </div>
        
        <div className="flex gap-4">
          <div className="glass-panel px-6 py-3 flex flex-col items-center justify-center border-emerald-glow/20 bg-emerald-glow/[0.02]">
             <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Uptime</span>
             <span className="text-sm font-mono text-emerald-glow">{status?.uptime || "0h 0m"}</span>
          </div>
          <div className="glass-panel px-6 py-3 flex flex-col items-center justify-center border-blue-400/20 bg-blue-400/[0.02]">
             <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Requests</span>
             <span className="text-sm font-mono text-blue-400">{status?.requests_total || 0}</span>
          </div>
        </div>
      </div>

      {/* Resource Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white/60 flex items-center gap-2">
              <VramIcon size={14} /> VRAM Allocation
            </h3>
            <span className="text-[10px] font-mono text-emerald-glow">{status?.vram?.used} / {status?.vram?.total}</span>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded-full overflow-hidden p-[2px] border border-white/5">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${status?.vram?.percent}%` }}
                 className="h-full bg-gradient-to-r from-emerald-glow/50 to-emerald-glow rounded-full shadow-[0_0_15px_rgba(104,186,127,0.3)]"
               />
            </div>
            <div className="flex justify-between text-[9px] uppercase tracking-widest text-white/20">
               <span>Idle</span>
               <span>{status?.vram?.percent}% Saturation</span>
               <span>Max Capacity</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 space-y-4 flex flex-col justify-center">
           <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white/60 flex items-center gap-2">
              <Activity size={14} /> Ollama Bridge
            </h3>
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl flex items-center justify-center transition-all duration-1000 shadow-2xl",
                status?.ollama_running ? "bg-emerald-glow/20 border border-emerald-glow/30" : "bg-red-500/10 border border-red-500/20"
              )}>
                <RefreshCcw size={20} className={cn(status?.ollama_running ? "text-emerald-glow animate-spin-slow" : "text-red-500")} />
              </div>
              <div>
                <p className="text-sm font-bold">{status?.ollama_running ? "Link Established" : "Disconnected"}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">{status?.ollama_running ? "Headless API Active" : "Run: ollama serve"}</p>
              </div>
            </div>
        </div>
      </div>

      {/* Model Inventory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white/60">Neural Inventory</h3>
          <div className="relative w-48">
             <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
             <input 
               type="text" 
               placeholder="Search registry..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-[10px] outline-none focus:border-emerald-glow/30 transition-all"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredModels.map((model, i) => (
              <motion.div 
                key={model.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "glass-panel p-5 group hover:border-emerald-glow/30 transition-all flex flex-col gap-4 relative",
                  model.status === "loaded" ? "border-emerald-glow/30 bg-emerald-glow/[0.02]" : "border-white/5"
                )}
              >
                {model.status === "loaded" && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-glow/10 text-emerald-glow text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border border-emerald-glow/20">
                     <span className="w-1 h-1 rounded-full bg-emerald-glow animate-pulse" />
                     Live
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-xl",
                    model.status === "loaded" ? "bg-emerald-glow/10 text-emerald-glow" : "bg-white/5 text-white/30"
                  )}>
                    <Cpu size={18} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold truncate">{model.name}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest">{model.type} Expert</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                   <div className="flex items-center gap-3 text-[10px] text-white/40">
                      <div className="flex items-center gap-1">
                         <HardDrive size={10} /> {model.size}
                      </div>
                      <div className="flex items-center gap-1 capitalize">
                         <Clock size={10} /> {model.status}
                      </div>
                   </div>
                   <button 
                    onClick={() => handleDelete(model.name)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-white/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Pull Card */}
          <div className="glass-panel p-5 border-dashed border-white/10 flex flex-col gap-4 bg-transparent hover:bg-white/[0.01] transition-all cursor-pointer" onClick={() => document.getElementById("pull-input")?.focus()}>
             <div className="flex items-center gap-4">
               <div className="p-3 rounded-xl bg-white/5 text-white/20">
                  <Download size={18} />
               </div>
               <div>
                  <p className="text-xs font-bold text-white/40">Acquire Expert</p>
                  <p className="text-[10px] text-white/20 uppercase tracking-widest">Pull from Ollama</p>
               </div>
             </div>
             <div className="flex gap-2">
                <input 
                  id="pull-input"
                  type="text" 
                  value={pullInput}
                  onChange={(e) => setPullInput(e.target.value)}
                  placeholder="Model tag..."
                  className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-emerald-glow/20"
                />
                <button 
                  onClick={(e) => { e.stopPropagation(); handlePull(); }}
                  disabled={isPulling}
                  className="bg-emerald-glow text-pure-black px-4 py-1.5 rounded-lg text-[10px] font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isPulling ? "..." : "Pull"}
                </button>
             </div>
             {pullStatus && <p className="text-[9px] font-mono text-emerald-glow/60 truncate">{pullStatus}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
