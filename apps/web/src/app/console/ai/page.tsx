"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";

import { compileBlueprint, deployBlueprint, listWorkflows } from "@/lib/console-api";
import { guardedDeploy } from "@/lib/enforcement/deploymentGuard";
import { assertDeployAllowed, hasBlockingValidationIssues } from "@/lib/enforcement/validationGuard";
import { useBlueprintStore } from "@/lib/stores/blueprint-store";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import type { InstitutionalBlueprint, ValidationResult, WorkflowDefinition } from "@/types/contracts";

type Tab = "overview" | "graph" | "json" | "validation" | "roles";

function coerceWorkflowDefinition(
  blueprint: InstitutionalBlueprint | Record<string, unknown> | null
): WorkflowDefinition | null {
  if (!blueprint) {
    return null;
  }

  const candidate = blueprint as {
    workflows?: { main?: WorkflowDefinition };
    workflow?: WorkflowDefinition;
  };

  if (candidate.workflows?.main) {
    return candidate.workflows.main;
  }
  if (candidate.workflow) {
    return candidate.workflow;
  }
  return null;
}

function renderGraph(workflowDefinition: WorkflowDefinition | null) {
  const states = workflowDefinition?.states || {};
  const keys = Object.keys(states);

  return (
    <svg
      viewBox="0 0 900 240"
      className="h-72 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)]"
    >
      <rect x="0" y="0" width="900" height="240" fill="#141418" />
      {keys.map((state, index) => {
        const x = 90 + index * 180;
        const y = 120;
        const transitions = states[state]?.transitions || [];
        return (
          <g key={state}>
            <circle
              cx={x}
              cy={y}
              r="42"
              fill={index === 0 ? "#2563eb" : transitions.length === 0 ? "#16a34a" : "#52525b"}
            />
            <text x={x} y={y + 5} textAnchor="middle" fill="#f4f4f5" fontSize="11">
              {state}
            </text>
            {transitions.map((transition, tIndex) => {
              const targetIdx = keys.indexOf(transition.to);
              if (targetIdx < 0) {
                return null;
              }
              const tx = 90 + targetIdx * 180;
              return (
                <line
                  key={`${state}-${transition.to}-${tIndex}`}
                  x1={x + 42}
                  y1={y}
                  x2={tx - 42}
                  y2={y}
                  stroke="#71717a"
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                />
              );
            })}
          </g>
        );
      })}
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#71717a" />
        </marker>
      </defs>
    </svg>
  );
}

export default function AIGeneratorPage() {
  const router = useRouter();
  const context = useProjectContextStore((state) => state.context);
  const setWorkflows = useWorkflowStore((state) => state.setWorkflows);
  const blueprint = useBlueprintStore((state) => state.proposal);
  const validation = useBlueprintStore((state) => state.validationResult);
  const setProposal = useBlueprintStore((state) => state.setProposal);
  const clearProposal = useBlueprintStore((state) => state.clear);

  const [prompt, setPrompt] = useState("");
  const [institutionType, setInstitutionType] = useState("University");
  const [institutionSize, setInstitutionSize] = useState("Large");
  const [compliance, setCompliance] = useState("ferpa");
  const [tab, setTab] = useState<Tab>("overview");
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blockedDeploy = useMemo(() => {
    return hasBlockingValidationIssues(validation);
  }, [validation]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await compileBlueprint(
        { institutionId: context.institutionId, projectId: context.projectId },
        {
          prompt,
          institution_context: {
            type: institutionType,
            size: institutionSize,
            compliance,
          },
        }
      );
      setProposal(payload.blueprint || null, (payload.validation_result as ValidationResult | null) || null);
      setProposalId(payload.id || null);
      setTab("overview");
    } catch (compileError) {
      setError(compileError instanceof Error ? compileError.message : "Compilation failed.");
    } finally {
      setLoading(false);
    }
  };

  const deploy = async () => {
    if (!proposalId) {
      return;
    }
    setDeploying(true);
    setError(null);
    try {
      assertDeployAllowed(validation);
      await guardedDeploy(async () => {
        await deployBlueprint({ institutionId: context.institutionId, projectId: context.projectId }, proposalId);
      });
      const workflowPayload = await listWorkflows({
        institutionId: context.institutionId,
        projectId: context.projectId,
      });
      setWorkflows(workflowPayload.workflows);
      const newestWorkflow = [...workflowPayload.workflows].sort((a, b) => b.version - a.version)[0];
      clearProposal();
      setProposalId(null);
      setShowConfirm(false);
      if (newestWorkflow) {
        router.push(`/console/workflows/${newestWorkflow.id}`);
      }
    } catch (deployError) {
      setError(deployError instanceof Error ? deployError.message : "Deployment failed.");
    } finally {
      setDeploying(false);
    }
  };

  const workflowDefinition = useMemo(() => coerceWorkflowDefinition(blueprint), [blueprint]);

  const roles = (
    ((blueprint as InstitutionalBlueprint | null)?.roles as Array<{ name: string; permissions: string[] }> | undefined) || []
  ).map((role) => ({
    ...role,
    warning: role.permissions.includes("workflow:deploy") && !role.permissions.includes("project:write"),
  }));

  const stageRows = [
    { label: "Schema Validation", valid: validation?.schema.valid ?? false },
    {
      label: "Graph Integrity",
      valid:
        validation?.graph.valid === true &&
        !validation.graph.has_cycles &&
        validation.graph.unreachable_states.length === 0 &&
        validation.graph.terminal_states.length > 0,
    },
    { label: "Permissions Analysis", valid: validation?.permissions.valid ?? false },
    { label: "Compliance Check", valid: validation?.compliance.compliant ?? false },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">AI Blueprint Generator</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Prompt -&gt; Compile -&gt; Validate -&gt; Manual Deploy. No auto deployment.
          </p>
        </div>
        <span className="rounded-md border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
          Project Context Required
        </span>
      </div>

      <div className="grid gap-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <textarea
          className="h-40 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={2000}
          placeholder="Describe the institutional workflow to compile..."
        />
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
            value={institutionType}
            onChange={(e) => setInstitutionType(e.target.value)}
            placeholder="Institution type"
          />
          <input
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
            value={institutionSize}
            onChange={(e) => setInstitutionSize(e.target.value)}
            placeholder="Institution size"
          />
          <input
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
            value={compliance}
            onChange={(e) => setCompliance(e.target.value)}
            placeholder="Compliance tags"
          />
        </div>
        <button
          onClick={generate}
          disabled={!prompt.trim() || loading || !context.projectId || !context.institutionId}
          className="w-fit rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Blueprint"}
        </button>
        {error && (
          <p className="rounded-md border border-[#422] bg-[#1a1111] px-3 py-2 text-sm text-[#fda4af]">{error}</p>
        )}
      </div>

      {loading && (
        <div className="space-y-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <div className="h-6 w-48 animate-pulse rounded bg-[var(--bg-hover)]" />
          <div className="h-64 w-full animate-pulse rounded bg-[var(--bg-hover)]" />
          <div className="h-10 w-full animate-pulse rounded bg-[var(--bg-hover)]" />
        </div>
      )}

      {blueprint && (
        <div className="space-y-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <div className="flex flex-wrap border-b border-[var(--border-default)]">
            {(["overview", "graph", "json", "validation", "roles"] as Tab[]).map((entry) => (
              <button
                key={entry}
                onClick={() => setTab(entry)}
                className={`-mb-px border-b px-3 py-2 text-sm ${
                  tab === entry
                    ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {entry === "json" ? "JSON" : entry[0].toUpperCase() + entry.slice(1)}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="grid gap-3 md:grid-cols-4 text-sm">
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
                States: {Object.keys(workflowDefinition?.states || {}).length}
              </div>
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
                Roles: {roles.length}
              </div>
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
                Events: {(((blueprint as InstitutionalBlueprint | null)?.events as unknown[]) || []).length}
              </div>
              <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
                Compliance:{" "}
                {((blueprint as InstitutionalBlueprint | null)?.metadata?.compliance_tags || []).join(", ") || "n/a"}
              </div>
            </div>
          )}

          {tab === "graph" && renderGraph(workflowDefinition)}
          {tab === "json" && (
            <div className="h-[540px] overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]">
              <Editor
                language="json"
                value={JSON.stringify(blueprint, null, 2)}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }}
              />
            </div>
          )}
          {tab === "validation" && (
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                {stageRows.map((row) => (
                  <div
                    key={row.label}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      row.valid
                        ? "border-[#1f3a2a] bg-[#0f1f15] text-[#86efac]"
                        : "border-[#422] bg-[#1a1111] text-[#fda4af]"
                    }`}
                  >
                    {row.label}: {row.valid ? "Valid" : "Invalid"}
                  </div>
                ))}
              </div>
              <pre className="max-h-[340px] overflow-auto rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 text-xs text-[var(--text-secondary)]">
                {JSON.stringify(validation, null, 2)}
              </pre>
            </div>
          )}

          {tab === "roles" && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-[var(--border-default)] py-2">Role</th>
                  <th className="border-b border-[var(--border-default)] py-2">Permissions</th>
                  <th className="border-b border-[var(--border-default)] py-2">Warnings</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.name} className="border-t border-[var(--border-default)]">
                    <td className="py-2">{role.name}</td>
                    <td className="py-2">{role.permissions.join(", ")}</td>
                    <td className="py-2">
                      {role.warning ? (
                        <span className="rounded-md border border-[#4a3517] bg-[#1f170e] px-2 py-1 text-[#fbbf24]">
                          Conflict risk
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={blockedDeploy || deploying}
              className="rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Deploy Blueprint
            </button>
            <button
              onClick={clearProposal}
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              Deploy blocked while any validation stage is invalid.
            </span>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Deploy Blueprint</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              This creates workflow, roles, and event definitions. Backend re-validates before persist.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-2 text-sm"
              >
                Close
              </button>
              <button
                onClick={deploy}
                disabled={deploying || blockedDeploy}
                className="rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deploying ? "Deploying..." : "Confirm Deploy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
