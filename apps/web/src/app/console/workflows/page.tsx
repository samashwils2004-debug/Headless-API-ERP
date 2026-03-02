"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Plus,
  X,
  ChevronRight,
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

import {
  compileBlueprint,
  createWorkflow,
  deployBlueprint,
  deployWorkflow,
  listWorkflows,
  type CompileBlueprintResponse,
} from "@/lib/console-api";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useWorkflowStore } from "@/lib/stores/workflow-store";

// ── SVG State Machine Graph ────────────────────────────────────────────────

function WorkflowGraphSVG({ definition }: { definition: Record<string, unknown> }) {
  const mainWf = (definition?.workflows as Record<string, unknown>)
    ?.main as Record<string, unknown> | undefined;
  if (!mainWf)
    return <p className="text-center text-[#52525b] text-sm py-8">No graph data</p>;

  const stateMap = (mainWf.states as Record<string, unknown>) || {};
  const stateNames = Object.keys(stateMap);
  const transitions: Array<{ from: string; to: string; condition?: string }> =
    (mainWf.transitions as Array<{ from: string; to: string; condition?: string }>) || [];

  if (stateNames.length === 0)
    return <p className="text-center text-[#52525b] text-sm py-8">No states defined</p>;

  const initialState =
    Object.entries(stateMap).find(([, s]) => (s as Record<string, unknown>)?.initial)?.[0] ||
    stateNames[0];

  // BFS layer assignment
  const layerOf: Record<string, number> = { [initialState]: 0 };
  const bfsQueue = [initialState];
  let head = 0;
  while (head < bfsQueue.length) {
    const curr = bfsQueue[head++];
    for (const t of transitions) {
      if (t.from === curr && !(t.to in layerOf)) {
        layerOf[t.to] = layerOf[curr] + 1;
        bfsQueue.push(t.to);
      }
    }
  }
  for (const s of stateNames) {
    if (!(s in layerOf)) layerOf[s] = Math.max(0, ...Object.values(layerOf)) + 1;
  }

  const byLayer: Record<number, string[]> = {};
  for (const [s, l] of Object.entries(layerOf)) {
    if (!byLayer[l]) byLayer[l] = [];
    byLayer[l].push(s);
  }
  const layers = Object.keys(byLayer)
    .map(Number)
    .sort((a, b) => a - b);

  const NW = 108, NH = 32, HGAP = 52, VGAP = 18, PAD = 16;
  const maxRows = Math.max(...layers.map((l) => byLayer[l].length));
  const totalH = PAD * 2 + maxRows * NH + (maxRows - 1) * VGAP;
  const totalW = PAD * 2 + layers.length * NW + (layers.length - 1) * HGAP;

  const pos: Record<string, { x: number; y: number }> = {};
  layers.forEach((layer, li) => {
    const states = byLayer[layer];
    const blockH = states.length * NH + (states.length - 1) * VGAP;
    const startY = PAD + (totalH - PAD * 2 - blockH) / 2;
    states.forEach((state, si) => {
      pos[state] = { x: PAD + li * (NW + HGAP), y: startY + si * (NH + VGAP) };
    });
  });

  const terminalSet = new Set(stateNames.filter((s) => !transitions.some((t) => t.from === s)));

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full" style={{ maxHeight: 280, minHeight: 100 }}>
      <defs>
        <marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 1 L10 5 L0 9z" fill="#3f3f46" />
        </marker>
      </defs>
      {transitions.map((t, i) => {
        const f = pos[t.from];
        const to = pos[t.to];
        if (!f || !to) return null;
        const x1 = f.x + NW, y1 = f.y + NH / 2;
        const x2 = to.x, y2 = to.y + NH / 2;
        const mx = (x1 + x2) / 2;
        const d = Math.abs(y1 - y2) < 4
          ? `M${x1} ${y1} L${x2} ${y2}`
          : `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke="#3f3f46" strokeWidth="1.5" markerEnd="url(#wf-arrow)" />
            {t.condition && (
              <text x={(x1 + x2) / 2} y={Math.min(y1, y2) - 5} textAnchor="middle" fontSize="8" fill="#52525b">
                {t.condition.slice(0, 22)}
              </text>
            )}
          </g>
        );
      })}
      {stateNames.map((name) => {
        const p = pos[name];
        if (!p) return null;
        const isInit = name === initialState;
        const isTerm = terminalSet.has(name);
        return (
          <g key={name}>
            <rect x={p.x} y={p.y} width={NW} height={NH} rx={4}
              fill={isInit ? "#172554" : isTerm ? "#141418" : "#1b1b24"}
              stroke={isInit ? "#3b82f6" : isTerm ? "#52525b" : "#3f3f46"} strokeWidth={1.5} />
            <text x={p.x + NW / 2} y={p.y + NH / 2 + 4} textAnchor="middle" fontSize="10"
              fill={isInit ? "#93c5fd" : isTerm ? "#52525b" : "#d4d4d8"}>
              {name.length > 13 ? name.slice(0, 12) + "…" : name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ValidationBadge({ label, passed, errors }: { label: string; passed: boolean; errors: string[] }) {
  return (
    <div className="rounded p-3" style={{ background: passed ? "#0a1a0a" : "#1a0a0a", border: `1px solid ${passed ? "#1a3a1a" : "#3a1a1a"}` }}>
      <div className="flex items-center gap-2 mb-1">
        {passed ? <CheckCircle2 size={14} style={{ color: "#16a34a" }} /> : <XCircle size={14} style={{ color: "#ef4444" }} />}
        <span className="text-xs font-medium" style={{ color: passed ? "#86efac" : "#fca5a5" }}>{label}</span>
      </div>
      {!passed && errors.slice(0, 3).map((e, i) => (
        <p key={i} className="text-[11px] mt-0.5" style={{ color: "#ef4444" }}>• {e}</p>
      ))}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-3 animate-pulse pt-2">
      {[90, 70, 80, 60].map((w, i) => (
        <div key={i} className="h-7 rounded" style={{ background: "#1b1b24", width: `${w}%` }} />
      ))}
    </div>
  );
}

function RBACTable({ definition }: { definition: Record<string, unknown> }) {
  const roles = (definition.roles as Array<{ name: string; permissions: string[] }>) || [];
  if (roles.length === 0) return <p className="text-sm text-[#52525b]">No roles defined.</p>;
  return (
    <div className="space-y-3">
      {roles.map((role) => (
        <div key={role.name} className="rounded p-3" style={{ background: "#1b1b24", border: "1px solid #25252b" }}>
          <div className="text-sm font-medium mb-2" style={{ color: "#f4f4f5" }}>{role.name}</div>
          <div className="flex flex-wrap gap-1.5">
            {(role.permissions || []).map((p) => (
              <span key={p} className="text-[11px] px-1.5 py-0.5 rounded"
                style={{ background: "#141418", color: "#a1a1aa", border: "1px solid #25252b" }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const COMPLIANCE_OPTIONS = ["FERPA", "GDPR", "HIPAA", "SOC2", "ISO27001", "PCI-DSS"];
const INSTITUTION_TYPES = ["University", "Community College", "K-12 School District", "Healthcare System", "Government Agency", "Non-profit"];
const DEPARTMENTS = ["Admissions", "Financial Aid", "Human Resources", "Finance & Accounting", "Student Affairs", "Research & Grants", "IT & Operations"];

type PreviewTab = "overview" | "graph" | "json" | "validation" | "rbac";
type CreationTab = "ai" | "scratch";

export default function WorkflowsPage() {
  const context = useProjectContextStore((s) => s.context);
  const workflows = useWorkflowStore((s) => s.workflows);
  const setWorkflows = useWorkflowStore((s) => s.setWorkflows);

  const [panelOpen, setPanelOpen] = useState(false);
  const [creationTab, setCreationTab] = useState<CreationTab>("ai");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("overview");

  const [institutionType, setInstitutionType] = useState("");
  const [department, setDepartment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [blueprint, setBlueprint] = useState<CompileBlueprintResponse | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const [scratchName, setScratchName] = useState("");
  const [scratchJson, setScratchJson] = useState(
    JSON.stringify({ workflows: { main: { states: { submitted: { initial: true }, approved: {}, rejected: {} }, transitions: [{ from: "submitted", to: "approved", condition: "decision == 'approve'" }, { from: "submitted", to: "rejected", condition: "decision == 'reject'" }] } }, roles: [{ name: "reviewer", permissions: ["application:read", "application:transition"] }] }, null, 2)
  );
  const [scratchError, setScratchError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);

  const tenant = { institutionId: context.institutionId, projectId: context.projectId };

  useEffect(() => {
    if (!context.institutionId || !context.projectId) return;
    listWorkflows(tenant).then((d) => setWorkflows(d.workflows)).catch(() => {});
  }, [context.institutionId, context.projectId]);

  const handleDeploy = async (id: string) => {
    await deployWorkflow(tenant, id);
    const d = await listWorkflows(tenant);
    setWorkflows(d.workflows);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setBlueprint(null);
    setGenError(null);
    try {
      const r = await compileBlueprint(tenant, { prompt, institution_context: { institution_type: institutionType, department, compliance_tags: tags } });
      setBlueprint(r);
      setPreviewTab("overview");
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeployBlueprint = async () => {
    if (!blueprint) return;
    setDeploying(true);
    try {
      await deployBlueprint(tenant, blueprint.id);
      const d = await listWorkflows(tenant);
      setWorkflows(d.workflows);
      setPanelOpen(false);
      setBlueprint(null);
      setPrompt("");
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleDeployScratch = async () => {
    if (!scratchName.trim()) { setScratchError("Name required"); return; }
    let def: Record<string, unknown>;
    try { def = JSON.parse(scratchJson); } catch { setScratchError("Invalid JSON"); return; }
    setScratchError(null);
    setDeploying(true);
    try {
      const wf = await createWorkflow(tenant, { name: scratchName, definition: def, is_ai_generated: false });
      await deployWorkflow(tenant, wf.id);
      const d = await listWorkflows(tenant);
      setWorkflows(d.workflows);
      setPanelOpen(false);
    } catch (e: unknown) {
      setScratchError(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeploying(false);
    }
  };

  const blueprintDef = blueprint?.blueprint as Record<string, unknown> | null;
  const validation = blueprint?.validation_result as Record<string, { passed: boolean; errors: string[] }> | null;
  const validPassed = validation ? Object.entries(validation).filter(([k]) => k !== "all_passed").every(([, v]) => v.passed) : true;
  const toggleTag = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: "#f4f4f5" }}>Workflows</h2>
          <p className="text-sm mt-0.5" style={{ color: "#71717a" }}>State-machine definitions powering your processes</p>
        </div>
        <button
          onClick={() => { setPanelOpen(true); setBlueprint(null); setGenError(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
          style={{ background: "#3b82f6", color: "#fff" }}
        >
          <Plus size={14} /> New Workflow
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg" style={{ border: "1px solid #25252b" }}>
        <table className="w-full text-left text-sm">
          <thead style={{ background: "#141418" }}>
            <tr>
              {["Name", "Version", "Source", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "#71717a" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workflows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: "#52525b" }}>
                  No workflows yet — click <strong style={{ color: "#a1a1aa" }}>New Workflow</strong> to create one.
                </td>
              </tr>
            )}
            {workflows.map((wf) => (
              <tr key={wf.id} style={{ borderTop: "1px solid #1c1c22" }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-medium" style={{ color: "#f4f4f5" }}>
                    <GitBranch size={13} style={{ color: "#52525b" }} />{wf.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#a1a1aa" }}>v{wf.version}</td>
                <td className="px-4 py-3">
                  {wf.is_ai_generated
                    ? <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: "#1e1030", color: "#c084fc", border: "1px solid #2f1f40" }}>AI</span>
                    : <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "#141418", color: "#71717a", border: "1px solid #25252b" }}>Manual</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] px-1.5 py-0.5 rounded"
                    style={{ background: wf.deployed ? "#0a1a0a" : "#141418", color: wf.deployed ? "#86efac" : "#71717a", border: `1px solid ${wf.deployed ? "#1a3a1a" : "#25252b"}` }}>
                    {wf.deployed ? "Deployed" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {!wf.deployed && (
                    <button onClick={() => handleDeploy(wf.id)} className="text-xs hover:underline" style={{ color: "#86efac" }}>Deploy</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-in panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setPanelOpen(false)} />
          <div className="w-[520px] flex-none flex flex-col overflow-hidden" style={{ background: "#141418", borderLeft: "1px solid #25252b" }}>
            {/* Panel header */}
            <div className="flex-none flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #25252b" }}>
              <h3 className="text-base font-semibold" style={{ color: "#f4f4f5" }}>New Workflow</h3>
              <button onClick={() => setPanelOpen(false)} style={{ color: "#71717a" }}><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div className="flex-none flex" style={{ borderBottom: "1px solid #25252b" }}>
              {(["ai", "scratch"] as const).map((tab) => (
                <button key={tab} onClick={() => setCreationTab(tab)}
                  className="flex-1 py-3 text-sm font-medium transition-colors"
                  style={creationTab === tab ? { borderBottom: "2px solid #3b82f6", color: "#f4f4f5" } : { color: "#71717a" }}>
                  {tab === "ai" ? <span className="flex items-center justify-center gap-1.5"><Sparkles size={13} />Generate with AI</span> : "Start from Scratch"}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* AI tab — form */}
              {creationTab === "ai" && !blueprint && !generating && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Institution Type</label>
                    <select className="w-full rounded px-3 py-2 text-sm outline-none"
                      style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#f4f4f5" }}
                      value={institutionType} onChange={(e) => setInstitutionType(e.target.value)}>
                      <option value="">Select type…</option>
                      {INSTITUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Department</label>
                    <select className="w-full rounded px-3 py-2 text-sm outline-none"
                      style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#f4f4f5" }}
                      value={department} onChange={(e) => setDepartment(e.target.value)}>
                      <option value="">Select department…</option>
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Compliance Tags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {COMPLIANCE_OPTIONS.map((t) => (
                        <button key={t} onClick={() => toggleTag(t)} className="text-[11px] px-2 py-0.5 rounded transition-colors"
                          style={tags.includes(t) ? { background: "#1e3a5f", color: "#93c5fd", border: "1px solid #1d4ed8" } : { background: "#1b1b24", color: "#71717a", border: "1px solid #25252b" }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Describe the workflow</label>
                    <textarea className="w-full rounded px-3 py-2.5 text-sm outline-none resize-none"
                      style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#f4f4f5", minHeight: 100 }}
                      maxLength={2000}
                      placeholder="e.g., Multi-stage admissions with document verification, faculty review, and financial aid integration…"
                      value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                    <div className="text-right text-[10px]" style={{ color: "#52525b" }}>{prompt.length}/2000</div>
                  </div>
                  {genError && (
                    <div className="flex items-center gap-2 rounded px-3 py-2 text-sm" style={{ background: "#1a0a0a", color: "#fca5a5", border: "1px solid #3a1a1a" }}>
                      <AlertCircle size={14} />{genError}
                    </div>
                  )}
                </>
              )}

              {/* AI tab — skeleton */}
              {creationTab === "ai" && generating && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm" style={{ color: "#a1a1aa" }}>
                    <Loader2 size={14} className="animate-spin" />Generating workflow blueprint…
                  </div>
                  <SkeletonLoader />
                </div>
              )}

              {/* AI tab — blueprint preview */}
              {creationTab === "ai" && blueprint && blueprintDef && (
                <div className="space-y-3">
                  <div className="flex gap-0 rounded overflow-hidden" style={{ border: "1px solid #25252b" }}>
                    {(["overview", "graph", "json", "validation", "rbac"] as PreviewTab[]).map((t) => (
                      <button key={t} onClick={() => setPreviewTab(t)}
                        className="flex-1 py-1.5 text-xs font-medium capitalize transition-colors"
                        style={previewTab === t ? { background: "#1e1e24", color: "#f4f4f5" } : { background: "#141418", color: "#71717a" }}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {previewTab === "overview" && (
                    <div className="space-y-3">
                      <div className="rounded p-3 space-y-2" style={{ background: "#1b1b24", border: "1px solid #25252b" }}>
                        <div className="flex justify-between text-sm">
                          <span style={{ color: "#71717a" }}>Validation</span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded"
                            style={{ background: validPassed ? "#0a1a0a" : "#1a0a0a", color: validPassed ? "#86efac" : "#fca5a5" }}>
                            {validPassed ? "All checks passed" : "Issues found"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span style={{ color: "#71717a" }}>Provider</span>
                          <span style={{ color: "#a1a1aa" }}>{(blueprint as Record<string, unknown>).provider_used as string ?? "ai"}</span>
                        </div>
                        {(blueprint as Record<string, unknown>).is_mock ? (
                          <div className="text-[11px] px-2 py-1 rounded" style={{ background: "#1a120a", color: "#fbbf24", border: "1px solid #3a2a0a" }}>
                            Demo mode — connect an AI provider for live generation
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded p-3" style={{ background: "#1b1b24", border: "1px solid #25252b" }}>
                        <div className="text-xs font-medium mb-2" style={{ color: "#71717a" }}>States</div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.keys(((blueprintDef.workflows as Record<string, unknown>)?.main as Record<string, unknown>)?.states as Record<string, unknown> || {}).map((s) => (
                            <span key={s} className="text-[11px] px-1.5 py-0.5 rounded"
                              style={{ background: "#141418", color: "#a1a1aa", border: "1px solid #25252b" }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {previewTab === "graph" && (
                    <div className="rounded p-4" style={{ background: "#1b1b24", border: "1px solid #25252b" }}>
                      <WorkflowGraphSVG definition={blueprintDef} />
                    </div>
                  )}

                  {previewTab === "json" && (
                    <pre className="rounded p-3 text-[11px] overflow-auto font-mono"
                      style={{ background: "#0f0f12", color: "#86efac", border: "1px solid #25252b", maxHeight: 240, lineHeight: 1.5 }}>
                      {JSON.stringify(blueprintDef, null, 2)}
                    </pre>
                  )}

                  {previewTab === "validation" && validation && (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(validation).map(([key, val]) =>
                        key === "all_passed" ? null : (
                          <ValidationBadge key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} passed={val.passed} errors={val.errors} />
                        )
                      )}
                    </div>
                  )}

                  {previewTab === "rbac" && <RBACTable definition={blueprintDef} />}
                </div>
              )}

              {/* Scratch tab */}
              {creationTab === "scratch" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Workflow Name</label>
                    <input type="text" className="w-full rounded px-3 py-2 text-sm outline-none"
                      style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#f4f4f5" }}
                      placeholder="e.g., Undergraduate Admissions"
                      value={scratchName} onChange={(e) => setScratchName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Workflow Definition (JSON)</label>
                    <textarea className="w-full rounded px-3 py-2.5 text-xs font-mono outline-none resize-none"
                      style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#86efac", minHeight: 220, lineHeight: 1.5 }}
                      value={scratchJson} onChange={(e) => setScratchJson(e.target.value)} spellCheck={false} />
                  </div>
                  {scratchError && (
                    <div className="flex items-center gap-2 rounded px-3 py-2 text-sm" style={{ background: "#1a0a0a", color: "#fca5a5", border: "1px solid #3a1a1a" }}>
                      <AlertCircle size={14} />{scratchError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-none flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid #25252b" }}>
              {creationTab === "ai" && blueprint ? (
                <>
                  <button onClick={() => setBlueprint(null)} className="text-sm" style={{ color: "#71717a" }}>← Edit Prompt</button>
                  <button onClick={handleDeployBlueprint} disabled={deploying || !validPassed}
                    className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                    style={{ background: "#3b82f6", color: "#fff" }}>
                    {deploying ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
                    Deploy Workflow
                  </button>
                </>
              ) : creationTab === "ai" ? (
                <>
                  <button onClick={() => setPanelOpen(false)} className="text-sm" style={{ color: "#71717a" }}>Cancel</button>
                  <button onClick={handleGenerate} disabled={!prompt.trim() || generating}
                    className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                    style={{ background: "#3b82f6", color: "#fff" }}>
                    {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    Generate Blueprint
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setPanelOpen(false)} className="text-sm" style={{ color: "#71717a" }}>Cancel</button>
                  <button onClick={handleDeployScratch} disabled={deploying}
                    className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                    style={{ background: "#3b82f6", color: "#fff" }}>
                    {deploying ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
                    Create & Deploy
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
