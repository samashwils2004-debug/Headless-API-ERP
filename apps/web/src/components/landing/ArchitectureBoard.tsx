import Link from "next/link";

const LAYERS = [
  {
    title: "Client Layer",
    items: ["Landing (orquestra.dev)", "Console (/console/*)", "Docs (/docs/*)"],
  },
  {
    title: "Application Layer",
    items: ["FastAPI Gateway", "Auth + RBAC", "Validation Pipeline"],
  },
  {
    title: "Service Layer",
    items: ["Workflow Engine", "Schema Engine", "Event Engine", "AI Compiler"],
  },
  {
    title: "Data Layer",
    items: ["PostgreSQL JSONB", "Redis Streams", "WebSocket Broadcast"],
  },
];

export function ArchitectureBoard() {
  return (
    <section id="architecture" className="space-y-4 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">Runtime Architecture</h3>
        <Link href="/architecture" className="text-sm text-[var(--text-secondary)] underline underline-offset-4">
          View architecture route
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {LAYERS.map((layer) => (
          <div key={layer.title} className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{layer.title}</p>
            <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
              {layer.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
