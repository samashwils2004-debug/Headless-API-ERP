"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Layers,
  GitBranch,
  Radio,
  KeyRound,
  Settings,
  ChevronDown,
  PenTool,
  Menu,
  X,
} from "lucide-react";

import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useProjectStore } from "@/lib/stores/project-store";
import { useAuthStore } from "@/lib/stores/auth-store";

const NAV = [
  { href: "/console", label: "Dashboard", icon: LayoutDashboard },
  { href: "/console/projects", label: "Projects", icon: FolderKanban },
  { href: "/console/templates", label: "Templates", icon: Layers },
  { href: "/console/workflows", label: "Workflows", icon: GitBranch },
  { href: "/console/architect", label: "Architect", icon: PenTool },
  { href: "/console/events", label: "Event Stream", icon: Radio },
  { href: "/console/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/console/settings", label: "Settings", icon: Settings },
];

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const context = useProjectContextStore((s) => s.context);
  const setContext = useProjectContextStore((s) => s.setContext);
  const projects = useProjectStore((s) => s.projects);
  const user = useAuthStore((s) => s.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "#0f0f12", color: "#f4f4f5" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed off-screen on mobile, normal flow on md+ */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-auto w-[260px] flex-none flex flex-col transition-transform duration-200 md:transition-none md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#141418", borderRight: "1px solid #25252b" }}
      >
        {/* Logo row with close button on mobile */}
        <div className="flex items-center h-[60px] shrink-0" style={{ borderBottom: "1px solid #25252b" }}>
          <Link
            href="/"
            className="group flex items-center gap-3 px-5 flex-1 h-full hover:bg-[#1e1e24] transition-colors"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
            >
              <rect x="16" y="16" width="8" height="8" fill="white" className="transition-all duration-500 group-hover:scale-110" style={{ transformOrigin: "20px 20px" }} />
              <rect x="16" y="4" width="8" height="8" fill="white" opacity="0.7" className="transition-all duration-500 group-hover:translate-y-[-2px] group-hover:opacity-100" />
              <rect x="28" y="16" width="8" height="8" fill="white" opacity="0.7" className="transition-all duration-500 group-hover:translate-x-[2px] group-hover:opacity-100" />
              <rect x="16" y="28" width="8" height="8" fill="white" opacity="0.7" className="transition-all duration-500 group-hover:translate-y-[2px] group-hover:opacity-100" />
              <rect x="4" y="16" width="8" height="8" fill="white" opacity="0.7" className="transition-all duration-500 group-hover:translate-x-[-2px] group-hover:opacity-100" />
              <line x1="20" y1="12" x2="20" y2="16" stroke="white" strokeWidth="1.5" opacity="0.4" className="transition-opacity duration-500 group-hover:opacity-70" />
              <line x1="24" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5" opacity="0.4" className="transition-opacity duration-500 group-hover:opacity-70" />
              <line x1="20" y1="24" x2="20" y2="28" stroke="white" strokeWidth="1.5" opacity="0.4" className="transition-opacity duration-500 group-hover:opacity-70" />
              <line x1="12" y1="20" x2="16" y2="20" stroke="white" strokeWidth="1.5" opacity="0.4" className="transition-opacity duration-500 group-hover:opacity-70" />
            </svg>
            <div>
              <span className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>Orquestra</span>
              <span className="text-[10px] tracking-widest uppercase block leading-none mt-0.5" style={{ color: "#71717a" }}>
                Infrastructure
              </span>
            </div>
          </Link>
          {/* Close button — mobile only */}
          <button
            className="md:hidden px-4 h-full flex items-center"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            style={{ color: "#71717a" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/console" && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className="group flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors"
                style={
                  active
                    ? { background: "#1e1e24", color: "#f4f4f5" }
                    : { color: "#a1a1aa" }
                }
              >
                <Icon
                  size={15}
                  style={active ? { color: "#e4e4e7" } : { color: "#71717a" }}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom env badge */}
        <div
          className="px-4 py-3 text-xs shrink-0"
          style={{ borderTop: "1px solid #25252b", color: "#71717a" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "#16a34a" }}
            />
            {context.environment ?? "test"}
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Context Bar */}
        <header
          className="flex items-center justify-between px-3 sm:px-6 h-[60px] shrink-0 gap-2"
          style={{ background: "#141418", borderBottom: "1px solid #25252b" }}
        >
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden shrink-0 p-1.5 rounded hover:bg-[#1e1e24] transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            style={{ color: "#71717a" }}
          >
            <Menu size={20} />
          </button>

          {/* Left side — context info */}
          <div className="flex items-center gap-2 sm:gap-4 text-sm min-w-0 flex-1">
            <span className="hidden lg:inline truncate" style={{ color: "#71717a" }}>
              <span>Institution: </span>
              <span style={{ color: "#f4f4f5" }} className="font-medium">
                {context.institutionId || "Not selected"}
              </span>
            </span>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="hidden sm:inline shrink-0" style={{ color: "#71717a" }}>Project:</span>
              <div className="relative min-w-0">
                <select
                  className="appearance-none pl-2 pr-6 py-1 rounded text-sm font-medium cursor-pointer max-w-[140px] sm:max-w-[200px] lg:max-w-none"
                  style={{
                    background: "#1e1e24",
                    border: "1px solid #25252b",
                    color: "#f4f4f5",
                    outline: "none",
                  }}
                  value={context.projectId}
                  onChange={(e) => {
                    const sel = projects.find((p) => p.id === e.target.value);
                    if (!sel) return;
                    setContext({
                      institutionId: sel.institution_id,
                      projectId: sel.id,
                      projectName: sel.name,
                      environment: sel.environment,
                    });
                    document.cookie = `institution_id=${sel.institution_id}; path=/; samesite=lax`;
                    document.cookie = `project_id=${sel.id}; path=/; samesite=lax`;
                  }}
                >
                  {projects.length === 0 && <option value="">No projects</option>}
                  {projects.length > 0 && <option value="">Select project</option>}
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2"
                  style={{ color: "#71717a" }}
                />
              </div>
            </div>

            <span
              className="shrink-0 px-2 py-0.5 rounded text-[11px] font-medium"
              style={{
                background: context.environment === "production" ? "#1a0a0a" : "#0a1a0a",
                color: context.environment === "production" ? "#ef4444" : "#16a34a",
                border: `1px solid ${context.environment === "production" ? "#3a1a1a" : "#1a3a1a"}`,
              }}
            >
              {(context.environment ?? "test").toUpperCase()}
            </span>
          </div>

          {/* Right — hidden on small screens */}
          <div className="hidden xl:flex items-center gap-2 shrink-0">
            <span
              className="px-2 py-0.5 rounded text-[11px] border"
              style={{ color: "#71717a", borderColor: "#25252b" }}
            >
              Control Plane
            </span>
            <span
              className="px-2 py-0.5 rounded text-[11px] border"
              style={{ color: "#71717a", borderColor: "#25252b" }}
            >
              Versioned Runtime
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 overflow-auto" style={{ background: "#0f0f12" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
