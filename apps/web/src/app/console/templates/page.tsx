"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

import {
  listTemplates,
  getTemplate,
  customizeTemplate,
  deployTemplate,
  type TemplateItem,
  type TemplateDetail,
  type CustomizeResult,
} from "@/lib/console-api";
import { useProjectContextStore } from "@/lib/stores/project-context-store";

// ── SVG State Machine ──────────────────────────────────────────────────────

function WorkflowGraphSVG({ definition }: { definition: Record<string, unknown> }) {
  const mainWf = (definition?.workflows as Record<string, unknown>)?.main as Record<string, unknown> | undefined;
  if (!mainWf) return <p className="text-[#52525b] text-sm text-center py-6">No graph data</p>;
  const stateMap = (mainWf.states as Record<string, unknown>) || {};
  const stateNames = Object.keys(stateMap);
  const transitions: Array<{ from: string; to: string; condition?: string }> =
    (mainWf.transitions as Array<{ from: string; to: string; condition?: string }>) || [];
  if (stateNames.length === 0) return <p className="text-[#52525b] text-sm text-center py-6">No states</p>;

  const initialState = Object.entries(stateMap).find(([, s]) => (s as Record<string, unknown>)?.initial)?.[0] || stateNames[0];
  const layerOf: Record<string, number> = { [initialState]: 0 };
  const bfsQ = [initialState]; let h = 0;
  while (h < bfsQ.length) {
    const curr = bfsQ[h++];
    for (const t of transitions) if (t.from === curr && !(t.to in layerOf)) { layerOf[t.to] = layerOf[curr] + 1; bfsQ.push(t.to); }
  }
  for (const s of stateNames) if (!(s in layerOf)) layerOf[s] = Math.max(0, ...Object.values(layerOf)) + 1;
  const byLayer: Record<number, string[]> = {};
  for (const [s, l] of Object.entries(layerOf)) { if (!byLayer[l]) byLayer[l] = []; byLayer[l].push(s); }
  const layers = Object.keys(byLayer).map(Number).sort((a, b) => a - b);
  const NW = 100, NH = 30, HGAP = 46, VGAP = 14, PAD = 14;
  const maxRows = Math.max(...layers.map((l) => byLayer[l].length));
  const totalH = PAD * 2 + maxRows * NH + (maxRows - 1) * VGAP;
  const totalW = PAD * 2 + layers.length * NW + (layers.length - 1) * HGAP;
  const pos: Record<string, { x: number; y: number }> = {};
  layers.forEach((layer, li) => {
    const states = byLayer[layer];
    const bH = states.length * NH + (states.length - 1) * VGAP;
    const startY = PAD + (totalH - PAD * 2 - bH) / 2;
    states.forEach((state, si) => { pos[state] = { x: PAD + li * (NW + HGAP), y: startY + si * (NH + VGAP) }; });
  });
  const termSet = new Set(stateNames.filter((s) => !transitions.some((t) => t.from === s)));
  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ maxHeight: 200, minHeight: 90 }}>
      <defs><marker id="tmpl-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1 L10 5 L0 9z" fill="#3f3f46" /></marker></defs>
      {transitions.map((t, i) => {
        const f = pos[t.from]; const to = pos[t.to]; if (!f || !to) return null;
        const x1 = f.x + NW, y1 = f.y + NH / 2, x2 = to.x, y2 = to.y + NH / 2, mx = (x1 + x2) / 2;
        return <path key={i} d={Math.abs(y1 - y2) < 3 ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} fill="none" stroke="#3f3f46" strokeWidth="1.5" markerEnd="url(#tmpl-arr)" />;
      })}
      {stateNames.map((name) => {
        const p = pos[name]; if (!p) return null;
        const isI = name === initialState; const isT = termSet.has(name);
        return (
          <g key={name}>
            <rect x={p.x} y={p.y} width={NW} height={NH} rx={3} fill={isI ? "#172554" : isT ? "#141418" : "#1b1b24"} stroke={isI ? "#3b82f6" : isT ? "#52525b" : "#3f3f46"} strokeWidth={1.5} />
            <text x={p.x + NW / 2} y={p.y + NH / 2 + 4} textAnchor="middle" fontSize="9" fill={isI ? "#93c5fd" : isT ? "#52525b" : "#d4d4d8"}>{name.length > 11 ? name.slice(0, 10) + "…" : name}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ValBadge({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px]"
      style={{ background: passed ? "#0a1a0a" : "#1a0a0a", border: `1px solid ${passed ? "#1a3a1a" : "#3a1a1a"}`, color: passed ? "#86efac" : "#fca5a5" }}>
      {passed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}{label}
    </div>
  );
}

function DiffDisplay({ result }: { result: CustomizeResult }) {
  const { diff, validation } = result;
  return (
    <div className="space-y-2">
      <div className="rounded p-3" style={{ background: "#1b1b24", border: "1px solid #25252b" }}>
        <p className="text-sm mb-2" style={{ color: "#d4d4d8" }}>{diff.summary || "No structural changes"}</p>
        {diff.changed_conditions.map((c, i) => (
          <div key={i} className="text-xs rounded p-2 mb-1 space-y-0.5" style={{ background: "#141418", border: "1px solid #1c1c22" }}>
            <div style={{ color: "#a1a1aa" }}>{c.transition}</div>
            <div style={{ color: "#f87171" }}>− {c.before || "(none)"}</div>
            <div style={{ color: "#86efac" }}>+ {c.after || "(none)"}</div>
          </div>
        ))}
        {diff.added_states.length > 0 && <p className="text-xs mt-1" style={{ color: "#86efac" }}>+ Added: {diff.added_states.join(", ")}</p>}
        {diff.removed_states.length > 0 && <p className="text-xs" style={{ color: "#f87171" }}>− Removed: {diff.removed_states.join(", ")}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <ValBadge label="Schema" passed={validation.schema.passed} />
        <ValBadge label="Graph" passed={validation.graph.passed} />
        <ValBadge label="Permissions" passed={validation.permissions.passed} />
        <ValBadge label="Compliance" passed={validation.compliance.passed} />
      </div>
      {result.is_mock && (
        <div className="text-[11px] px-2 py-1 rounded" style={{ background: "#1a120a", color: "#fbbf24", border: "1px solid #3a2a0a" }}>Demo mode — connect AI provider for real customization</div>
      )}
    </div>
  );
}

const CATEGORIES = [
  { value: "", label: "All" }, { value: "higher_ed", label: "Higher Ed" }, { value: "hr", label: "HR" },
  { value: "finance", label: "Finance" }, { value: "healthcare", label: "Healthcare" }, { value: "general", label: "General" },
];

const CAT_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  higher_ed:  { bg: "#1e1030", text: "#c084fc", border: "#2f1f40" },
  hr:         { bg: "#1a120a", text: "#fbbf24", border: "#3a2a0a" },
  finance:    { bg: "#0a1a0a", text: "#86efac", border: "#1a3a1a" },
  healthcare: { bg: "#0a1520", text: "#7dd3fc", border: "#1a3040" },
  general:    { bg: "#1b1b24", text: "#a1a1aa", border: "#25252b" },
};
const catStyle = (c: string) => CAT_STYLE[c] ?? CAT_STYLE.general;

type DetailTab = "overview" | "graph" | "json" | "roles";

export default function TemplatesPage() {
  const context = useProjectContextStore((s) => s.context);
  const tenant = { institutionId: context.institutionId, projectId: context.projectId };

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [category, setCategory] = useState("");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [instruction, setInstruction] = useState("");
  const [customizing, setCustomizing] = useState(false);
  const [customizeResult, setCustomizeResult] = useState<CustomizeResult | null>(null);
  const [customizeError, setCustomizeError] = useState<string | null>(null);

  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!context.institutionId) return;
    setLoadingList(true);
    try {
      const data = await listTemplates(tenant, category || undefined);
      setTemplates(data.templates);
    } catch { setTemplates([]); }
    finally { setLoadingList(false); }
  }, [context.institutionId, context.projectId, category]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleSelect = async (id: string) => {
    if (id === selectedId) return;
    setSelectedId(id); setDetail(null); setCustomizeResult(null);
    setCustomizeError(null); setInstruction(""); setDeployMsg(null);
    setLoadingDetail(true);
    try { setDetail(await getTemplate(tenant, id)); }
    catch { setDetail(null); }
    finally { setLoadingDetail(false); }
  };

  const handleCustomize = async () => {
    if (!selectedId || !instruction.trim()) return;
    setCustomizing(true); setCustomizeResult(null); setCustomizeError(null);
    try { setCustomizeResult(await customizeTemplate(tenant, selectedId, instruction)); }
    catch (e: unknown) { setCustomizeError(e instanceof Error ? e.message : "Failed"); }
    finally { setCustomizing(false); }
  };

  const handleDeployOriginal = async () => {
    if (!selectedId) return;
    setDeploying(true); setDeployMsg(null);
    try {
      const r = await deployTemplate(tenant, selectedId);
      setDeployMsg(`✓ Created workflow draft: ${r.name} v${r.version}`);
    } catch (e: unknown) { setDeployMsg(`Error: ${e instanceof Error ? e.message : "Failed"}`); }
    finally { setDeploying(false); }
  };

  const roles = (detail?.definition?.roles as Array<{ name: string; permissions: string[] }>) || [];

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)] min-h-0">
      {/* Left list */}
      <div className="w-72 flex-none flex flex-col min-h-0">
        <div className="flex-none mb-3">
          <h2 className="text-2xl font-semibold" style={{ color: "#f4f4f5" }}>Templates</h2>
          <p className="text-sm mt-0.5" style={{ color: "#71717a" }}>Reusable workflow blueprints</p>
        </div>
        <div className="flex-none flex flex-wrap gap-1.5 mb-3">
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
              style={category === c.value
                ? { background: "#1e1e24", color: "#f4f4f5", border: "1px solid #3f3f46" }
                : { background: "transparent", color: "#71717a", border: "1px solid #25252b" }}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loadingList && (
            <div className="animate-pulse space-y-2 pt-1">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded" style={{ background: "#1b1b24" }} />)}
            </div>
          )}
          {!loadingList && templates.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: "#52525b" }}>No templates found</p>
          )}
          {templates.map((t) => {
            const cs = catStyle(t.category);
            return (
              <button key={t.id} onClick={() => handleSelect(t.id)}
                className="w-full text-left rounded-lg p-3 transition-colors"
                style={{ background: selectedId === t.id ? "#1e1e24" : "#141418", border: `1px solid ${selectedId === t.id ? "#3f3f46" : "#25252b"}` }}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium leading-tight" style={{ color: "#f4f4f5" }}>{t.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 font-medium"
                    style={{ background: cs.bg, color: cs.text, border: `1px solid ${cs.border}` }}>
                    {t.category.replace("_", " ")}
                  </span>
                </div>
                {t.compliance_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.compliance_tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-1 py-0.5 rounded"
                        style={{ background: "#1e3a5f", color: "#93c5fd", border: "1px solid #1d4ed8" }}>{tag}</span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right detail */}
      <div className="flex-1 flex flex-col min-h-0 rounded-lg overflow-hidden" style={{ border: "1px solid #25252b" }}>
        {!selectedId && (
          <div className="flex-1 flex flex-col items-center justify-center" style={{ background: "#141418" }}>
            <Layers size={32} style={{ color: "#3f3f46" }} className="mb-3" />
            <p className="text-sm" style={{ color: "#52525b" }}>Select a template to preview</p>
          </div>
        )}
        {selectedId && loadingDetail && (
          <div className="flex-1 flex items-center justify-center" style={{ background: "#141418" }}>
            <Loader2 size={20} className="animate-spin" style={{ color: "#3b82f6" }} />
          </div>
        )}
        {selectedId && !loadingDetail && detail && (
          <div className="flex-1 flex flex-col min-h-0" style={{ background: "#141418" }}>
            {/* Header */}
            <div className="flex-none px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #25252b" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: "#f4f4f5" }}>{detail.name}</h3>
                  <p className="text-sm mt-0.5" style={{ color: "#71717a" }}>{detail.description}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                  {detail.compliance_tags.map((tag) => (
                    <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded"
                      style={{ background: "#1e3a5f", color: "#93c5fd", border: "1px solid #1d4ed8" }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            {/* Tabs */}
            <div className="flex-none flex" style={{ borderBottom: "1px solid #25252b" }}>
              {(["overview", "graph", "json", "roles"] as DetailTab[]).map((t) => (
                <button key={t} onClick={() => setDetailTab(t)}
                  className="px-4 py-2.5 text-sm font-medium capitalize transition-colors"
                  style={detailTab === t ? { borderBottom: "2px solid #3b82f6", color: "#f4f4f5" } : { color: "#71717a" }}>
                  {t}
                </button>
              ))}
            </div>
            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5 min-h-0">
              {detailTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded p-3" style={{ background: "#1b1b24", border: "1px solid #25252b" }}>
                      <div className="text-xs mb-1" style={{ color: "#71717a" }}>Category</div>
                      <div className="text-sm font-medium capitalize" style={{ color: "#f4f4f5" }}>{detail.category.replace("_", " ")}</div>
                    </div>
                    <div className="rounded p-3" style={{ background: "#1b1b24", border: "1px solid #25252b" }}>
                      <div className="text-xs mb-1" style={{ color: "#71717a" }}>States</div>
                      <div className="text-sm font-medium" style={{ color: "#f4f4f5" }}>
                        {Object.keys(((detail.definition.workflows as Record<string, unknown>)?.main as Record<string, unknown>)?.states as Record<string, unknown> || {}).length}
                      </div>
                    </div>
                  </div>
                  <div className="rounded p-3" style={{ background: "#1b1b24", border: "1px solid #25252b" }}>
                    <p className="text-sm leading-relaxed" style={{ color: "#d4d4d8" }}>{detail.description}</p>
                  </div>
                </div>
              )}
              {detailTab === "graph" && (
                <div className="rounded p-4" style={{ background: "#1b1b24", border: "1px solid #25252b" }}>
                  <WorkflowGraphSVG definition={detail.definition} />
                </div>
              )}
              {detailTab === "json" && (
                <pre className="rounded p-3 text-[11px] font-mono overflow-auto"
                  style={{ background: "#0f0f12", color: "#86efac", border: "1px solid #25252b", lineHeight: 1.5 }}>
                  {JSON.stringify(detail.definition, null, 2)}
                </pre>
              )}
              {detailTab === "roles" && (
                <div className="space-y-3">
                  {roles.length === 0 && <p className="text-sm" style={{ color: "#52525b" }}>No roles defined.</p>}
                  {roles.map((role) => (
                    <div key={role.name} className="rounded p-3" style={{ background: "#1b1b24", border: "1px solid #25252b" }}>
                      <div className="text-sm font-medium mb-2" style={{ color: "#f4f4f5" }}>{role.name}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(role.permissions || []).map((p) => (
                          <span key={p} className="text-[11px] px-1.5 py-0.5 rounded"
                            style={{ background: "#141418", color: "#a1a1aa", border: "1px solid #25252b" }}>{p}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Customize panel */}
            <div className="flex-none" style={{ borderTop: "1px solid #25252b" }}>
              <div className="px-5 pt-3 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={13} style={{ color: "#3b82f6" }} />
                  <span className="text-sm font-medium" style={{ color: "#f4f4f5" }}>AI Customize</span>
                </div>
                <div className="flex gap-2">
                  <input type="text" className="flex-1 rounded px-3 py-2 text-sm outline-none"
                    style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#f4f4f5" }}
                    maxLength={500}
                    placeholder="e.g., Add a background check step before final approval…"
                    value={instruction} onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomize()} />
                  <button onClick={handleCustomize} disabled={!instruction.trim() || customizing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
                    style={{ background: "#3b82f6", color: "#fff" }}>
                    {customizing ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
                  </button>
                </div>
                {customizeError && (
                  <div className="mt-2 flex items-center gap-2 rounded px-3 py-2 text-sm"
                    style={{ background: "#1a0a0a", color: "#fca5a5", border: "1px solid #3a1a1a" }}>
                    <AlertCircle size={13} />{customizeError}
                  </div>
                )}
                {customizeResult && <div className="mt-3"><DiffDisplay result={customizeResult} /></div>}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #1c1c22" }}>
                <button onClick={() => { setCustomizeResult(null); setInstruction(""); setCustomizeError(null); }}
                  className="flex items-center gap-1.5 text-sm" style={{ color: "#71717a" }}>
                  <RefreshCw size={12} />Reset
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={handleDeployOriginal} disabled={deploying}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm disabled:opacity-50"
                    style={{ background: "#1b1b24", color: "#a1a1aa", border: "1px solid #25252b" }}>
                    {deploying ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                    Deploy Original
                  </button>
                  {customizeResult?.validation.all_passed && (
                    <button disabled className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm opacity-50"
                      style={{ background: "#3b82f6", color: "#fff" }} title="Deploy customized — save flow coming soon">
                      <CheckCircle2 size={12} />Deploy Customized ✓
                    </button>
                  )}
                </div>
              </div>
              {deployMsg && (
                <p className="px-5 pb-3 text-xs" style={{ color: deployMsg.startsWith("✓") ? "#86efac" : "#fca5a5" }}>{deployMsg}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
