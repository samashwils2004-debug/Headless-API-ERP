import Link from "next/link";

import { ArchitectureBoard } from "@/components/landing/ArchitectureBoard";
import { LandingFooter } from "@/components/landing/LandingFooter";

const SURFACES = [
  {
    title: "Surface 1 - Landing",
    items: ["Authority entry surface", "Routes to docs and console", "Signals infrastructure positioning"],
  },
  {
    title: "Surface 2 - Console",
    items: ["Workflow management", "AI compile and validation", "Manual deployment and event stream"],
  },
  {
    title: "Surface 3 - API + Runtime",
    items: ["FastAPI routes", "Deterministic engines", "PostgreSQL + Redis + WebSocket"],
  },
];

export default function ArchitecturePage() {
  return (
    <div className="bg-[var(--bg-primary)] pt-28 text-[var(--text-primary)]">
      <main className="mx-auto max-w-[1200px] space-y-8 px-4 pb-16 sm:px-6">
        <section className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
          <h1 className="text-3xl font-semibold">AdmitFlow Architecture</h1>
          <p className="mt-3 max-w-4xl text-sm text-[var(--text-secondary)]">
            Deterministic workflow infrastructure with strict multi-tenant boundaries, versioned deployments, and
            event-native propagation.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/docs/tech-stack"
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-secondary)]"
            >
              Technical Stack
            </Link>
            <Link
              href="/console"
              className="rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-3 py-1.5 text-sm font-medium text-[var(--bg-primary)]"
            >
              Open Console
            </Link>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {SURFACES.map((surface) => (
            <article
              key={surface.title}
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
            >
              <p className="text-base font-semibold">{surface.title}</p>
              <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
                {surface.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <ArchitectureBoard />

        <section className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
          <h2 className="text-xl font-semibold">Invariants</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
            <li>Deployed workflows remain immutable.</li>
            <li>Every transition emits a domain event.</li>
            <li>AI output must pass 4-stage validation before deploy.</li>
            <li>Institution and project scoping is enforced at every layer.</li>
            <li>No dynamic code execution in runtime or frontend.</li>
          </ul>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
