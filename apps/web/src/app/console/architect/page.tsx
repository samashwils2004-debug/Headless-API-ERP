"use client";

import { useState } from "react";
import { Building2, Wand2, ChevronRight, GitBranch, Layers, Clock } from "lucide-react";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ArchitectureVersion {
  id: string;
  version: number;
  prompt: string;
  created_at: string;
  status: "draft" | "compiled" | "deployed";
}

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const EXAMPLE_PROMPTS = [
  "University with admissions, financial aid, and academic records management",
  "EdTech platform with course enrollment, progress tracking, and certification",
  "Corporate HR system with hiring, onboarding, and performance reviews",
];

const cardStyle = { background: "#141418", borderColor: "#25252b" };

export default function ArchitectPage() {
  const [prompt, setPrompt] = useState("");
  const [institutionType, setInstitutionType] = useState("university");
  const [institutionSize, setInstitutionSize] = useState("medium");
  const [complianceTags, setComplianceTags] = useState<string[]>(["FERPA"]);
  const [generating, setGenerating] = useState(false);
  const [versions, setVersions] = useState<ArchitectureVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<ArchitectureVersion | null>(null);

  const toggleTag = (tag: string) => {
    setComplianceTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  async function generate() {
    if (!prompt.trim()) { toast.error("Enter a description first"); return; }
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/blueprints/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({
          prompt,
          institution_context: {
            institution_type: institutionType,
            institution_size: institutionSize,
            compliance_tags: complianceTags,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Generation failed");
      const data = await res.json();

      const newVersion: ArchitectureVersion = {
        id: data.id,
        version: versions.length + 1,
        prompt,
        created_at: new Date().toISOString(),
        status: data.status === "validated" ? "compiled" : "draft",
      };
      setVersions((v) => [newVersion, ...v]);
      setActiveVersion(newVersion);
      toast.success(`Architecture v${newVersion.version} generated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Building2 size={22} style={{ color: "#3b82f6" }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f4f4f5" }}>Architect</h1>
          <p className="text-sm" style={{ color: "#8a8a94" }}>
            Institutional Architecture Layer — design ERP through iterative natural language
          </p>
        </div>
        <span
          className="ml-2 text-xs px-2 py-0.5 rounded border"
          style={{ borderColor: "#3b82f630", background: "#3b82f610", color: "#60a5fa" }}
        >
          IAL
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Main panel */}
        <div className="space-y-4">
          {/* Institution Context */}
          <div className="rounded-lg border p-5" style={cardStyle}>
            <h3 className="text-sm font-medium mb-4" style={{ color: "#f4f4f5" }}>Institution Context</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8a94" }}>Type</label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                  className="w-full rounded px-3 py-2 text-sm outline-none"
                  style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#f4f4f5" }}
                >
                  <option value="university">University</option>
                  <option value="college">College</option>
                  <option value="edtech">EdTech</option>
                  <option value="corporate">Corporate</option>
                  <option value="government">Government</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8a94" }}>Size</label>
                <select
                  value={institutionSize}
                  onChange={(e) => setInstitutionSize(e.target.value)}
                  className="w-full rounded px-3 py-2 text-sm outline-none"
                  style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#f4f4f5" }}
                >
                  <option value="small">Small (&lt;1K users)</option>
                  <option value="medium">Medium (1K–10K)</option>
                  <option value="large">Large (&gt;10K)</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs mb-2" style={{ color: "#8a8a94" }}>Compliance Requirements</label>
              <div className="flex gap-2 flex-wrap">
                {["FERPA", "GDPR", "DPDP", "HIPAA", "SOC2"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="rounded px-2.5 py-1 text-xs border font-mono transition-colors"
                    style={
                      complianceTags.includes(tag)
                        ? { background: "#1e3a5f", borderColor: "#3b82f6", color: "#60a5fa" }
                        : { background: "transparent", borderColor: "#25252b", color: "#71717a" }
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt */}
          <div className="rounded-lg border p-5" style={cardStyle}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "#f4f4f5" }}>Describe Your ERP</h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the institutional workflows you need — e.g. 'University with undergraduate admissions, merit scholarship processing, and student enrollment tracking...'"
              rows={5}
              maxLength={2000}
              className="w-full rounded px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#f4f4f5" }}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs" style={{ color: "#52525b" }}>{prompt.length}/2000</p>
              <button
                onClick={generate}
                disabled={generating || !prompt.trim()}
                className="flex items-center gap-2 rounded px-5 py-2 text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: generating ? "#1e3a5f" : "#3b82f6", color: "#fff" }}
              >
                <Wand2 size={14} />
                {generating ? "Generating…" : "Generate Architecture"}
              </button>
            </div>

            {/* Example prompts */}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "#1e1e24" }}>
              <p className="text-xs mb-2" style={{ color: "#52525b" }}>Example prompts:</p>
              <div className="space-y-1">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    className="block text-left text-xs w-full px-2 py-1 rounded transition-colors hover:bg-[#1e1e24]"
                    style={{ color: "#71717a" }}
                  >
                    → {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Version Preview */}
          {activeVersion && (
            <div className="rounded-lg border p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium" style={{ color: "#f4f4f5" }}>
                  Architecture v{activeVersion.version}
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded border"
                  style={
                    activeVersion.status === "compiled"
                      ? { borderColor: "#16a34a40", background: "#0a1a0a", color: "#16a34a" }
                      : { borderColor: "#25252b", color: "#8a8a94" }
                  }
                >
                  {activeVersion.status}
                </span>
              </div>
              <p className="text-sm mb-4" style={{ color: "#8a8a94" }}>
                {activeVersion.prompt}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: GitBranch, label: "Workflows", value: "1+" },
                  { icon: Layers, label: "States", value: "4–8" },
                  { icon: Building2, label: "Roles", value: "3+" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded p-3 border text-center" style={{ borderColor: "#1e1e24" }}>
                    <Icon size={14} className="mx-auto mb-1" style={{ color: "#3b82f6" }} />
                    <p className="text-lg font-bold" style={{ color: "#f4f4f5" }}>{value}</p>
                    <p className="text-xs" style={{ color: "#71717a" }}>{label}</p>
                  </div>
                ))}
              </div>
              <a
                href="/console/ai"
                className="flex items-center justify-between w-full mt-4 rounded px-4 py-2 text-sm border transition-colors hover:bg-[#1e1e24]"
                style={{ borderColor: "#25252b", color: "#a1a1aa" }}
              >
                <span>View full blueprint in AI Generator</span>
                <ChevronRight size={14} />
              </a>
            </div>
          )}
        </div>

        {/* Version History sidebar */}
        <div className="rounded-lg border p-4" style={{ ...cardStyle, height: "fit-content" }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} style={{ color: "#71717a" }} />
            <h3 className="text-sm font-medium" style={{ color: "#f4f4f5" }}>Version History</h3>
          </div>

          {versions.length === 0 ? (
            <div className="text-center py-8" style={{ color: "#52525b" }}>
              <p className="text-xs">No versions yet</p>
              <p className="text-xs mt-1">Generate your first architecture above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVersion(v)}
                  className="w-full text-left rounded p-3 border transition-colors"
                  style={
                    activeVersion?.id === v.id
                      ? { background: "#1e1e24", borderColor: "#3b82f630" }
                      : { background: "transparent", borderColor: "#1e1e24" }
                  }
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "#f4f4f5" }}>v{v.version}</span>
                    <span
                      className="text-[10px] px-1.5 rounded"
                      style={{
                        background: v.status === "compiled" ? "#0a1a0a" : "#1a1a0a",
                        color: v.status === "compiled" ? "#16a34a" : "#ca8a04",
                      }}
                    >
                      {v.status}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: "#71717a" }}>
                    {v.prompt.slice(0, 60)}…
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: "#52525b" }}>
                    {new Date(v.created_at).toLocaleTimeString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
