"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Editor from "@monaco-editor/react";

import { useWorkflowStore } from "@/lib/stores/workflow-store";

type Tab = "overview" | "definition" | "applications" | "history";

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const workflows = useWorkflowStore((state) => state.workflows);
  const workflow = workflows.find((item) => item.id === params.id);
  const [tab, setTab] = useState<Tab>("overview");

  const history = useMemo(() => {
    if (!workflow) {
      return [];
    }
    return workflows
      .filter((item) => item.name === workflow.name)
      .sort((a, b) => b.version - a.version);
  }, [workflow, workflows]);

  if (!workflow) {
    return (
      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
        Workflow not available in current project context.
      </div>
    );
  }

  const states = workflow.definition.states || {};
  const transitionCount = Object.values(states).reduce((sum, state) => sum + (state.transitions?.length || 0), 0);
  const terminalCount = Object.values(states).filter((state) => !state.transitions || state.transitions.length === 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{workflow.name}</h2>
          <p className="text-sm text-[var(--text-secondary)]">Version v{workflow.version}</p>
        </div>
        <Link
          href={`/console/workflows/${workflow.id}/edit`}
          className="rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-3 py-2 text-sm font-medium text-[var(--bg-primary)]"
        >
          Edit Workflow
        </Link>
      </div>

      <div className="flex gap-2 border-b border-[var(--border-default)]">
        {(["overview", "definition", "applications", "history"] as Tab[]).map((entry) => (
          <button
            key={entry}
            className={`-mb-px border-b px-3 py-2 text-sm ${
              tab === entry
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
            onClick={() => setTab(entry)}
          >
            {entry[0].toUpperCase() + entry.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            Initial state: {workflow.definition.initial_state || "n/a"}
          </div>
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            States: {Object.keys(states).length}
          </div>
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            Terminal states: {terminalCount}
          </div>
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            Transition count: {transitionCount}
          </div>
        </div>
      )}

      {tab === "definition" && (
        <div className="h-[560px] overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <Editor
            language="json"
            value={JSON.stringify(workflow.definition, null, 2)}
            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }}
          />
        </div>
      )}

      {tab === "applications" && (
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
          Applications for this workflow are available in the applications API and surfaced in the editor/runtime pages.
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <ul className="space-y-2 text-sm">
            {history.map((item) => (
              <li key={item.id} className="rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-2">
                {item.name} - v{item.version} - {item.deployed ? "deployed" : "draft"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
