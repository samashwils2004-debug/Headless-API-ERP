import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-primary)] px-4 text-[var(--text-primary)]">
      <div className="w-full max-w-md rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 text-center">
        <p className="text-sm text-[var(--text-secondary)]">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Route not found</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          This surface does not exist in the current Orquestra architecture.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link
            href="/"
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-secondary)]"
          >
            Landing
          </Link>
          <Link
            href="/console"
            className="rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-3 py-1.5 text-sm font-medium text-[var(--bg-primary)]"
          >
            Console
          </Link>
        </div>
      </div>
    </main>
  );
}
