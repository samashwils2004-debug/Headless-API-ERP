"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { toast } from "sonner";

import { hasBlockingValidationIssues } from "@/lib/enforcement/validationGuard";
import { listWorkflows, undeployWorkflow, updateWorkflow } from "@/lib/console-api";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useBlueprintStore } from "@/lib/stores/blueprint-store";
import { useWorkflowStore } from "@/lib/stores/workflow-store";
import type { WorkflowDefinition } from "@/types/contracts";

function localValidate(definition: Pick<WorkflowDefinition, "states" | "initial_state">) {
  const errors: string[] = [];
  const states = definition.states || {};
  const initial = definition.initial_state;

  if (!initial || !states[initial]) {
    errors.push("initial_state must exist in states");
  }
  let hasTerminal = false;
  for (const [stateName, stateDef] of Object.entries(states)) {
    if (!stateDef.transitions || stateDef.transitions.length === 0) {
      hasTerminal = true;
      continue;
    }
    for (const transition of stateDef.transitions) {
      if (!states[transition.to]) {
        errors.push(`undefined transition target from ${stateName} -> ${transition.to}`);
      }
    }
  }
  if (!hasTerminal) {
    errors.push("no terminal state detected");
  }
  return errors;
}

export default function WorkflowEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const context = useProjectContextStore((state) => state.context);
  const workflows = useWorkflowStore((state) => state.workflows);
  const setWorkflows = useWorkflowStore((state) => state.setWorkflows);
  const workflow = workflows.find((item) => item.id === params.id);
  const aiValidationResult = useBlueprintStore((state) => state.validationResult);
  const tenant = { institutionId: context.institutionId, projectId: context.projectId };

  const [workflowName, setWorkflowName] = useState("");
  const [definitionText, setDefinitionText] = useState("");
  const [saving, setSaving] = useState(false);
  const [undeploying, setUndeploying] = useState(false);

  useEffect(() => {
    if (workflow || !context.institutionId || !context.projectId) {
      return;
    }
    listWorkflows({ institutionId: context.institutionId, projectId: context.projectId })
      .then((data) => setWorkflows(data.workflows))
      .catch(() => {});
  }, [context.institutionId, context.projectId, setWorkflows, workflow]);

  useEffect(() => {
    if (!workflow) {
      return;
    }
    setWorkflowName(workflow.name);
    setDefinitionText(JSON.stringify(workflow.definition, null, 2));
  }, [workflow]);

  const parsedDefinition = useMemo<WorkflowDefinition | null>(() => {
    try {
      return definitionText.trim()
        ? (JSON.parse(definitionText) as WorkflowDefinition)
        : null;
    } catch {
      return null;
    }
  }, [definitionText]);

  const jsonError = useMemo(() => {
    try {
      if (!definitionText.trim()) {
        return "Workflow definition cannot be empty.";
      }
      JSON.parse(definitionText);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid JSON";
    }
  }, [definitionText]);

  const localErrors = useMemo(() => {
    if (!parsedDefinition) {
      return [];
    }
    return localValidate(parsedDefinition);
  }, [parsedDefinition]);

  const refreshWorkflows = async () => {
    const data = await listWorkflows(tenant);
    setWorkflows(data.workflows);
  };

  async function handleSave() {
    if (!workflow || !parsedDefinition || !workflowName.trim()) {
      return;
    }
    setSaving(true);
    try {
      await updateWorkflow(tenant, workflow.id, {
        name: workflowName.trim(),
        definition: parsedDefinition,
        is_ai_generated: workflow.is_ai_generated,
      });
      await refreshWorkflows();
      toast.success("Workflow updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleUndeploy() {
    if (!workflow) {
      return;
    }
    if (!confirm("Undeploy this workflow so you can edit or delete it?")) {
      return;
    }
    setUndeploying(true);
    try {
      await undeployWorkflow(tenant, workflow.id);
      await refreshWorkflows();
      toast.success("Workflow undeployed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Undeploy failed");
    } finally {
      setUndeploying(false);
    }
  }

  if (!workflow) {
    return (
      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
        Workflow not available in current project context.
      </div>
    );
  }

  if (workflow.deployed) {
    return (
      <div className="space-y-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <h2 className="text-xl font-semibold">Workflow Is Deployed</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Undeploy this workflow before making changes or deleting it.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className="w-fit rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] disabled:opacity-50"
            disabled={undeploying}
            onClick={handleUndeploy}
          >
            {undeploying ? "Undeploying..." : "Undeploy Workflow"}
          </button>
          <button
            className="w-fit rounded-md border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
            onClick={() => router.push("/console/workflows")}
          >
            Back to Workflows
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Workflow Editor</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Edit the current draft workflow and save changes in place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
            onClick={() => router.push("/console/workflows")}
          >
            Cancel
          </button>
          <button
            className="rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] disabled:opacity-50"
            disabled={saving || !!jsonError || !workflowName.trim()}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Workflow Name</label>
        <input
          className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          value={workflowName}
          onChange={(event) => setWorkflowName(event.target.value)}
          placeholder="Workflow name"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="h-[640px] overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <Editor
            language="json"
            value={definitionText}
            onChange={(value) => setDefinitionText(value ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              readOnly: false,
              suggestOnTriggerCharacters: false,
            }}
          />
        </div>

        <div className="space-y-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Validation Panel
          </h3>
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3 text-sm">
            <p>Stage 1: Schema validation</p>
            <p>Stage 2: Graph integrity</p>
            <p>Stage 3: Permission analysis</p>
            <p>Stage 4: Compliance</p>
          </div>
          {jsonError && (
            <p className="rounded-md border border-[#4a3517] bg-[#1f170e] p-3 text-sm text-[#fbbf24]">
              {jsonError}
            </p>
          )}
          {localErrors.length > 0 ? (
            <ul className="space-y-2 rounded-md border border-[#422] bg-[#1a1111] p-3 text-sm text-[#fda4af]">
              {localErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-[#1f3a2a] bg-[#0f1f15] p-3 text-sm text-[#86efac]">
              No local structural issues.
            </p>
          )}
          {hasBlockingValidationIssues(aiValidationResult) && (
            <p className="rounded-md border border-[#4a3517] bg-[#1f170e] p-3 text-xs text-[#fbbf24]">
              Deploy remains blocked until all 4 backend validation stages pass.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
