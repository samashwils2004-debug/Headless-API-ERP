"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DOC_NAV_GROUPS, resolveDoc } from "@/data/docs";

export function DocsFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const doc = resolveDoc(pathname);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-[var(--text-primary)]">
            AdmitFlow Docs
          </Link>

          <div className="hidden items-center gap-6 text-sm text-[var(--text-secondary)] md:flex">
            <Link href="/docs/introduction" className="hover:text-[var(--text-primary)]">
              Docs
            </Link>
            <Link href="/architecture" className="hover:text-[var(--text-primary)]">
              Architecture
            </Link>
            <Link href="/console" className="hover:text-[var(--text-primary)]">
              Launch Console
            </Link>
          </div>

          <input
            readOnly
            value="Search documentation..."
            className="hidden w-[260px] rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--text-muted)] md:block"
            aria-label="Search documentation"
          />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] pt-14">
        <aside className="sticky top-14 hidden h-[calc(100vh-56px)] w-[280px] shrink-0 overflow-y-auto border-r border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 md:block">
          {DOC_NAV_GROUPS.map((group) => (
            <section key={group.label} className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{group.label}</p>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href === "/docs/introduction" && pathname === "/docs");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block rounded-md border px-2.5 py-1.5 text-sm ${
                        active
                          ? "border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                          : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-primary)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </section>
          ))}
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 md:px-10">{children}</main>

        <aside className="sticky top-14 hidden h-[calc(100vh-56px)] w-[260px] shrink-0 overflow-y-auto border-l border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 xl:block">
          <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">On this page</p>
          <nav className="space-y-1 text-sm">
            {doc.sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                {section.title}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
