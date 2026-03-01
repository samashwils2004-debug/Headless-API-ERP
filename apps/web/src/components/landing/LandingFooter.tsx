import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:grid-cols-4 sm:px-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">AdmitFlow</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Deterministic, event-native institutional workflow infrastructure.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-[var(--text-primary)]">Product</p>
          <Link className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)]" href="/console">
            Console
          </Link>
          <Link className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)]" href="/architecture">
            Architecture
          </Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-[var(--text-primary)]">Docs</p>
          <Link className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)]" href="/docs/introduction">
            Introduction
          </Link>
          <Link className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)]" href="/docs/security">
            Security
          </Link>
          <Link className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)]" href="/docs/api-reference">
            API Reference
          </Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-[var(--text-primary)]">Compliance</p>
          <p className="text-[var(--text-secondary)]">FERPA-ready workflows</p>
          <p className="text-[var(--text-secondary)]">Tenant-scoped runtime</p>
          <p className="text-[var(--text-secondary)]">Human-approved deploys</p>
        </div>
      </div>
      <div className="border-t border-[var(--border-default)] py-4 text-center text-xs text-[var(--text-muted)]">
        AdmitFlow Control Plane - 2026
      </div>
    </footer>
  );
}
