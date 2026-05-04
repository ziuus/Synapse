"use client";

import React, { useState, useEffect } from "react";
import { Wrench, Plus, Play, Save, Trash2, Code2, Layers, Cpu, Zap, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function Workflows() {
  const [skills, setSkills] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"library" | "builder">("library");
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCode, setNewSkillCode] = useState(`def handle(query, switcher):\n    # Custom logic here\n    # Return (type, model_name, processed_query, reason)\n    return "chat", switcher.models["chat"]["name"], query, "custom skill"`);

  const fetchSkills = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/skills");
      const data = await res.json();
      setSkills(data.skills);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchSkills(); }, []);

  const saveSkill = async () => {
    if (!newSkillName) return alert("Please provide a name");
    try {
      const res = await fetch("http://localhost:8000/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSkillName, code: newSkillCode }),
      });
      if (res.ok) {
        alert("Skill registered successfully!");
        fetchSkills();
        setActiveTab("library");
        setNewSkillName("");
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex flex-col h-full space-y-8 overflow-y-auto pr-4 custom-scrollbar">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="text-emerald-glow" size={20} />
            Agentic Workflows
          </h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-light">
            Construct custom skills, slash commands, and autonomous task sequences.
          </p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
           <button 
             onClick={() => setActiveTab("library")}
             className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === "library" ? "bg-emerald-glow text-pure-black shadow-lg" : "text-white/40 hover:text-white")}
           >
             Library
           </button>
           <button 
             onClick={() => setActiveTab("builder")}
             className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all", activeTab === "builder" ? "bg-emerald-glow text-pure-black shadow-lg" : "text-white/40 hover:text-white")}
           >
             Builder
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "library" ? (
          <motion.div 
            key="library"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* New Skill Trigger */}
            <div 
              onClick={() => setActiveTab("builder")}
              className="glass-panel p-8 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:bg-white/[0.02] hover:border-emerald-glow/30 transition-all cursor-pointer group"
            >
               <div className="p-4 rounded-full bg-white/5 text-white/20 group-hover:bg-emerald-glow/10 group-hover:text-emerald-glow transition-all">
                  <Plus size={32} />
               </div>
               <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">Inject New Skill</p>
            </div>

            {skills.map((skill, i) => (
              <div key={skill.id} className="glass-panel p-6 space-y-4 hover:border-emerald-glow/20 transition-all group">
                 <div className="flex justify-between items-start">
                    <div className="p-3 rounded-xl bg-emerald-glow/10 text-emerald-glow">
                       <Zap size={20} />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button className="p-2 hover:text-emerald-glow"><Code2 size={14}/></button>
                       <button className="p-2 hover:text-red-400"><Trash2 size={14}/></button>
                    </div>
                 </div>
                 <div>
                    <h4 className="text-sm font-bold truncate">/{skill.id}</h4>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest">Type: {skill.type}</p>
                 </div>
                 <div className="pt-4 flex items-center gap-2 text-[9px] text-white/20 font-mono italic">
                    <Info size={10} />
                    Ready for neural execution.
                 </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="builder"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full"
          >
            {/* Editor Area */}
            <div className="lg:col-span-2 space-y-4 flex flex-col">
               <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Skill Prototype (Python)</span>
                  <div className="flex gap-2">
                     <button className="text-[10px] text-white/40 flex items-center gap-1 hover:text-emerald-glow"><Play size={10}/> Test</button>
                  </div>
               </div>
               <div className="flex-1 glass-panel bg-pure-black/50 overflow-hidden flex flex-col border-white/5">
                  <textarea 
                    value={newSkillCode}
                    onChange={(e) => setNewSkillCode(e.target.value)}
                    className="flex-1 bg-transparent p-6 font-mono text-xs outline-none text-emerald-glow/90 resize-none custom-scrollbar"
                    spellCheck={false}
                  />
               </div>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-6">
               <div className="glass-panel p-6 space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Skill Name / Slash Command</label>
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">/</span>
                        <input 
                          type="text" 
                          value={newSkillName}
                          onChange={(e) => setNewSkillName(e.target.value)}
                          placeholder="summarize-pdf"
                          className="w-full bg-white/5 border border-white/5 rounded-lg py-2 pl-6 pr-3 text-xs outline-none focus:border-emerald-glow/30 transition-all"
                        />
                     </div>
                  </div>

                  <div className="space-y-4 pt-4">
                     <h5 className="text-[10px] text-white/20 uppercase tracking-widest flex items-center gap-2">
                        <Cpu size={10} /> Architecture Specs
                     </h5>
                     <div className="space-y-2">
                        <div className="flex justify-between text-[11px] text-white/40">
                           <span>Runtime</span>
                           <span className="text-emerald-glow font-mono">Python 3.14</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-white/40">
                           <span>Sandboxed</span>
                           <span className="text-emerald-glow font-mono">Yes</span>
                        </div>
                     </div>
                  </div>

                  <button 
                    onClick={saveSkill}
                    className="w-full bg-emerald-glow text-pure-black py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={14} /> Finalize Skill
                  </button>
               </div>

               <div className="glass-panel p-6 bg-emerald-glow/[0.01] border-emerald-glow/10 flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-emerald-glow/10 text-emerald-glow shrink-0">
                     <Layers size={14} />
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-bold uppercase tracking-widest">Workflow Chaining</p>
                     <p className="text-[10px] text-white/30 leading-relaxed font-light">
                        Skills are registered as global slash commands. You can call multiple skills in a sequence by mentioning them in the prompt.
                     </p>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
