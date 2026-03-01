"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";

import { assertWorkflowEditable } from "@/lib/enforcement/immutabilityGuard";
import { hasBlockingValidationIssues } from "@/lib/enforcement/validationGuard";
import { useBlueprintStore } from "@/lib/stores/blueprint-store";
import { useWorkflowStore } from "@/lib/stores/workflow-store";

function localValidate(definition: { states?: Record<string, { transitions?: Array<{ to: string }> }>; initial_state?: string }) {
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
  const workflow = useWorkflowStore((state) => state.workflows.find((item) => item.id === params.id));
  const aiValidationResult = useBlueprintStore((state) => state.validationResult);

  const localErrors = useMemo(() => {
    if (!workflow) {
      return [];
    }
    return localValidate(workflow.definition);
  }, [workflow]);

  if (!workflow) {
    return (
      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
        Workflow not available in current project context.
      </div>
    );
  }

  try {
    assertWorkflowEditable(workflow);
  } catch {
    return (
      <div className="space-y-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <h2 className="text-xl font-semibold">Workflow Is Deployed</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Deployed workflows are immutable. Create a new draft version to continue.
        </p>
        <button
          className="w-fit rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)]"
          onClick={() => router.push(`/console/workflows/${workflow.id}?createNewVersion=true`)}
        >
          Open Versioned Draft Flow
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Workflow Editor</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Split view with Monaco editor and validation panel. Backend validation remains authoritative.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="h-[640px] overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <Editor
            language="json"
            value={JSON.stringify(workflow.definition, null, 2)}
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
