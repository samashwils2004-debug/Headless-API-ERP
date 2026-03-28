// calls /api/ai/compile to generate blueprints, etc
// calls getCsrfToken() manually from the cookie for ts direct fetch calls
// connects to /api/ai/compile (same endpoint as console-api.ts)

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Wand2,
  GitBranch,
  Clock,
  Link2,
  Cpu,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Key,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getOrCreateArchitecture,
  applyArchitectPrompt,
  getAvailableWorkflows,
  getArchitectureVersions,
  compileArchitecture,
  linkWorkflowToDomain,
  type ArchitectureItem,
  type ArchitectureVersionItem,
} from "@/lib/console-api";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { COMPLIANCE_OPTIONS } from "@/lib/constants";

const cardStyle = { background: "#141418", borderColor: "#25252b" };

const DOMAIN_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#14b8a6",
];

type DomainDef = {
  id: string;
  label: string;
  color?: string | null;
  icon?: string;
  modules?: Array<{ id: string; label: string }>;
  requires_workflow?: boolean;
  workflow_id?: string | null;
  workflow_name?: string | null;
};

type AvailableWorkflow = {
  id: string;
  name: string;
  version: number;
  is_linked: boolean;
  is_ai_generated: boolean;
};

type CompileResult = {
  api_key: string;
  api_key_prefix: string;
  webhook_secret: string;
  webhook_secret_prefix: string;
  version_number: number;
  message: string;
};

export default function ArchitectPage() {
  const context = useProjectContextStore((state) => state.context);
  const [arch, setArch] = useState<ArchitectureItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [applying, setApplying] = useState(false);
  const [lastDiff, setLastDiff] = useState<string | null>(null);
  const [versions, setVersions] = useState<ArchitectureVersionItem[]>([]);
  const [availableWorkflows, setAvailableWorkflows] = useState<AvailableWorkflow[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [linkingDomainId, setLinkingDomainId] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<string[]>([]);
  const [keyName, setKeyName] = useState("Default API Key");
  const [complianceTags, setComplianceTags] = useState<string[]>([]);

  const tenant = { institutionId: context.institutionId, projectId: context.projectId };
  const noProject = !context.institutionId || !context.projectId;

  const loadArch = useCallback(async () => {
    if (noProject) return;
    setLoading(true);
    try {
      const a = await getOrCreateArchitecture(tenant);
      setArch(a);
      const [versionsData, workflowsData] = await Promise.all([
        getArchitectureVersions(tenant, a.id),
        getAvailableWorkflows(tenant, a.id),
      ]);
      setVersions(versionsData.versions);
      setAvailableWorkflows(workflowsData.workflows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load architecture");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.institutionId, context.projectId]);

  useEffect(() => {
    loadArch();
  }, [loadArch]);

  async function handleApplyPrompt() {
    if (!prompt.trim() || !arch) return;
    setApplying(true);
    try {
      const finalPrompt = complianceTags.length > 0
        ? `${prompt} [Compliance: ${complianceTags.join(", ")}]`
        : prompt;
      const res = await applyArchitectPrompt(tenant, arch.id, finalPrompt);

      if (res.type === "redirect") {
        toast.info(res.message || "Redirecting to workflow builder");
        return;
      }
      if (res.type === "compile_prompt") {
        toast.info(res.message || "Use the Compile button to issue a versioned API key");
        return;
      }

      // type === "success"
      setArch((prev) => prev ? { ...prev, graph_json: res.graph, version: res.version } : prev);
      if (res.diff?.summary) setLastDiff(res.diff.summary);
      setPrompt("");

      const [versionsData, workflowsData] = await Promise.all([
        getArchitectureVersions(tenant, arch.id),
        getAvailableWorkflows(tenant, arch.id),
      ]);
      setVersions(versionsData.versions);
      setAvailableWorkflows(workflowsData.workflows);
      toast.success("Architecture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply prompt");
    } finally {
      setApplying(false);
    }
  }

  async function handleLinkWorkflow(domainId: string, workflowId: string, workflowName: string) {
    if (!arch) return;
    try {
      await linkWorkflowToDomain(tenant, arch.id, { domain_id: domainId, workflow_id: workflowId, workflow_name: workflowName });
      setLinkingDomainId(null);
      await loadArch();
      toast.success(`Linked "${workflowName}" to domain`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link workflow");
    }
  }

  async function handleCompile() {
    if (!arch || selectedWorkflowIds.length === 0) {
      toast.error("Select at least one workflow to compile");
      return;
    }
    setCompiling(true);
    try {
      const res = await compileArchitecture(tenant, arch.id, {
        workflow_ids: selectedWorkflowIds,
        key_name: keyName,
      });
      setCompileResult(res);
      toast.success(`Architecture v${res.version_number} compiled`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Compile failed");
    } finally {
      setCompiling(false);
    }
  }

  const erpSystem = (arch?.graph_json as { erp_system?: { domains?: DomainDef[] } } | undefined)?.erp_system;
  const domains: DomainDef[] = erpSystem?.domains ?? [];

  if (noProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: "#52525b" }}>Select a project to use the Architect.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin" style={{ color: "#3b82f6" }} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 size={22} style={{ color: "#3b82f6" }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f4f4f5" }}>Architect</h1>
          <p className="text-sm" style={{ color: "#8a8a94" }}>
            ERP domain graph — compose your institutional infrastructure
          </p>
        </div>
        <span className="ml-2 text-xs px-2 py-0.5 rounded border" style={{ borderColor: "#3b82f630", background: "#3b82f610", color: "#60a5fa" }}>
          IAL
        </span>
        {arch && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded border" style={{ borderColor: "#25252b", color: "#71717a" }}>
            v{arch.version}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: domain graph + prompt */}
        <div className="space-y-4">
          {/* NLP Prompt Bar */}
          <div className="rounded-lg border p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Wand2 size={14} style={{ color: "#8b5cf6" }} />
              <h3 className="text-sm font-medium" style={{ color: "#f4f4f5" }}>Describe Changes</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !applying && handleApplyPrompt()}
                placeholder='e.g. "Add admissions and financial aid domains"'
                className="flex-1 rounded px-3 py-2 text-sm outline-none"
                style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#f4f4f5" }}
              />
              <button
                onClick={handleApplyPrompt}
                disabled={applying || !prompt.trim()}
                className="flex items-center gap-1.5 rounded px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                {applying ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                {applying ? "Applying…" : "Apply"}
              </button>
            </div>
            {lastDiff && (
              <p className="mt-2 text-xs" style={{ color: "#4ade80" }}>
                ✓ {lastDiff}
              </p>
            )}
            {/* Compliance context */}
            <div className="mt-3">
              <p className="text-xs mb-1.5" style={{ color: "#52525b" }}>Compliance context (optional)</p>
              <div className="flex flex-wrap gap-1.5">
                {COMPLIANCE_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setComplianceTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                    className="px-1.5 py-0.5 rounded text-[10px] border transition-colors"
                    style={
                      complianceTags.includes(tag)
                        ? { background: "#1e3a5f", borderColor: "#3b82f6", color: "#60a5fa" }
                        : { background: "transparent", borderColor: "#25252b", color: "#52525b" }
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Domain Graph */}
          <div className="rounded-lg border p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium" style={{ color: "#f4f4f5" }}>ERP Domains</h3>
              <span className="text-xs" style={{ color: "#52525b" }}>{domains.length} domain{domains.length !== 1 ? "s" : ""}</span>
            </div>

            {domains.length === 0 ? (
              <div className="text-center py-12" style={{ color: "#52525b" }}>
                <Building2 size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No domains yet.</p>
                <p className="text-xs mt-1">Describe your institutional ERP above to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {domains.map((domain, idx) => {
                  const color = domain.color || DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
                  return (
                    <div
                      key={domain.id}
                      className="rounded-lg border p-4"
                      style={{ background: "#1b1b24", borderColor: "#25252b" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-sm font-medium truncate" style={{ color: "#f4f4f5" }}>
                            {domain.label}
                          </span>
                        </div>
                        {domain.requires_workflow !== false && (
                          <button
                            onClick={() => setLinkingDomainId(linkingDomainId === domain.id ? null : domain.id)}
                            className="shrink-0 flex items-center gap-1 rounded px-2 py-0.5 text-xs border transition-colors"
                            style={
                              domain.workflow_id
                                ? { borderColor: "#16a34a40", color: "#4ade80", background: "#0a1a0a" }
                                : { borderColor: "#25252b", color: "#71717a", background: "transparent" }
                            }
                          >
                            <Link2 size={10} />
                            {domain.workflow_id ? "linked" : "link"}
                          </button>
                        )}
                      </div>

                      {domain.workflow_name && (
                        <p className="mt-1.5 text-xs truncate" style={{ color: "#4ade80" }}>
                          → {domain.workflow_name}
                        </p>
                      )}

                      {domain.modules && domain.modules.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {domain.modules.slice(0, 3).map((m) => (
                            <span key={m.id} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#0f0f12", color: "#71717a" }}>
                              {m.label}
                            </span>
                          ))}
                          {domain.modules.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: "#52525b" }}>
                              +{domain.modules.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Workflow linker dropdown */}
                      {linkingDomainId === domain.id && (
                        <div className="mt-3 pt-3 border-t space-y-1" style={{ borderColor: "#25252b" }}>
                          {availableWorkflows.length === 0 ? (
                            <p className="text-xs" style={{ color: "#52525b" }}>No deployed workflows yet</p>
                          ) : (
                            availableWorkflows.map((wf) => (
                              <button
                                key={wf.id}
                                onClick={() => handleLinkWorkflow(domain.id, wf.id, wf.name)}
                                className="w-full text-left flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-[#0f0f12]"
                                style={{ color: "#a1a1aa" }}
                              >
                                <GitBranch size={10} style={{ color: "#3b82f6", flexShrink: 0 }} />
                                {wf.name}
                                <span className="ml-auto" style={{ color: "#52525b" }}>v{wf.version}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar: compile + versions */}
        <div className="space-y-4">
          {/* Compile Panel */}
          {!compileResult ? (
            <div className="rounded-lg border p-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <Cpu size={14} style={{ color: "#3b82f6" }} />
                <h3 className="text-sm font-medium" style={{ color: "#f4f4f5" }}>Compile Architecture</h3>
              </div>

              <div className="mb-3">
                <label className="block text-xs mb-1.5" style={{ color: "#8a8a94" }}>Key Name</label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full rounded px-3 py-2 text-sm outline-none"
                  style={{ background: "#0f0f12", border: "1px solid #25252b", color: "#f4f4f5" }}
                />
              </div>

              <div className="mb-3">
                <label className="block text-xs mb-1.5" style={{ color: "#8a8a94" }}>
                  Select Workflows ({selectedWorkflowIds.length} selected)
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableWorkflows.length === 0 ? (
                    <div className="py-3 text-center">
                      <p className="text-xs mb-2" style={{ color: "#52525b" }}>No deployed workflows yet</p>
                      <a href="/console/workflows" className="text-xs underline" style={{ color: "#3b82f6" }}>
                        Build & deploy a workflow first →
                      </a>
                    </div>
                  ) : (
                    availableWorkflows.map((wf) => (
                      <label key={wf.id} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-[#1b1b24]">
                        <input
                          type="checkbox"
                          checked={selectedWorkflowIds.includes(wf.id)}
                          onChange={(e) =>
                            setSelectedWorkflowIds((prev) =>
                              e.target.checked ? [...prev, wf.id] : prev.filter((id) => id !== wf.id)
                            )
                          }
                          className="rounded"
                        />
                        <GitBranch size={10} style={{ color: "#3b82f6", flexShrink: 0 }} />
                        <span className="text-xs truncate flex-1" style={{ color: "#a1a1aa" }}>{wf.name}</span>
                        <span className="text-[10px] px-1 py-0.5 rounded shrink-0" style={{ background: "#0a1a0a", color: "#4ade80" }}>v{wf.version} ✓</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={handleCompile}
                disabled={compiling || selectedWorkflowIds.length === 0 || domains.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                {compiling ? <Loader2 size={13} className="animate-spin" /> : <Cpu size={13} />}
                {compiling ? "Compiling…" : "Compile & Issue Key"}
              </button>
              {domains.length === 0 && (
                <p className="text-xs mt-2 text-center" style={{ color: "#52525b" }}>Add domains first</p>
              )}
            </div>
          ) : (
            /* API Key result */
            <div className="rounded-lg border p-4" style={{ ...cardStyle, borderColor: "#16a34a40" }}>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={14} style={{ color: "#4ade80" }} />
                <h3 className="text-sm font-medium" style={{ color: "#f4f4f5" }}>Compiled v{compileResult.version_number}</h3>
              </div>
              <p className="text-xs mb-4" style={{ color: "#52525b" }}>
                Store these credentials securely — they will not be shown again.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "#52525b" }}>API Key</label>
                  <div className="rounded px-3 py-2 font-mono text-xs break-all" style={{ background: "#0f0f12", color: "#4ade80" }}>
                    {compileResult.api_key}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: "#52525b" }}>Webhook Secret</label>
                  <div className="rounded px-3 py-2 font-mono text-xs break-all" style={{ background: "#0f0f12", color: "#a78bfa" }}>
                    {compileResult.webhook_secret}
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setCompileResult(null); setSelectedWorkflowIds([]); }}
                className="mt-4 w-full rounded px-3 py-2 text-xs border transition-colors hover:bg-[#1b1b24]"
                style={{ borderColor: "#25252b", color: "#71717a" }}
              >
                Compile another version
              </button>
            </div>
          )}

          {/* Version History */}
          <div className="rounded-lg border p-4" style={cardStyle}>
            <button
              onClick={() => setShowVersions((v) => !v)}
              className="w-full flex items-center gap-2 mb-2"
            >
              <Clock size={13} style={{ color: "#71717a" }} />
              <h3 className="text-sm font-medium" style={{ color: "#f4f4f5" }}>Version History</h3>
              <span className="ml-auto text-xs" style={{ color: "#52525b" }}>{versions.length}</span>
              {showVersions ? <ChevronDown size={13} style={{ color: "#71717a" }} /> : <ChevronRight size={13} style={{ color: "#71717a" }} />}
            </button>

            {showVersions && (
              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                {versions.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "#52525b" }}>No versions yet</p>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="rounded p-2.5 border" style={{ background: "#1b1b24", borderColor: "#25252b" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: "#f4f4f5" }}>v{v.version}</span>
                        <span className="text-[10px]" style={{ color: "#52525b" }}>
                          {new Date(v.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[10px] truncate" style={{ color: "#71717a" }}>{v.prompt}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Deployed Workflows panel */}
          <div className="rounded-lg border p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <GitBranch size={14} style={{ color: "#3b82f6" }} />
              <h3 className="text-sm font-medium" style={{ color: "#f4f4f5" }}>Deployed Workflows</h3>
              <span className="ml-auto text-xs" style={{ color: "#52525b" }}>{availableWorkflows.length}</span>
              <button onClick={loadArch} title="Refresh" className="opacity-50 hover:opacity-100 transition-opacity">
                <RefreshCw size={12} style={{ color: "#71717a" }} />
              </button>
            </div>
            {availableWorkflows.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-xs mb-2" style={{ color: "#52525b" }}>No deployed workflows</p>
                <a href="/console/workflows/new" className="text-xs underline" style={{ color: "#3b82f6" }}>
                  Build a workflow →
                </a>
              </div>
            ) : (
              <div className="space-y-1.5">
                {availableWorkflows.map((wf) => (
                  <div key={wf.id} className="flex items-center gap-2 rounded px-2 py-1.5" style={{ background: "#1b1b24" }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#4ade80" }} />
                    <span className="text-xs flex-1 truncate" style={{ color: "#a1a1aa" }}>{wf.name}</span>
                    <span className="text-[10px]" style={{ color: "#52525b" }}>v{wf.version}</span>
                    {wf.is_ai_generated && (
                      <span className="text-[10px] px-1 rounded" style={{ background: "#1e1030", color: "#c084fc" }}>AI</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* API Keys link */}
          <a
            href="/console/api-keys"
            className="flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-[#1b1b24]"
            style={{ ...cardStyle }}
          >
            <Key size={14} style={{ color: "#71717a" }} />
            <span style={{ color: "#a1a1aa" }}>View all API Keys</span>
            <ChevronRight size={13} className="ml-auto" style={{ color: "#52525b" }} />
          </a>
        </div>
      </div>
    </div>
  );
}
