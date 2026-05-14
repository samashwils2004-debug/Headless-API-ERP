"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, LayoutDashboard } from "lucide-react";
import type { DesignSpec } from "@/lib/console-api";

export type { DesignSpec };

// ── Deterministic seed from string ──────────────────────────────
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── Mock data generation ────────────────────────────────────────
const FIRST_NAMES = ["Alex", "Jordan", "Morgan", "Taylor", "Casey", "Riley", "Quinn", "Avery", "Harper", "Drew", "Sam", "Blake", "Reese", "Parker", "Sage"];
const LAST_NAMES = ["Chen", "Patel", "Kim", "Garcia", "Nguyen", "Smith", "Brown", "Lee", "Wilson", "Davis", "Moore", "Taylor", "Clark", "Hall", "Young"];
const DEPT_NAMES = ["Engineering", "Finance", "Admissions", "Research", "Student Affairs", "HR", "Marketing", "Legal"];

type ColDef = { key: string; label: string; type: "text" | "number" | "badge" | "date"; badge_values?: string[] };

function generateRows(moduleId: string, columns: ColDef[], count: number): Record<string, string>[] {
  const rng = seededRandom(hash(moduleId));
  const rows: Record<string, string>[] = [];
  for (let r = 0; r < count; r++) {
    const row: Record<string, string> = {};
    for (const col of columns) {
      switch (col.type) {
        case "text": {
          const isName = /name/i.test(col.key);
          const isDept = /dept|department|program|faculty/i.test(col.key);
          const isEmail = /email/i.test(col.key);
          const isId = /id$|^id$|code|ref/i.test(col.key);
          const fi = Math.floor(rng() * FIRST_NAMES.length);
          const li = Math.floor(rng() * LAST_NAMES.length);
          if (isName) row[col.key] = `${FIRST_NAMES[fi]} ${LAST_NAMES[li]}`;
          else if (isEmail) row[col.key] = `${FIRST_NAMES[fi].toLowerCase()}.${LAST_NAMES[li].toLowerCase()}@inst.edu`;
          else if (isDept) row[col.key] = DEPT_NAMES[Math.floor(rng() * DEPT_NAMES.length)];
          else if (isId) row[col.key] = `${col.key.toUpperCase().slice(0, 3)}-${String(1000 + Math.floor(rng() * 9000))}`;
          else row[col.key] = `${FIRST_NAMES[fi]} ${LAST_NAMES[li]}`;
          break;
        }
        case "number":
          row[col.key] = String(Math.floor(rng() * 950) + 50);
          break;
        case "badge":
          row[col.key] = col.badge_values?.[Math.floor(rng() * col.badge_values.length)] ?? "Active";
          break;
        case "date": {
          const d = new Date(2025, Math.floor(rng() * 12), Math.floor(rng() * 28) + 1);
          row[col.key] = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          break;
        }
      }
    }
    rows.push(row);
  }
  return rows;
}

function deriveColumns(mod: DesignSpec["modules"][number]): ColDef[] {
  if (mod.table_columns && mod.table_columns.length > 0) return mod.table_columns;
  const cols: ColDef[] = [{ key: "id", label: "ID", type: "text" }];
  for (const f of (mod.fields || []).slice(0, 3)) {
    const t = f.type === "number" ? "number" : "text";
    cols.push({ key: f.name, label: f.label || f.name, type: t });
  }
  if (mod.actions?.length > 0) {
    cols.push({ key: "status", label: "Status", type: "badge", badge_values: mod.actions.slice(0, 4) });
  }
  cols.push({ key: "created_at", label: "Created", type: "date" });
  return cols;
}

function deriveStats(mod: DesignSpec["modules"][number]): Array<{ label: string; value: string; trend: "up" | "down" | "flat" }> {
  if (mod.stats && mod.stats.length > 0) return mod.stats;
  const rng = seededRandom(hash(mod.id + "stats"));
  return [
    { label: `Total ${mod.primary_entity || "Records"}`, value: String(Math.floor(rng() * 2000) + 200), trend: "up" },
    { label: "Active", value: String(Math.floor(rng() * 500) + 50), trend: "up" },
    { label: "Pending Review", value: String(Math.floor(rng() * 100) + 5), trend: "down" },
    { label: "Completion Rate", value: `${Math.floor(rng() * 30) + 70}%`, trend: "flat" },
  ];
}

// ── Badge color mapping ───────────────────────���─────────────────
const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  approved: { bg: "#16a34a20", text: "#4ade80" },
  active: { bg: "#16a34a20", text: "#4ade80" },
  completed: { bg: "#16a34a20", text: "#4ade80" },
  accepted: { bg: "#16a34a20", text: "#4ade80" },
  submitted: { bg: "#3b82f620", text: "#60a5fa" },
  pending: { bg: "#f59e0b20", text: "#fbbf24" },
  "under review": { bg: "#f59e0b20", text: "#fbbf24" },
  "in progress": { bg: "#f59e0b20", text: "#fbbf24" },
  rejected: { bg: "#ef444420", text: "#f87171" },
  denied: { bg: "#ef444420", text: "#f87171" },
  cancelled: { bg: "#ef444420", text: "#f87171" },
  draft: { bg: "#71717a20", text: "#a1a1aa" },
  inactive: { bg: "#71717a20", text: "#a1a1aa" },
};

function badgeStyle(value: string): { background: string; color: string } {
  const key = value.toLowerCase();
  const found = BADGE_COLORS[key];
  if (found) return { background: found.bg, color: found.text };
  return { background: "#3b82f615", color: "#60a5fa" };
}

// ── Mini chart bars ─────────────────────────────────────────────
function MiniChart({ moduleId, color }: { moduleId: string; color: string }) {
  const rng = seededRandom(hash(moduleId + "chart"));
  const bars = Array.from({ length: 7 }, () => 0.2 + rng() * 0.8);
  return (
    <div className="flex items-end gap-1 h-10">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{ height: `${h * 100}%`, background: color, opacity: 0.15 + h * 0.5 }}
        />
      ))}
    </div>
  );
}

// ── Trend icon ──────────────────────────────────────────────────
function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp size={12} style={{ color: "#4ade80" }} />;
  if (trend === "down") return <TrendingDown size={12} style={{ color: "#f87171" }} />;
  return <Minus size={12} style={{ color: "#71717a" }} />;
}

const ROWS_PER_PAGE = 8;

// ── Main component ──────────────────────────────────────────────
export function ERPDesign({ spec }: { spec: DesignSpec }) {
  const sorted = useMemo(
    () => [...(spec.modules || [])].sort((a, b) => a.nav_position - b.nav_position),
    [spec.modules]
  );
  const [activeId, setActiveId] = useState(sorted[0]?.id ?? "");
  const [page, setPage] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const active = sorted.find((m) => m.id === activeId) ?? sorted[0];
  if (!active) return null;

  const columns = deriveColumns(active);
  const stats = deriveStats(active);
  const allRows = useMemo(() => generateRows(active.id, columns, 32), [active.id, columns]);
  const pageRows = allRows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
  const totalPages = Math.ceil(allRows.length / ROWS_PER_PAGE);

  return (
    <div className="flex rounded-lg border overflow-hidden" style={{ background: "#0f0f12", borderColor: "#25252b", height: 620 }}>
      {/* ── Sidebar ──────────────────────────────────────── */}
      <div
        className="shrink-0 border-r flex flex-col transition-all"
        style={{ width: sidebarCollapsed ? 48 : 200, borderColor: "#25252b", background: "#0a0a0e" }}
      >
        <div className="flex items-center gap-2 px-3 py-3 border-b" style={{ borderColor: "#25252b" }}>
          {!sidebarCollapsed && (
            <span className="text-xs font-semibold truncate flex-1" style={{ color: "#f4f4f5" }}>
              {spec.system_name}
            </span>
          )}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="shrink-0 p-1 rounded hover:bg-[#1b1b24] transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight size={14} style={{ color: "#71717a" }} />
            ) : (
              <ChevronLeft size={14} style={{ color: "#71717a" }} />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {(spec.nav_groups && spec.nav_groups.length > 0 ? spec.nav_groups : [{ label: "", module_ids: sorted.map((m) => m.id) }]).map((group) => (
            <div key={group.label}>
              {group.label && !sidebarCollapsed && (
                <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider" style={{ color: "#52525b" }}>
                  {group.label}
                </p>
              )}
              {group.module_ids.map((mid) => {
                const mod = sorted.find((m) => m.id === mid);
                if (!mod) return null;
                const isActive = activeId === mid;
                return (
                  <button
                    key={mid}
                    onClick={() => { setActiveId(mid); setPage(0); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                    style={isActive ? { background: mod.color + "15", color: mod.color } : { color: "#71717a" }}
                    title={sidebarCollapsed ? mod.label : undefined}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: isActive ? mod.color : "#52525b" }} />
                    {!sidebarCollapsed && <span className="truncate">{mod.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* ��─ Main content ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "#25252b" }}>
          <LayoutDashboard size={16} style={{ color: active.color }} />
          <h2 className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>{active.label}</h2>
          <span className="text-xs" style={{ color: "#52525b" }}>{active.primary_entity}</span>
          <div className="ml-auto flex gap-1.5">
            {active.actions?.slice(0, 3).map((action) => (
              <span
                key={action}
                className="text-[10px] px-2 py-0.5 rounded border cursor-default"
                style={{ borderColor: active.color + "40", color: active.color, background: active.color + "10" }}
              >
                {action}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* KPI stat cards */}
          <div className="grid grid-cols-4 gap-3">
            {stats.slice(0, 4).map((stat) => (
              <div key={stat.label} className="rounded-lg border p-3" style={{ background: "#141418", borderColor: "#25252b" }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "#52525b" }}>{stat.label}</p>
                  <TrendIcon trend={stat.trend} />
                </div>
                <p className="text-lg font-semibold" style={{ color: "#f4f4f5" }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Mini chart */}
          <div className="rounded-lg border p-3" style={{ background: "#141418", borderColor: "#25252b" }}>
            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#52525b" }}>Weekly activity</p>
            <MiniChart moduleId={active.id} color={active.color} />
          </div>

          {/* Data table */}
          <div className="rounded-lg border overflow-hidden" style={{ background: "#141418", borderColor: "#25252b" }}>
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: "#0f0f12" }}>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: "#52525b" }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-t transition-colors hover:bg-[#1b1b2480]"
                    style={{ borderColor: "#25252b" }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-2.5 text-xs" style={{ color: "#a1a1aa" }}>
                        {col.type === "badge" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={badgeStyle(row[col.key])}>
                            {row[col.key]}
                          </span>
                        ) : col.type === "number" ? (
                          <span className="font-mono">{row[col.key]}</span>
                        ) : (
                          row[col.key]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: "#25252b" }}>
              <span className="text-[10px]" style={{ color: "#52525b" }}>
                {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, allRows.length)} of {allRows.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1 rounded disabled:opacity-30 hover:bg-[#1b1b24] transition-colors"
                >
                  <ChevronLeft size={14} style={{ color: "#71717a" }} />
                </button>
                <span className="text-[10px] px-2 py-1" style={{ color: "#71717a" }}>
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1 rounded disabled:opacity-30 hover:bg-[#1b1b24] transition-colors"
                >
                  <ChevronRight size={14} style={{ color: "#71717a" }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
