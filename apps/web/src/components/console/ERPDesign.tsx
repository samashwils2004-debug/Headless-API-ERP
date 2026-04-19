"use client";

type SchemaField = { name: string; type: string; label: string };

type Module = {
  id: string;
  domain_id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  primary_entity: string;
  fields: SchemaField[];
  actions: string[];
  nav_position: number;
};

type Relationship = {
  from_module: string;
  to_module: string;
  type: string;
  label: string;
};

type NavGroup = { label: string; module_ids: string[] };

export type DesignSpec = {
  system_name: string;
  modules: Module[];
  relationships: Relationship[];
  nav_groups: NavGroup[];
  layout: string;
  rationale: string;
};

export function ERPDesign({ spec }: { spec: DesignSpec }) {
  const sorted = [...(spec.modules || [])].sort(
    (a, b) => a.nav_position - b.nav_position
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: "#f4f4f5" }}>
          {spec.system_name}
        </h2>
        <span
          className="text-xs px-2 py-0.5 rounded border"
          style={{
            borderColor: "#3b82f630",
            color: "#60a5fa",
            background: "#3b82f610",
          }}
        >
          {spec.layout === "sidebar_nav" ? "Sidebar layout" : "Top nav layout"}
        </span>
      </div>

      {/* Nav groups */}
      {spec.nav_groups?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {spec.nav_groups.map((group) => (
            <div
              key={group.label}
              className="rounded-lg border px-3 py-2"
              style={{ background: "#141418", borderColor: "#25252b" }}
            >
              <p
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: "#52525b" }}
              >
                {group.label}
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {group.module_ids.map((mid) => {
                  const mod = spec.modules.find((m) => m.id === mid);
                  return mod ? (
                    <span
                      key={mid}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: mod.color + "20",
                        color: mod.color,
                      }}
                    >
                      {mod.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((mod) => (
          <div
            key={mod.id}
            className="rounded-lg border p-4 space-y-3"
            style={{ background: "#141418", borderColor: mod.color + "40" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: mod.color }}
                />
                <span
                  className="text-sm font-semibold truncate"
                  style={{ color: "#f4f4f5" }}
                >
                  {mod.label}
                </span>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                style={{ background: "#1b1b24", color: "#71717a" }}
              >
                {mod.primary_entity}
              </span>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: "#71717a" }}>
              {mod.description}
            </p>

            {mod.fields?.length > 0 && (
              <div>
                <p
                  className="text-[10px] uppercase tracking-wider mb-1.5"
                  style={{ color: "#52525b" }}
                >
                  Fields
                </p>
                <div className="flex flex-wrap gap-1">
                  {mod.fields.slice(0, 5).map((f) => (
                    <span
                      key={f.name}
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{
                        background: "#0f0f12",
                        color: "#a1a1aa",
                        border: "1px solid #25252b",
                      }}
                    >
                      {f.label || f.name}
                    </span>
                  ))}
                  {mod.fields.length > 5 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ color: "#52525b" }}
                    >
                      +{mod.fields.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {mod.actions?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {mod.actions.map((action) => (
                  <span
                    key={action}
                    className="text-[10px] px-2 py-0.5 rounded border"
                    style={{
                      borderColor: mod.color + "40",
                      color: mod.color,
                      background: mod.color + "10",
                    }}
                  >
                    {action}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Relationships */}
      {spec.relationships?.length > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{ background: "#141418", borderColor: "#25252b" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "#71717a" }}
          >
            Data relationships
          </p>
          <div className="space-y-2">
            {spec.relationships.map((rel, i) => {
              const fromMod = spec.modules.find(
                (m) => m.id === rel.from_module
              );
              const toMod = spec.modules.find((m) => m.id === rel.to_module);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "#a1a1aa" }}
                >
                  <span style={{ color: fromMod?.color || "#f4f4f5" }}>
                    {fromMod?.label || rel.from_module}
                  </span>
                  <span style={{ color: "#52525b" }}>
                    {rel.type === "one_to_many"
                      ? "1\u2192N"
                      : rel.type === "many_to_many"
                      ? "N\u2194N"
                      : "1\u21941"}
                  </span>
                  <span style={{ color: toMod?.color || "#f4f4f5" }}>
                    {toMod?.label || rel.to_module}
                  </span>
                  {rel.label && (
                    <span
                      className="ml-auto font-mono"
                      style={{ color: "#3b82f6" }}
                    >
                      {rel.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {spec.rationale && (
        <p className="text-xs leading-relaxed" style={{ color: "#52525b" }}>
          {spec.rationale}
        </p>
      )}
    </div>
  );
}
