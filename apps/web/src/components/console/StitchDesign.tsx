"use client";

import { useState } from "react";
import type { DomainDef } from "@/types/contracts";
import type { StitchScreenMap } from "@/lib/console-api";

type StitchDesignProps = {
  screens: StitchScreenMap;
  domains: DomainDef[];
  systemName: string;
};

export function StitchDesign({ screens, domains, systemName }: StitchDesignProps) {
  // Only list domains that actually have generated HTML
  const available = domains.filter((d) => screens[d.id]?.html);

  const [activeDomainId, setActiveDomainId] = useState<string>(
    available[0]?.id ?? ""
  );

  if (available.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-64 rounded-lg border"
        style={{ background: "#141418", borderColor: "#25252b" }}
      >
        <p className="text-sm" style={{ color: "#71717a" }}>
          No Stitch screens available for this architecture.
        </p>
      </div>
    );
  }

  const activeDomain = available.find((d) => d.id === activeDomainId);
  const activeScreen = screens[activeDomainId];

  return (
    <div
      className="flex rounded-lg border overflow-hidden"
      style={{
        background: "#0f0f12",
        borderColor: "#25252b",
        height: 620,
      }}
    >
      {/* ── Domain sidebar ──────────────────────────────────────────── */}
      <div
        className="w-48 flex-none flex flex-col border-r"
        style={{ background: "#0a0a0e", borderColor: "#25252b" }}
      >
        {/* Header */}
        <div
          className="px-3 py-3 border-b"
          style={{ borderColor: "#25252b" }}
        >
          <p
            className="text-xs font-semibold truncate"
            style={{ color: "#f4f4f5" }}
          >
            {systemName}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "#52525b" }}>
            {available.length} Stitch screen{available.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {available.map((domain) => {
            const isActive = activeDomainId === domain.id;
            const accent = domain.color ?? "#3b82f6";
            return (
              <button
                key={domain.id}
                onClick={() => setActiveDomainId(domain.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                style={
                  isActive
                    ? { background: accent + "18", color: accent }
                    : { color: "#71717a" }
                }
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: isActive ? accent : "#3f3f46" }}
                />
                <span className="truncate">{domain.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-3 py-2 border-t"
          style={{ borderColor: "#25252b" }}
        >
          <p
            className="text-[9px] uppercase tracking-wider leading-tight"
            style={{ color: "#3f3f46" }}
          >
            Google Stitch
            {activeDomain?.color && (
              <span className="block normal-case mt-0.5" style={{ color: "#52525b" }}>
                {activeDomain.label}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── HTML iframe ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeScreen?.html ? (
          /*
           * sandbox="allow-scripts" lets inline JS in the Stitch HTML run,
           * but blocks access to the parent frame (no allow-same-origin).
           * key={activeDomainId} forces a full remount when switching tabs
           * so the previous page's scroll position and state are discarded.
           */
          <iframe
            key={activeDomainId}
            srcDoc={activeScreen.html}
            sandbox="allow-scripts"
            title={`${activeDomain?.label ?? activeDomainId} — Stitch Design`}
            className="flex-1 w-full border-0"
            style={{ minHeight: 0 }}
          />
        ) : (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ background: "#141418" }}
          >
            <p className="text-sm" style={{ color: "#71717a" }}>
              No HTML content for this screen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
