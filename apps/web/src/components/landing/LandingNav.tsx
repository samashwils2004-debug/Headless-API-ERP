"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Product", href: "/#product" },
  { label: "Architecture", href: "/architecture" },
  { label: "Docs", href: "/docs/introduction" },
  { label: "Pricing", href: "/pricing" },
];

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 6);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed inset-x-0 z-50 border-b"
      style={{
        top: 40,
        borderColor: isScrolled ? "var(--border-default)" : "transparent",
        background: isScrolled ? "rgba(15, 15, 18, 0.94)" : "rgba(15, 15, 18, 0.8)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-sm font-semibold text-[var(--text-primary)]">
            AF
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">AdmitFlow</span>
          <span className="hidden text-sm text-[var(--text-muted)] sm:inline">Institutional Runtime</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[15px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/console"
            className="rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Sign In
          </Link>
          <Link
            href="/console"
            className="rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--bg-primary)]"
          >
            Launch Console
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] md:hidden"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
