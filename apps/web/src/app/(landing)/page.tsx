import Link from "next/link";

import { ArchitectureBoard } from "@/components/landing/ArchitectureBoard";
import { AiCompilerDemo } from "@/components/landing/AiCompilerDemo";
import { LandingFooter } from "@/components/landing/LandingFooter";

const ENTRY_SURFACES = [
  {
    title: "Developer Console",
    href: "/console",
    description: "Control plane for projects, workflows, AI compilation, validation, and deployment.",
  },
  {
    title: "Architecture",
    href: "/architecture",
    description: "Three-surface model and deterministic runtime architecture mapping.",
  },
  {
    title: "API Docs",
    href: "/docs/api-reference",
    description: "Headless API contracts, event schema, and deployment constraints.",
  },
];

const PRIMITIVES = [
  {
    title: "Workflow Engine",
    description:
      "Deterministic state machine executor with safe condition evaluation and immutable deployed versions.",
    snippet: `{"initial_state":"submitted","states":{"submitted":{"transitions":[{"to":"under_review"}]}}}`,
    href: "/docs/workflow-engine",
  },
  {
    title: "Schema Engine",
    description: "Strict Pydantic + JSON schema validation for applicants, applications, and blueprint structures.",
    snippet: `{"schema":{"valid":true,"errors":[]}}`,
    href: "/docs/tech-stack",
  },
  {
    title: "Event Engine",
    description: "Every transition persists domain events to PostgreSQL and streams through Redis and WebSocket.",
    snippet: `{"type":"application.accepted","version":"1","project_id":"proj_123"}`,
    href: "/docs/api-reference",
  },
  {
    title: "RBAC Engine",
    description: "Action-level permissions and project-scoped checks backed by database row-level security.",
    snippet: `check_permission("workflow:read")`,
    href: "/docs/security",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-[1200px] px-4 pb-16 pt-32 sm:px-6">
        <section className="relative overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-6 py-14 sm:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }}
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
              Programmable Institutional
              <br />
              Workflow Infrastructure
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-[var(--text-secondary)] sm:text-3xl/9">
              Define institutional logic as deterministic, versioned state machines. Deploy infrastructure, not admin
              dashboards.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/console"
                className="rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-5 py-2 text-sm font-semibold text-[var(--bg-primary)]"
              >
                Launch Console
              </Link>
              <Link
                href="/docs/introduction"
                className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-5 py-2 text-sm text-[var(--text-secondary)]"
              >
                View Docs
              </Link>
            </div>
            <div className="mx-auto mt-10 max-w-3xl rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-3 text-left text-lg text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">&gt;_</span> admitflow deploy blueprint.json --env=production
            </div>
          </div>
        </section>

        <section id="product" className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold">Entry Surfaces</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {ENTRY_SURFACES.map((surface) => (
              <article
                key={surface.title}
                className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
              >
                <p className="text-lg font-medium text-[var(--text-primary)]">{surface.title}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{surface.description}</p>
                <Link href={surface.href} className="mt-4 inline-block text-sm text-[var(--text-secondary)] underline">
                  Open
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="primitives" className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold">Infrastructure Primitives</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {PRIMITIVES.map((primitive) => (
              <article
                key={primitive.title}
                className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
              >
                <p className="text-lg font-medium text-[var(--text-primary)]">{primitive.title}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{primitive.description}</p>
                <pre className="mt-3 overflow-x-auto rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 text-xs text-[var(--text-secondary)]">
                  {primitive.snippet}
                </pre>
                <Link href={primitive.href} className="mt-3 inline-block text-sm text-[var(--text-secondary)] underline">
                  View docs
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <AiCompilerDemo />
        </section>

        <section className="mt-10">
          <ArchitectureBoard />
        </section>

        <section className="mt-10 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 text-center">
          <h3 className="text-2xl font-semibold text-[var(--text-primary)]">Build Infrastructure, Not Dashboards</h3>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-[var(--text-secondary)]">
            AdmitFlow is headless-first institutional workflow infrastructure with deterministic execution, event-native
            delivery, and human-approved AI compilation.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/console"
              className="rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)]"
            >
              Launch Console
            </Link>
            <Link
              href="/docs/introduction"
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-2 text-sm text-[var(--text-secondary)]"
            >
              Read Docs
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
