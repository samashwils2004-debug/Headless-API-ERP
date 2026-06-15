"use client";

// ─── Types ──────────────────────────────────────────────────────────────────

type Section = {
  domain_id: string;
  label: string;
  color: string;
  icon: string;
  status: "live" | "unlinked";
  workflow_id: string | null;
  workflow_name: string | null;
  layout: {
    primary_metric: { type: string; label: string; value: string };
    charts: Array<{ type: string; label: string }>;
    widgets: string[];
    modules: Array<{ id: string; label: string; visualization: string }>;
  };
};

type VisualizationConfig = {
  system_name: string;
  sections: Section[];
  integrations: Array<{ from: string; to: string; event: string; label: string }>;
  layout_mode: "two_column" | "four_grid" | "masonry";
  generated_at: string;
};

// ─── Component ──────────────────────────────────────────────────────────────

export function ERPPreview({ config }: { config: VisualizationConfig }) {
  if (!config || !config.sections || config.sections.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg border" 
           style={{ background: "#141418", borderColor: "#25252b" }}>
        <p className="text-sm" style={{ color: "#52525b" }}>
          No preview available yet. Add domains and apply a prompt.
        </p>
      </div>
    );
  }

  const gridClass = {
    two_column: "grid-cols-1 md:grid-cols-2",
    four_grid: "grid-cols-2 md:grid-cols-4",
    masonry: "grid-cols-2 md:grid-cols-3",
  }[config.layout_mode] ?? "grid-cols-2 md:grid-cols-3";  // fallback

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: "#f4f4f5" }}>
          {config.system_name}
        </h2>
        <span className="text-xs" style={{ color: "#52525b" }}>
          Preview • {new Date(config.generated_at).toLocaleTimeString()}
        </span>
      </div>

      <div className={`grid gap-4 ${gridClass}`}>
        {config.sections.map((section) => (
          <div
            key={section.domain_id}
            className="rounded-lg p-5 space-y-4"
            style={{
              background: "#141418",
              border: `1px solid ${section.status === "live" ? section.color + "40" : "#25252b"}`,
            }}
          >
            {/* Domain header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: section.color }}
                />
                <span className="text-sm font-semibold" style={{ color: "#f4f4f5" }}>
                  {section.label}
                </span>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={
                  section.status === "live"
                    ? { background: "#0a1a0a", color: "#4ade80" }
                    : { background: "#1b1b24", color: "#71717a" }
                }
              >
                {section.status === "live" ? "Live" : "No Workflow"}
              </span>
            </div>

            {/* Primary metric */}
            <div className="rounded p-3" style={{ background: "#1b1b24" }}>
              <p className="text-xs" style={{ color: "#71717a" }}>
                {section.layout.primary_metric.label}
              </p>
              <p className="text-2xl font-light mt-1" style={{ color: "#f4f4f5" }}>
                {section.layout.primary_metric.value}
              </p>
            </div>

            {/* Modules */}
            {section.layout.modules.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {section.layout.modules.map((mod) => (
                  <div
                    key={mod.id}
                    className="rounded p-2 text-xs"
                    style={{ background: "#0f0f12", color: "#a1a1aa" }}
                  >
                    {mod.label}
                  </div>
                ))}
              </div>
            )}

            {/* Linked workflow */}
            {section.workflow_name && (
              <p className="text-xs" style={{ color: "#4ade80" }}>
                → {section.workflow_name}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Integration arrows */}
      {config.integrations.length > 0 && (
        <div className="rounded-lg p-4" style={{ background: "#141418", border: "1px solid #25252b" }}>
          <p className="text-xs font-semibold mb-3" style={{ color: "#71717a" }}>
            INTEGRATIONS
          </p>
          <div className="space-y-2">
            {config.integrations.map((int, i) => (
              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "#a1a1aa" }}>
                <span style={{ color: "#f4f4f5" }}>{int.from}</span>
                <span style={{ color: "#52525b" }}>→</span>
                <span style={{ color: "#f4f4f5" }}>{int.to}</span>
                <span className="ml-auto font-mono" style={{ color: "#3b82f6" }}>{int.event}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export type { VisualizationConfig };
