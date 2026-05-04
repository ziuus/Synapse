"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, RefreshCcw, Database, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Config() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/config/models");
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const saveConfig = async () => {
    try {
      await fetch("http://localhost:8000/api/config/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      alert("Configuration saved successfully.");
    } catch (e) {
      alert("Failed to save configuration.");
    }
  };

  if (loading) return <div className="text-white/20 animate-pulse text-xs uppercase tracking-widest p-8">Loading System Config...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="text-emerald-glow" size={20} />
            System Configuration
          </h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-light">
            Calibrate the MoE routing engine and model assignments.
          </p>
        </div>
        <button 
          onClick={saveConfig}
          className="bg-emerald-glow text-pure-black px-6 py-2 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(104,186,127,0.3)]"
        >
          <Save size={14} /> Commit Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Tier Section */}
        <div className="glass-panel p-6 space-y-6 col-span-full bg-emerald-glow/[0.02] border-emerald-glow/20">
           <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white/60 flex items-center gap-2">
                 <Zap size={14} className="text-emerald-glow" /> Performance Tier
              </h3>
              <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                 {["lite", "balanced", "ultra"].map((t) => (
                    <button 
                      key={t}
                      onClick={() => setConfig({...config, performance_tier: t})}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
                        config?.performance_tier === t ? "bg-emerald-glow text-pure-black shadow-lg" : "text-white/20 hover:text-white"
                      )}
                    >
                      {t}
                    </button>
                 ))}
              </div>
           </div>
           <p className="text-[10px] text-white/30 leading-relaxed">
             Adjust the system intensity. **Lite** uses quantized CPU models. **Balanced** uses 7B-8B GPU experts. **Ultra** activates multi-agent parallel orchestration.
           </p>
        </div>

        {config?.models && Object.entries(config.models).map(([key, value]: [any, any]) => (
          <div key={key} className="glass-panel p-6 space-y-4 hover:border-emerald-glow/20 transition-all">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-glow/10 text-emerald-glow">
                   <Database size={16} />
                </div>
                <div>
                   <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{key} expert</p>
                   <p className="text-xs font-mono text-white/80">{value.name}</p>
                </div>
             </div>
             
             <div className="space-y-2">
                <label className="text-[10px] text-white/20 uppercase tracking-widest">Active Model ID</label>
                <input 
                  type="text" 
                  value={value.name}
                  onChange={(e) => {
                    const newConfig = { ...config };
                    newConfig.models[key].name = e.target.value;
                    setConfig(newConfig);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs outline-none focus:border-emerald-glow/30 transition-all font-mono"
                />
             </div>
          </div>
        ))}
      </div>

      <div className="glass-panel p-6 bg-emerald-glow/[0.01] border-emerald-glow/10 flex items-center gap-6">
         <div className="p-4 rounded-full bg-emerald-glow/10 text-emerald-glow border border-emerald-glow/20">
            <Shield size={24} />
         </div>
         <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase tracking-tight">Safety & Persistence</h4>
            <p className="text-[11px] text-white/30 leading-relaxed max-w-md">
               Changes to model assignments require a neural reload. Ensure the models are pulled via the **Instances** tab before committing here.
            </p>
         </div>
      </div>
    </div>
  );
}
