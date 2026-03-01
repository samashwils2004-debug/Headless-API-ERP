"use client";

import { useState } from "react";
import { Sparkles, History, Undo2, Map as MapIcon, Box, Activity } from "lucide-react";
import { useProjectContextStore } from "@/lib/stores/project-context-store";

const MOCK_VERSIONS = [
    { id: "v1.0.3", time: "10 mins ago", message: "Added Payment domain to Admissions" },
    { id: "v1.0.2", time: "2 hours ago", message: "Expanded Role definitions for Reviewers" },
    { id: "v1.0.1", time: "Yesterday", message: "Initial generation from prompt" },
];

export default function ArchitectPage() {
    const context = useProjectContextStore((s) => s.context);
    const [prompt, setPrompt] = useState("");
    const [generating, setGenerating] = useState(false);

    const handlePrompt = () => {
        if (!prompt.trim()) return;
        setGenerating(true);
        setTimeout(() => {
            setGenerating(false);
            setPrompt("");
        }, 1500);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden space-y-4">
            <div className="flex-none pb-2 border-b border-[var(--border-default)] flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Institutional Architect</h2>
                    <p className="text-sm text-[var(--text-secondary)]">Iterative NLP-driven domain composition</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-md border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                        Active: {context.projectName || "None"}
                    </span>
                    <button className="flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm hover:bg-[var(--bg-tertiary)] transition-colors">
                        <Undo2 size={14} /> Revert
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">

                {/* Left Panel: The Canvas */}
                <div className="flex-1 rounded-xl border border-[var(--border-default)] bg-[#121214] flex flex-col relative overflow-hidden">
                    {/* Canvas Header */}
                    <div className="flex-none p-4 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 backdrop-blur">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <MapIcon size={16} className="text-blue-400" />
                            Interactive Architecture Map
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">v1.0.3 (Draft)</div>
                    </div>

                    {/* Mock Canvas Area */}
                    <div className="flex-1 relative p-8">
                        <div className="absolute inset-0 opacity-10" style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                            backgroundSize: '24px 24px'
                        }}></div>

                        {/* Simulated Domain Nodes */}
                        <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 rounded-lg border border-purple-900 bg-[#1e1030] p-4 shadow-xl w-64 select-none cursor-move">
                            <div className="flex items-center gap-2 mb-4 border-b border-purple-900/50 pb-2">
                                <Box size={16} className="text-purple-400" />
                                <span className="font-semibold text-purple-200 text-sm">Admissions Domain</span>
                            </div>
                            <div className="space-y-2 text-xs text-purple-300/70">
                                <div className="flex items-center gap-2"><Activity size={12} /> Workflow: Undergraduate</div>
                                <div className="flex items-center gap-2"><Activity size={12} /> Workflow: Graduate</div>
                            </div>
                        </div>

                        <div className="absolute top-1/3 left-2/3 transform -translate-x-1/2 -translate-y-1/2 rounded-lg border border-green-900 bg-[#102015] p-4 shadow-xl w-64 select-none cursor-move">
                            <div className="flex items-center gap-2 mb-4 border-b border-green-900/50 pb-2">
                                <Box size={16} className="text-green-400" />
                                <span className="font-semibold text-green-200 text-sm">Finance Domain</span>
                            </div>
                            <div className="space-y-2 text-xs text-green-300/70">
                                <div className="flex items-center gap-2"><Activity size={12} /> Workflow: Payments</div>
                            </div>
                        </div>

                        {/* Connecting SVG lines (Mocks) */}
                        <svg className="absolute inset-0 pointer-events-none w-full h-full">
                            <path d="M 300 180 C 400 180, 500 240, 600 240" fill="none" stroke="#4a5568" strokeWidth="2" strokeDasharray="4 4" />
                        </svg>
                    </div>

                    {/* Prompt Bar anchored at bottom of Canvas */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-4/5 max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-full p-2 flex items-center shadow-2xl">
                        <Sparkles size={18} className="text-blue-500 ml-3 shrink-0" />
                        <input
                            type="text"
                            placeholder="E.g., Add a Student Financial Aid workflow to the Finance domain..."
                            className="flex-1 bg-transparent border-none outline-none px-4 text-sm text-[var(--text-primary)]"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePrompt()}
                        />
                        <button
                            onClick={handlePrompt}
                            disabled={generating || !prompt.trim()}
                            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
                        >
                            {generating ? "Iterating..." : "Iterate"}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Version History */}
                <div className="w-80 flex-none rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] flex flex-col">
                    <div className="flex-none p-4 border-b border-[var(--border-default)] flex items-center gap-2 font-medium text-sm">
                        <History size={16} /> Version History
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {MOCK_VERSIONS.map((v, i) => (
                            <div key={v.id} className={`relative pl-4 ${i !== MOCK_VERSIONS.length - 1 ? 'border-l border-[var(--border-default)] pb-4' : ''}`}>
                                <div className={`absolute top-0 -left-[5px] w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'bg-gray-600 border border-gray-800'}`}></div>
                                <div className="text-sm font-medium text-[var(--text-primary)]">{v.id}</div>
                                <div className="text-xs text-[var(--text-secondary)] mt-1">{v.message}</div>
                                <div className="text-[10px] text-[var(--text-muted)] mt-1">{v.time}</div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
