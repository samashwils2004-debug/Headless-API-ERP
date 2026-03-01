"use client";

import { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { listAPIKeys, createAPIKey, revokeAPIKey as revokeAPIKeyFn, type APIKeyItem, type APIKeyCreateResponse } from "@/lib/console-api";

type APIKey = APIKeyItem;
type NewKeyResult = APIKeyCreateResponse;

export default function APIKeysPage() {
  const context = useProjectContextStore((s) => s.context);
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<NewKeyResult | null>(null);
  const [showFullKey, setShowFullKey] = useState(false);
  const [form, setForm] = useState({ name: "", scopes: "workflow:read,event:read", expires_in_days: "" });

  async function fetchKeys() {
    if (!context.institutionId) return;
    try {
      const data = await listAPIKeys({ institutionId: context.institutionId, projectId: context.projectId || "" });
      setKeys(data.keys ?? []);
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchKeys(); }, [context.institutionId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createKey() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!context.institutionId) { toast.error("Select a project first"); return; }
    setCreating(true);
    try {
      const payload: { name: string; scopes: string[]; expires_in_days?: number } = {
        name: form.name,
        scopes: form.scopes.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (form.expires_in_days) payload.expires_in_days = parseInt(form.expires_in_days, 10);

      const data = await createAPIKey({ institutionId: context.institutionId, projectId: context.projectId || "" }, payload);
      setNewKeyResult(data);
      setShowCreate(false);
      setForm({ name: "", scopes: "workflow:read,event:read", expires_in_days: "" });
      await fetchKeys();
      toast.success("API key created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!context.institutionId) return;
    try {
      await revokeAPIKeyFn({ institutionId: context.institutionId, projectId: context.projectId || "" }, id);
      setKeys((k) => k.filter((key) => key.id !== id));
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke key");
    }
  }

  const cardStyle = { background: "#141418", borderColor: "#25252b" };
  const inputStyle = { background: "#0f0f12", border: "1px solid #25252b", color: "#f4f4f5" };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f4f4f5" }}>API Keys</h1>
          <p className="text-sm mt-1" style={{ color: "#8a8a94" }}>
            Manage programmatic access keys for your institution
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold"
          style={{ background: "#3b82f6", color: "#fff" }}
        >
          <Plus size={14} />
          Create Key
        </button>
      </div>

      {/* New key banner */}
      {newKeyResult && (
        <div className="rounded-lg p-4 border" style={{ background: "#0c1a0c", borderColor: "#16a34a40" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: "#16a34a" }}>
              ✓ Key created — copy it now, it won't be shown again
            </span>
            <button onClick={() => setNewKeyResult(null)} className="text-sm" style={{ color: "#8a8a94" }}>
              Dismiss
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-sm rounded px-3 py-2 font-mono"
              style={{ background: "#0f0f12", color: "#f4f4f5", border: "1px solid #25252b" }}
            >
              {showFullKey ? newKeyResult.full_key : newKeyResult.full_key.slice(0, 20) + "•".repeat(20)}
            </code>
            <button
              onClick={() => setShowFullKey((v) => !v)}
              className="p-2 rounded border"
              style={{ borderColor: "#25252b", color: "#8a8a94" }}
            >
              {showFullKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKeyResult.full_key);
                toast.success("Copied to clipboard");
              }}
              className="p-2 rounded border"
              style={{ borderColor: "#25252b", color: "#8a8a94" }}
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg p-5 border" style={cardStyle}>
          <h3 className="text-base font-semibold mb-4" style={{ color: "#f4f4f5" }}>Create New API Key</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: "#8a8a94" }}>Key Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Production Admissions"
                className="w-full rounded px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "#8a8a94" }}>Scopes (comma-separated)</label>
              <input
                type="text"
                value={form.scopes}
                onChange={(e) => setForm((f) => ({ ...f, scopes: e.target.value }))}
                placeholder="workflow:read,event:read"
                className="w-full rounded px-3 py-2 text-sm outline-none font-mono"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "#8a8a94" }}>Expires in days (optional)</label>
              <input
                type="number"
                value={form.expires_in_days}
                onChange={(e) => setForm((f) => ({ ...f, expires_in_days: e.target.value }))}
                placeholder="e.g. 90"
                min={1}
                max={365}
                className="w-full rounded px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={createKey}
                disabled={creating}
                className="rounded px-4 py-2 text-sm font-semibold disabled:opacity-60"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                {creating ? "Creating…" : "Create Key"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded px-4 py-2 text-sm border"
                style={{ borderColor: "#25252b", color: "#a1a1aa" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="rounded-lg border overflow-hidden" style={cardStyle}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid #25252b" }}>
              {["Name", "Prefix", "Scopes", "Created", "Last Used", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "#71717a" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "#71717a" }}>
                  Loading…
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: "#52525b" }}>
                  <KeyRound size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No API keys yet</p>
                  <p className="text-xs mt-1">Create a key to enable programmatic access</p>
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} style={{ borderTop: "1px solid #1e1e24" }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "#f4f4f5" }}>{key.name}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "#0f0f12", color: "#a1a1aa" }}>
                      {key.key_prefix}…
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.slice(0, 3).map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded border font-mono" style={{ borderColor: "#25252b", color: "#8a8a94" }}>
                          {s}
                        </span>
                      ))}
                      {key.scopes.length > 3 && (
                        <span className="text-[10px]" style={{ color: "#52525b" }}>+{key.scopes.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#71717a" }}>
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#71717a" }}>
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => revokeKey(key.id)}
                      className="p-1.5 rounded transition-colors hover:bg-red-950"
                      style={{ color: "#ef4444" }}
                      title="Revoke key"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
