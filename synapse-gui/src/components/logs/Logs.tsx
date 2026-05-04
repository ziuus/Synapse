"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, Bug, ScrollText, Trash2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Logs() {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/logs");
      const data = await res.json();
      setLogs(data.logs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Terminal className="text-emerald-glow" size={20} />
            System Runtime Logs
          </h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-light">
            Real-time telemetry stream from the Synapse Kernel.
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={fetchLogs} className="p-2 glass-panel hover:bg-white/5 text-white/40 hover:text-emerald-glow transition-all">
              <RefreshCcw size={14} />
           </button>
        </div>
      </div>

      <div className="flex-1 glass-panel bg-pure-black/50 overflow-hidden flex flex-col font-mono text-[11px] border-white/5">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.02] border-b border-white/5 text-white/30">
           <Bug size={12} />
           <span className="uppercase tracking-[0.2em] font-bold">Runtime Output</span>
        </div>
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar scroll-smooth"
        >
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-white/10 italic">
               Waiting for log stream...
            </div>
          ) : (
            logs.map((log, i) => {
              const isError = log.includes("[ERROR]") || log.includes("Exception");
              const isInfo = log.includes("[INFO]");
              const isWarn = log.includes("[WARN]");
              
              return (
                <div key={i} className={cn(
                  "py-0.5 px-2 rounded hover:bg-white/5 transition-colors leading-relaxed",
                  isError ? "text-red-400 bg-red-400/5" : 
                  isWarn ? "text-yellow-400 bg-yellow-400/5" :
                  isInfo ? "text-emerald-glow/70" : "text-white/40"
                )}>
                  <span className="opacity-30 mr-2">[{i.toString().padStart(3, '0')}]</span>
                  {log}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
