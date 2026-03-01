"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Product", href: "/#product" },
  { label: "Architecture", href: "/architecture" },
  { label: "Docs", href: "/docs/introduction" },
  { label: "Pricing", href: "/#pricing" },
];

function OrquestraIcon({ size = 28 }: { size?: number }) {
  const s = size;
  const c = s / 2;
  const sq = s * 0.18;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="16" width="8" height="8" fill="white" />
      <rect x="16" y="4" width="8" height="8" fill="white" opacity="0.7" />
      <rect x="28" y="16" width="8" height="8" fill="white" opacity="0.7" />
      <rect x="16" y="28" width="8" height="8" fill="white" opacity="0.7" />
      <rect x="4" y="16" width="8" height="8" fill="white" opacity="0.7" />
      <line x1="20" y1="12" x2="20" y2="16" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="24" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="20" y1="24" x2="20" y2="28" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="12" y1="20" x2="16" y2="20" stroke="white" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

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
        top: 0,
        borderColor: isScrolled ? "#25252b" : "transparent",
        background: isScrolled ? "rgba(15, 15, 18, 0.96)" : "rgba(15, 15, 18, 0.8)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <OrquestraIcon size={32} />
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: "#f4f4f5" }}>
              Orquestra
            </span>
            <span className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: "#71717a" }}>
              Institutional Runtime
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[14px] transition-colors"
              style={{ color: "#a1a1aa" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f4f4f5")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#a1a1aa")}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex items-center rounded px-3 py-1.5 text-sm border transition-colors"
            style={{ borderColor: "#25252b", color: "#a1a1aa", background: "transparent" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#f4f4f5";
              (e.currentTarget as HTMLElement).style.borderColor = "#3f3f46";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#a1a1aa";
              (e.currentTarget as HTMLElement).style.borderColor = "#25252b";
            }}
          >
            Sign In
          </Link>
          <Link
            href="/console"
            className="inline-flex items-center rounded px-4 py-1.5 text-sm font-semibold transition-all"
            style={{ background: "#3b82f6", color: "#ffffff" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#2563eb")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#3b82f6")}
          >
            Launch Console →
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((c) => !c)}
            className="grid h-8 w-8 place-items-center rounded border md:hidden"
            style={{ borderColor: "#25252b", color: "#a1a1aa" }}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t px-4 py-3 md:hidden" style={{ borderColor: "#25252b", background: "#141418" }}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm"
              style={{ color: "#a1a1aa" }}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="block py-2 text-sm" style={{ color: "#a1a1aa" }}>
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}
