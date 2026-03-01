"use client";

import { useMemo, useState } from "react";

const SAMPLE_BLUEPRINT = {
  metadata: {
    name: "Undergraduate Admissions Runtime",
    description: "Generated blueprint for deterministic evaluation and manual review fallback.",
    compliance_tags: ["FERPA"],
  },
  workflows: {
    main: {
      version: "1.0.0",
      initial_state: "submitted",
      states: {
        submitted: {
          type: "initial",
          transitions: [
            { to: "auto_accepted", condition: "percentage >= 90", emit_event: "application.auto_accepted" },
            { to: "under_review", condition: "percentage < 90", emit_event: "application.under_review" },
          ],
        },
        under_review: {
          type: "intermediate",
          transitions: [
            { to: "accepted", condition: "manual_approval == true", emit_event: "application.accepted" },
            { to: "rejected", condition: "manual_approval == false", emit_event: "application.rejected" },
          ],
        },
        auto_accepted: { type: "terminal", transitions: [] },
        accepted: { type: "terminal", transitions: [] },
        rejected: { type: "terminal", transitions: [] },
      },
    },
  },
  roles: [
    { id: "reviewer", name: "Reviewer", permissions: ["application:read", "application:review"] },
    { id: "admin", name: "Institution Admin", permissions: ["workflow:read", "workflow:deploy"] },
  ],
};

export function AiCompilerDemo() {
  const [prompt, setPrompt] = useState(
    "Create a deterministic admissions workflow that auto-accepts high-score applicants and routes others to manual review."
  );
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledAt, setCompiledAt] = useState<string | null>(null);

  const preview = useMemo(() => {
    const blueprint = structuredClone(SAMPLE_BLUEPRINT);
    blueprint.metadata.description = prompt.slice(0, 160);
    return blueprint;
  }, [prompt]);

  const compile = async () => {
    setIsCompiling(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setCompiledAt(new Date().toISOString());
    setIsCompiling(false);
  };

  return (
    <section id="ai-demo" className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">AI Structural Compiler Preview</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Prompt to blueprint simulation. Runtime deployment still requires full backend validation and manual approval.
          </p>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="h-36 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
            maxLength={2000}
          />
          <button
            type="button"
            onClick={compile}
            disabled={isCompiling || !prompt.trim()}
            className="rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCompiling ? "Compiling..." : "Compile Blueprint"}
          </button>
          {compiledAt && <p className="text-xs text-[var(--text-muted)]">Last compiled: {compiledAt}</p>}
        </div>

        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
          {isCompiling ? (
            <div className="space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--bg-hover)]" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-[var(--bg-hover)]" />
              <div className="h-4 w-10/12 animate-pulse rounded bg-[var(--bg-hover)]" />
              <div className="h-36 w-full animate-pulse rounded bg-[var(--bg-hover)]" />
            </div>
          ) : (
            <pre className="max-h-[360px] overflow-auto text-xs leading-5 text-[var(--text-secondary)]">
              {JSON.stringify(preview, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </section>
  );
}
