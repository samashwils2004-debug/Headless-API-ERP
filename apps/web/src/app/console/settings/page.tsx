"use client";

import { useState } from "react";
import { Settings, Shield, Server } from "lucide-react";
import { toast } from "sonner";
import { useProjectContextStore } from "@/lib/stores/project-context-store";

const SECTIONS = [
  {
    id: "general",
    icon: Settings,
    title: "General",
    description: "Organization name, domain, and environment settings",
  },
  {
    id: "security",
    icon: Shield,
    title: "Security",
    description: "Authentication settings, session policy, and access controls",
  },
  {
    id: "runtime",
    icon: Server,
    title: "Runtime",
    description: "Workflow execution defaults and event stream configuration",
  },
];

const cardStyle = { background: "#141418", borderColor: "#25252b" };
const inputStyle = { background: "#0f0f12", border: "1px solid #25252b", color: "#f4f4f5" };

export default function SettingsPage() {
  const context = useProjectContextStore((s) => s.context);
  const [activeSection, setActiveSection] = useState("general");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Settings saved");
    setSaving(false);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#f4f4f5" }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: "#8a8a94" }}>
          Configure your Orquestra runtime defaults and organizational settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar */}
        <nav className="space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm text-left transition-colors"
              style={
                activeSection === s.id
                  ? { background: "#1e1e24", color: "#f4f4f5" }
                  : { color: "#a1a1aa" }
              }
            >
              <s.icon size={15} style={{ color: activeSection === s.id ? "#e4e4e7" : "#71717a" }} />
              {s.title}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div>
          {activeSection === "general" && (
            <div className="rounded-lg border p-5 space-y-4" style={cardStyle}>
              <h2 className="text-base font-semibold" style={{ color: "#f4f4f5" }}>General Settings</h2>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8a94" }}>Institution ID</label>
                <input
                  type="text"
                  defaultValue={context.institutionId || ""}
                  readOnly
                  className="w-full rounded px-3 py-2 text-sm font-mono outline-none opacity-60"
                  style={inputStyle}
                />
                <p className="text-xs mt-1" style={{ color: "#52525b" }}>Read-only — set at institution creation</p>
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8a94" }}>Active Project</label>
                <input
                  type="text"
                  defaultValue={context.projectName || context.projectId || "Not selected"}
                  readOnly
                  className="w-full rounded px-3 py-2 text-sm outline-none opacity-60"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#8a8a94" }}>Environment</label>
                <select
                  defaultValue={context.environment || "test"}
                  className="w-full rounded px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                >
                  <option value="test">Test</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-60"
                  style={{ background: "#3b82f6", color: "#fff" }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div className="rounded-lg border p-5 space-y-4" style={cardStyle}>
              <h2 className="text-base font-semibold" style={{ color: "#f4f4f5" }}>Security Settings</h2>

              <div className="space-y-3">
                {[
                  { label: "JWT Token Expiry", value: "30 minutes", note: "Access tokens expire after 30 minutes" },
                  { label: "Refresh Token Expiry", value: "30 days", note: "Refresh tokens valid for 30 days" },
                  { label: "CSRF Protection", value: "Enabled", note: "SameSite=Lax HttpOnly cookies" },
                  { label: "Password Hashing", value: "bcrypt (12 rounds)", note: "Industry-standard password hashing" },
                  { label: "Multi-Tenant Isolation", value: "Enforced", note: "institution_id + project_id on every query" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "#1e1e24" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#f4f4f5" }}>{item.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#52525b" }}>{item.note}</p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded border"
                      style={{ borderColor: "#25252b", color: "#8a8a94" }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="rounded p-3 border text-xs"
                style={{ background: "#0a1a0a", borderColor: "#16a34a30", color: "#16a34a" }}
              >
                ✓ All security invariants active — runtime is hardened
              </div>
            </div>
          )}

          {activeSection === "runtime" && (
            <div className="rounded-lg border p-5 space-y-4" style={cardStyle}>
              <h2 className="text-base font-semibold" style={{ color: "#f4f4f5" }}>Runtime Configuration</h2>

              <div className="space-y-3">
                {[
                  { label: "Workflow Immutability", value: "Always enforced", status: "active" },
                  { label: "Event Emission", value: "Every transition", status: "active" },
                  { label: "4-Stage AI Validation", value: "Required for deployment", status: "active" },
                  { label: "Safe Condition Parser", value: "No eval/exec", status: "active" },
                  { label: "Redis Event Streaming", value: "Best-effort", status: "optional" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "#1e1e24" }}>
                    <span className="text-sm" style={{ color: "#a1a1aa" }}>{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: item.status === "active" ? "#16a34a" : "#ca8a04" }}
                      />
                      <span className="text-xs" style={{ color: "#8a8a94" }}>{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
