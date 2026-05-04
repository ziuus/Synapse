"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Clock, Zap, Target, TrendingUp, Cpu, Brain, Layers, Activity, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [apiUrlBase, setApiUrlBase] = useState<string>("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { protocol, hostname, port } = window.location;
      const targetPort = port === '3000' ? '8000' : port;
      const portStr = targetPort ? `:${targetPort}` : '';
      setApiUrlBase(`${protocol}//${hostname}${portStr}`);
    }
  }, []);

  useEffect(() => {
    if (!apiUrlBase) return;
    
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${apiUrlBase}/api/status`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/20 uppercase tracking-[0.3em] text-xs space-y-4">
        <Activity size={48} strokeWidth={1} className="animate-pulse text-emerald-glow/50" />
        Synchronizing Neural Metrics...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 overflow-y-auto h-full pr-2 custom-scrollbar">
      
      {/* Intelligence Header */}
      <div className="space-y-4">
         <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
           <Brain className="text-emerald-glow" size={20} />
           System Intelligence
         </h2>
         <p className="text-xs text-white/40 max-w-md uppercase tracking-[0.1em] font-light">
           High-fidelity telemetry across the distributed neural expert network.
         </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Neural Shifts", value: data.requests_total || 0, icon: Zap, color: "text-emerald-glow" },
          { label: "CPU Load", value: `${data.cpu?.percent}%`, icon: Cpu, color: "text-blue-400" },
          { label: "Memory Sat", value: `${data.vram?.percent}%`, icon: Volume2, color: "text-purple-400" },
          { label: "Expert Node", value: data.current_model ? "Active" : "Idle", icon: Target, color: "text-emerald-glow" },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-5 space-y-2 relative overflow-hidden group hover:border-emerald-glow/30 transition-all">
             <div className={cn("absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity", stat.color)}>
                <stat.icon size={100} />
             </div>
             <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{stat.label}</p>
             <p className="text-xl font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* System Load Visualizer */}
         <div className="glass-panel p-6 space-y-8">
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white/60 mb-6 flex items-center gap-2">
               <Layers size={14} /> System Load Distribution
            </h3>
            
            <div className="flex items-end justify-between h-32 gap-1 px-2">
               {(data.load_distribution || [40, 20, 30, 50, 40]).map((val: number, i: number) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${val}%` }}
                    transition={{ duration: 0.5 }}
                    className="flex-1 bg-emerald-glow/20 rounded-t-sm relative group"
                  >
                     <div className="absolute inset-x-0 top-0 h-1 bg-emerald-glow opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
               ))}
            </div>
            <div className="flex justify-between text-[9px] uppercase tracking-widest text-white/20">
               <span>Input Processing</span>
               <span>Neural Inference</span>
               <span>Output Synthesis</span>
            </div>
         </div>

         {/* Efficiency Note */}
         <div className="glass-panel p-8 flex flex-col justify-center items-center text-center space-y-6 bg-emerald-glow/[0.01] border-emerald-glow/10">
            <div className="relative">
               <div className="absolute inset-0 bg-emerald-glow/20 blur-2xl rounded-full animate-pulse" />
               <div className="relative p-6 rounded-full bg-emerald-glow/10 border border-emerald-glow/20">
                  <Zap className="text-emerald-glow" size={40} />
               </div>
            </div>
            <div className="space-y-2">
               <h4 className="text-sm font-bold uppercase tracking-widest">MoE Architecture Optimizing</h4>
               <p className="text-[11px] text-white/30 leading-relaxed max-w-[250px] mx-auto font-light">
                  Synapse is utilizing a **Mixture of Experts** strategy. Idle models are offloaded from VRAM within 300s to maintain peak efficiency.
               </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-emerald-glow font-bold uppercase tracking-tighter">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-glow animate-ping" />
               Logic Routing: AI Switcher v1.1
            </div>
         </div>
      </div>
    </div>
  );
}
