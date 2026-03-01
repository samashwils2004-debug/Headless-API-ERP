"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Layers,
  GitBranch,
  Sparkles,
  Radio,
  KeyRound,
  Settings,
  ChevronDown,
} from "lucide-react";

import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useProjectStore } from "@/lib/stores/project-store";

const NAV = [
  { href: "/console",           label: "Dashboard",    icon: LayoutDashboard },
  { href: "/console/projects",  label: "Projects",     icon: FolderKanban    },
  { href: "/console/templates", label: "Templates",    icon: Layers          },
  { href: "/console/workflows", label: "Workflows",    icon: GitBranch       },
  { href: "/console/ai",        label: "AI Generator", icon: Sparkles        },
  { href: "/console/events",    label: "Event Stream", icon: Radio           },
  { href: "/console/api-keys",  label: "API Keys",     icon: KeyRound        },
  { href: "/console/settings",  label: "Settings",     icon: Settings        },
];

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname   = usePathname();
  const context    = useProjectContextStore((s) => s.context);
  const setContext = useProjectContextStore((s) => s.setContext);
  const projects   = useProjectStore((s) => s.projects);

  return (
    <div className="min-h-screen flex" style={{ background: "#0f0f12", color: "#f4f4f5" }}>
      {/* Sidebar 260px */}
      <aside
        className="flex-none w-[260px] flex flex-col"
        style={{ background: "#141418", borderRight: "1px solid #25252b" }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 h-[60px] shrink-0"
          style={{ borderBottom: "1px solid #25252b" }}
        >
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: "#e4e4e7", color: "#0f0f12" }}
          >
            AF
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>AdmitFlow</span>
            <span
              className="text-[10px] tracking-widest uppercase block leading-none mt-0.5"
              style={{ color: "#71717a" }}
            >
              Infrastructure
            </span>
          </div>
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
                {label === "AI Generator" && (
                  <span
                    className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: "#1e1030", color: "#a855f7" }}
                  >
                    AI
                  </span>
                )}
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
        {/* Top Context Bar 60px */}
        <header
          className="flex items-center justify-between px-6 h-[60px] shrink-0 gap-4"
          style={{ background: "#141418", borderBottom: "1px solid #25252b" }}
        >
          {/* Left */}
          <div className="flex items-center gap-4 text-sm">
            <span style={{ color: "#71717a" }}>
              <span>Institution: </span>
              <span style={{ color: "#f4f4f5" }} className="font-medium">
                {context.institutionId || "Not selected"}
              </span>
            </span>

            <div className="flex items-center gap-1.5">
              <span style={{ color: "#71717a" }}>Project:</span>
              <div className="relative">
                <select
                  className="appearance-none pl-2 pr-6 py-1 rounded text-sm font-medium cursor-pointer"
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
                      projectId:     sel.id,
                      projectName:   sel.name,
                      environment:   sel.environment,
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
              className="px-2 py-0.5 rounded text-[11px] font-medium"
              style={{
                background: context.environment === "production" ? "#1a0a0a" : "#0a1a0a",
                color:      context.environment === "production" ? "#ef4444" : "#16a34a",
                border:     `1px solid ${context.environment === "production" ? "#3a1a1a" : "#1a3a1a"}`,
              }}
            >
              {(context.environment ?? "test").toUpperCase()}
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
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
        <main className="flex-1 px-6 py-6 overflow-auto" style={{ background: "#0f0f12" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
