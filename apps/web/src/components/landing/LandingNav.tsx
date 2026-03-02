"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Github } from "lucide-react";

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
        <Link href="/" className="flex items-center gap-2 group">
          <svg
            width="28"
            height="28"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            {/* Center node */}
            <rect x="16" y="16" width="8" height="8" fill="white" className="transition-all duration-500 group-hover:scale-110" style={{ transformOrigin: '20px 20px' }} />
            {/* Top node */}
            <rect x="16" y="4" width="8" height="8" fill="white" opacity="0.7" className="transition-all duration-500 group-hover:translate-y-[-2px] group-hover:opacity-100" />
            {/* Right node */}
            <rect x="28" y="16" width="8" height="8" fill="white" opacity="0.7" className="transition-all duration-500 group-hover:translate-x-[2px] group-hover:opacity-100" />
            {/* Bottom node */}
            <rect x="16" y="28" width="8" height="8" fill="white" opacity="0.7" className="transition-all duration-500 group-hover:translate-y-[2px] group-hover:opacity-100" />
            {/* Left node */}
            <rect x="4" y="16" width="8" height="8" fill="white" opacity="0.7" className="transition-all duration-500 group-hover:translate-x-[-2px] group-hover:opacity-100" />

            {/* Connecting lines */}
            <line x1="20" y1="12" x2="20" y2="16" stroke="white" strokeWidth="1.5" opacity="0.4" className="transition-opacity duration-500 group-hover:opacity-70" />
            <line x1="24" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5" opacity="0.4" className="transition-opacity duration-500 group-hover:opacity-70" />
            <line x1="20" y1="24" x2="20" y2="28" stroke="white" strokeWidth="1.5" opacity="0.4" className="transition-opacity duration-500 group-hover:opacity-70" />
            <line x1="12" y1="20" x2="16" y2="20" stroke="white" strokeWidth="1.5" opacity="0.4" className="transition-opacity duration-500 group-hover:opacity-70" />
          </svg>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Orquestra</span>
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

        <div className="flex items-center gap-4">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hidden sm:block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <Github size={20} />
          </a>
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200 transition-colors"
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
