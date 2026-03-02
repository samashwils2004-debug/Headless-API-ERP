"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  History,
  Undo2,
  Link as LinkIcon,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

import {
  applyArchitectPrompt,
  getArchitectureVersions,
  getAvailableWorkflows,
  getOrCreateArchitecture,
  linkWorkflowToDomain,
  type ArchitectureItem,
  type ArchitectureVersionItem,
} from "@/lib/console-api";
import { useProjectContextStore } from "@/lib/stores/project-context-store";

// ── Domain card ────────────────────────────────────────────────────────────

type DomainViz = {
  domain_id: string;
  domain_name: string;
  domain_type: string;
  style: { accent: string; bg: string; border: string };
  status: "linked" | "draft" | "unlinked";
  linked_workflow_name: string | null;
  modules: string[];
};

function statusLabel(status: string) {
  if (status === "linked") return { text: "LIVE", bg: "#0a1a0a", color: "#86efac", border: "#1a3a1a" };
  if (status === "draft") return { text: "DRAFT", bg: "#1a1200", color: "#fbbf24", border: "#3a2a00" };
  return { text: "UNLINKED", bg: "#141418", color: "#71717a", border: "#25252b" };
}

function DomainCard({
  domain,
  onLink,
}: {
  domain: DomainViz;
  onLink: (domainId: string) => void;
}) {
  const st = statusLabel(domain.status);
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3 relative"
      style={{ background: domain.style.bg || "#1b1b24", border: `1px solid ${domain.style.border || "#25252b"}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: domain.style.accent || "#a1a1aa" }} />
          <span className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>{domain.domain_name}</span>
        </div>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
        >
          {st.text}
        </span>
      </div>

      {/* Modules */}
      {domain.modules.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {domain.modules.slice(0, 3).map((m) => (
            <span key={m} className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "#141418", color: "#71717a", border: "1px solid #1c1c22" }}>
              {m}
            </span>
          ))}
          {domain.modules.length > 3 && (
            <span className="text-[10px] px-1 py-0.5 rounded" style={{ color: "#52525b" }}>
              +{domain.modules.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Linked workflow */}
      {domain.status === "linked" && domain.linked_workflow_name && (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#86efac" }}>
          <CheckCircle2 size={11} />
          <span className="truncate">{domain.linked_workflow_name}</span>
        </div>
      )}

      {/* Link button */}
      {domain.status === "unlinked" && (
        <button
          onClick={() => onLink(domain.domain_id)}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded transition-colors self-start"
          style={{ background: "#1e1e24", color: "#a1a1aa", border: "1px solid #25252b" }}
        >
          <LinkIcon size={11} />Link workflow →
        </button>
      )}
    </div>
  );
}

// ── Link workflow modal ────────────────────────────────────────────────────

function LinkModal({
  domainId,
  archId,
  tenant,
  onClose,
  onLinked,
}: {
  domainId: string;
  archId: string;
  tenant: { institutionId: string; projectId: string };
  onClose: () => void;
  onLinked: (arch: ArchitectureItem) => void;
}) {
  const [workflows, setWorkflows] = useState<Array<{ id: string; name: string; version: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWf, setSelectedWf] = useState<string>("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAvailableWorkflows(tenant, archId)
      .then((d) => { setWorkflows(d.workflows); if (d.workflows.length > 0) setSelectedWf(d.workflows[0].id); })
      .catch(() => setWorkflows([]))
      .finally(() => setLoading(false));
  }, [archId]);

  const handleLink = async () => {
    const wf = workflows.find((w) => w.id === selectedWf);
    if (!wf) return;
    setLinking(true); setError(null);
    try {
      const arch = await linkWorkflowToDomain(tenant, archId, {
        domain_id: domainId,
        workflow_id: wf.id,
        workflow_name: wf.name,
      });
      onLinked(arch);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to link");
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose} />
      <div className="relative z-10 w-96 rounded-xl p-5 space-y-4" style={{ background: "#1b1b24", border: "1px solid #3f3f46" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: "#f4f4f5" }}>Link Workflow to Domain</h3>
          <button onClick={onClose} style={{ color: "#71717a" }}><X size={16} /></button>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm py-4" style={{ color: "#71717a" }}>
            <Loader2 size={14} className="animate-spin" />Loading deployed workflows…
          </div>
        ) : workflows.length === 0 ? (
          <p className="text-sm py-4" style={{ color: "#71717a" }}>
            No deployed workflows found. Deploy a workflow first from the Workflows page.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Select Workflow</label>
              <select className="w-full rounded px-3 py-2 text-sm outline-none"
                style={{ background: "#141418", border: "1px solid #25252b", color: "#f4f4f5" }}
                value={selectedWf} onChange={(e) => setSelectedWf(e.target.value)}>
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>{wf.name} v{wf.version}</option>
                ))}
              </select>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded px-3 py-2 text-sm"
                style={{ background: "#1a0a0a", color: "#fca5a5", border: "1px solid #3a1a1a" }}>
                <AlertCircle size={13} />{error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-1.5 rounded text-sm" style={{ color: "#71717a" }}>Cancel</button>
              <button onClick={handleLink} disabled={!selectedWf || linking}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50"
                style={{ background: "#3b82f6", color: "#fff" }}>
                {linking ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
                Link
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Version history timeline ───────────────────────────────────────────────

function VersionHistory({ versions }: { versions: ArchitectureVersionItem[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {versions.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: "#52525b" }}>No versions yet</p>
      )}
      {versions.map((v, i) => (
        <div key={v.id}
          className={`relative pl-4 ${i !== versions.length - 1 ? "pb-4" : ""}`}
          style={i !== versions.length - 1 ? { borderLeft: "1px solid #25252b" } : {}}>
          <div className={`absolute top-0 -left-[5px] w-2.5 h-2.5 rounded-full ${i === 0 ? "ring-2 ring-blue-500/30" : ""}`}
            style={{ background: i === 0 ? "#3b82f6" : "#3f3f46", border: i === 0 ? "" : "1px solid #52525b" }} />
          <div className="text-xs font-medium" style={{ color: "#f4f4f5" }}>v{v.version}</div>
          <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "#a1a1aa" }}>{v.diff_summary || v.prompt?.slice(0, 80) || "—"}</div>
          <div className="text-[10px] mt-0.5" style={{ color: "#52525b" }}>
            {new Date(v.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ArchitectPage() {
  const context = useProjectContextStore((s) => s.context);
  const tenant = { institutionId: context.institutionId, projectId: context.projectId };

  const [architecture, setArchitecture] = useState<ArchitectureItem | null>(null);
  const [versions, setVersions] = useState<ArchitectureVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("");
  const [applying, setApplying] = useState(false);
  const [promptResult, setPromptResult] = useState<{
    intent: string; message: string; suggested_action: string; is_mock: boolean;
  } | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);

  const [linkDomainId, setLinkDomainId] = useState<string | null>(null);

  const loadVersions = useCallback(async (archId: string) => {
    try {
      const d = await getArchitectureVersions(tenant, archId);
      setVersions(d.versions);
    } catch { setVersions([]); }
  }, [context.institutionId, context.projectId]);

  useEffect(() => {
    if (!context.institutionId || !context.projectId) return;
    setLoading(true);
    setLoadError(null);
    getOrCreateArchitecture(tenant)
      .then((arch) => {
        setArchitecture(arch);
        return loadVersions(arch.id);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load architecture");
      })
      .finally(() => setLoading(false));
  }, [context.institutionId, context.projectId]);

  const handlePrompt = async () => {
    if (!prompt.trim() || !architecture) return;
    setApplying(true);
    setPromptResult(null);
    setPromptError(null);
    try {
      const r = await applyArchitectPrompt(tenant, architecture.id, prompt);
      if (r.architecture) setArchitecture(r.architecture);
      setPromptResult({ intent: r.intent, message: r.message, suggested_action: r.suggested_action, is_mock: r.is_mock });
      setPrompt("");
      await loadVersions(architecture.id);
    } catch (e: unknown) {
      setPromptError(e instanceof Error ? e.message : "Failed");
    } finally {
      setApplying(false);
    }
  };

  const handleLinked = (arch: ArchitectureItem) => {
    setArchitecture(arch);
    loadVersions(arch.id);
  };

  const vizConfig = architecture?.visualization_config as {
    domains?: DomainViz[];
    connections?: Array<{ from: string; to: string; label?: string }>;
    layout?: string;
  } | null;

  const domains: DomainViz[] = vizConfig?.domains || [];

  const gridCols = domains.length <= 2 ? "grid-cols-2" : domains.length <= 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden gap-0">
      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold" style={{ color: "#f4f4f5" }}>Institutional Architect</h2>
            {architecture && (
              <span className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ background: "#1e1e24", color: "#a1a1aa", border: "1px solid #25252b" }}>
                v{architecture.version}
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: "#71717a" }}>NLP-driven ERP domain composition</p>
        </div>
        <div className="flex items-center gap-2">
          {architecture && (
            <span className="text-xs px-2 py-0.5 rounded"
              style={{ background: "#141418", color: "#71717a", border: "1px solid #25252b" }}>
              {architecture.name}
            </span>
          )}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors"
            style={{ background: "#1b1b24", color: "#71717a", border: "1px solid #25252b" }}
            onClick={() => {
              if (!architecture) return;
              setLoading(true);
              getOrCreateArchitecture(tenant).then(setArchitecture).finally(() => setLoading(false));
            }}
          >
            <Undo2 size={13} />Revert
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Canvas */}
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden relative"
          style={{ background: "#0f0f12", border: "1px solid #25252b" }}>
          {/* Canvas header */}
          <div className="flex-none flex items-center justify-between px-4 py-3"
            style={{ background: "#141418", borderBottom: "1px solid #25252b" }}>
            <span className="text-sm font-medium" style={{ color: "#a1a1aa" }}>ERP Architecture Map</span>
            {vizConfig?.layout && (
              <span className="text-xs" style={{ color: "#52525b" }}>{vizConfig.layout} layout</span>
            )}
          </div>

          {/* Domain grid */}
          <div className="flex-1 overflow-auto p-6 relative">
            {/* Dot grid background */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }} />

            {loading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin" style={{ color: "#3b82f6" }} />
              </div>
            )}

            {!loading && loadError && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <AlertCircle size={24} style={{ color: "#ef4444", margin: "0 auto" }} />
                  <p className="text-sm" style={{ color: "#fca5a5" }}>{loadError}</p>
                  <p className="text-xs" style={{ color: "#52525b" }}>
                    Ensure a project is selected and the API is running.
                  </p>
                </div>
              </div>
            )}

            {!loading && !loadError && domains.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3 max-w-sm">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
                    style={{ background: "#1b1b24", border: "1px solid #25252b" }}>
                    <Sparkles size={18} style={{ color: "#3b82f6" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "#f4f4f5" }}>Architecture is empty</p>
                  <p className="text-xs" style={{ color: "#71717a" }}>
                    Use the prompt bar below to describe your institution's ERP structure.
                  </p>
                  <p className="text-xs" style={{ color: "#52525b" }}>
                    e.g., "Add Admissions and Finance domains to a university ERP"
                  </p>
                </div>
              </div>
            )}

            {!loading && !loadError && domains.length > 0 && (
              <div className={`grid ${gridCols} gap-4 relative z-10`}>
                {domains.map((domain) => (
                  <DomainCard key={domain.domain_id} domain={domain}
                    onLink={(id) => setLinkDomainId(id)} />
                ))}
              </div>
            )}
          </div>

          {/* Prompt result banner */}
          {promptResult && (
            <div className="flex-none px-4 py-2 flex items-center gap-3"
              style={{ background: "#141418", borderTop: "1px solid #25252b" }}>
              {promptResult.is_mock && (
                <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: "#1a120a", color: "#fbbf24", border: "1px solid #3a2a0a" }}>
                  Demo
                </span>
              )}
              <span className="text-xs flex-1" style={{ color: "#a1a1aa" }}>
                {promptResult.intent === "redirect_to_workflow"
                  ? "→ Workflow creation is on the Workflows page"
                  : promptResult.message || `Applied (${promptResult.intent})`}
              </span>
              <button onClick={() => setPromptResult(null)} style={{ color: "#52525b" }}><X size={12} /></button>
            </div>
          )}

          {promptError && (
            <div className="flex-none px-4 py-2 flex items-center gap-2"
              style={{ background: "#1a0a0a", borderTop: "1px solid #3a1a1a" }}>
              <AlertCircle size={13} style={{ color: "#ef4444" }} />
              <span className="text-xs" style={{ color: "#fca5a5" }}>{promptError}</span>
              <button onClick={() => setPromptError(null)} className="ml-auto" style={{ color: "#52525b" }}><X size={12} /></button>
            </div>
          )}

          {/* NLP Prompt bar */}
          <div className="flex-none p-4" style={{ borderTop: "1px solid #25252b" }}>
            <div className="flex items-center gap-2 rounded-full px-4 py-2.5"
              style={{ background: "#1b1b24", border: "1px solid #3f3f46" }}>
              <Sparkles size={15} style={{ color: "#3b82f6" }} className="shrink-0" />
              <input type="text"
                placeholder="e.g., Add a Financial Aid domain linked to Admissions…"
                className="flex-1 bg-transparent border-none outline-none text-sm"
                style={{ color: "#f4f4f5" }}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePrompt()}
                disabled={applying || !architecture} />
              <button onClick={handlePrompt} disabled={!prompt.trim() || applying || !architecture}
                className="rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50 transition-colors shrink-0"
                style={{ background: "#3b82f6", color: "#fff" }}>
                {applying ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: version history */}
        <div className="w-72 flex-none rounded-xl flex flex-col"
          style={{ background: "#141418", border: "1px solid #25252b" }}>
          <div className="flex-none px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: "1px solid #25252b" }}>
            <History size={14} style={{ color: "#71717a" }} />
            <span className="text-sm font-medium" style={{ color: "#f4f4f5" }}>Version History</span>
          </div>
          <VersionHistory versions={versions} />
        </div>
      </div>

      {/* Link modal */}
      {linkDomainId && architecture && (
        <LinkModal
          domainId={linkDomainId}
          archId={architecture.id}
          tenant={tenant}
          onClose={() => setLinkDomainId(null)}
          onLinked={handleLinked}
        />
      )}
    </div>
  );
}
