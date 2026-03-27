"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Copy, Check, ShieldAlert, Trash2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { listApiKeys, revokeApiKey, type ApiKeyItem } from "@/lib/console-api";
import { useProjectContextStore } from "@/lib/stores/project-context-store";

export default function ApiKeysPage() {
  const context = useProjectContextStore((s) => s.context);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const tenant = { institutionId: context.institutionId, projectId: context.projectId };
  const noProject = !context.institutionId || !context.projectId;

  const load = useCallback(async () => {
    if (noProject) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await listApiKeys(tenant);
      setKeys(data.keys);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.institutionId, context.projectId]);

  useEffect(() => { load(); }, [load]);

  const handleCopy = (prefix: string) => {
    navigator.clipboard.writeText(prefix + "…").catch(() => {});
    setCopied(prefix);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRevoke = async (keyId: string, name: string) => {
    if (!confirm(`Revoke key "${name}"? This cannot be undone.`)) return;
    setRevoking(keyId);
    try {
      await revokeApiKey(tenant, keyId);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast.success("API key revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: "#f4f4f5" }}>API Keys</h2>
          <p className="text-sm mt-1" style={{ color: "#71717a" }}>
            Version-pinned keys for your institutional runtime integrations.
          </p>
        </div>
        <a
          href="/console/architect"
          className="flex items-center gap-2 rounded px-4 py-2 text-sm font-medium border transition-colors hover:bg-[#1b1b24]"
          style={{ borderColor: "#25252b", color: "#a1a1aa" }}
        >
          <ExternalLink size={14} />
          Compile new key
        </a>
      </div>

      <div className="rounded border flex gap-3 p-4 text-sm" style={{ background: "#1a1400", borderColor: "#ca8a04" + "40", color: "#ca8a04" }}>
        <ShieldAlert size={18} className="shrink-0 mt-0.5" />
        <div>
          <strong className="block mb-1" style={{ color: "#facc15" }}>Version-Pinned Keys</strong>
          API keys are bound to a compiled architecture version. Any schema or workflow change requires recompiling — which issues a new <code className="font-mono text-xs">sk_erp_v[n]_…</code> key. Old keys continue to work against their pinned version.
        </div>
      </div>

      {noProject ? (
        <div className="flex items-center justify-center h-40 rounded border" style={{ borderColor: "#1c1c22", background: "#141418" }}>
          <p className="text-sm" style={{ color: "#52525b" }}>Select a project to see API keys.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={20} className="animate-spin" style={{ color: "#3b82f6" }} />
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded border" style={{ borderColor: "#1c1c22", background: "#141418" }}>
          <KeyRound size={28} className="mb-3 opacity-20" style={{ color: "#f4f4f5" }} />
          <p className="text-sm" style={{ color: "#71717a" }}>No active API keys.</p>
          <p className="text-xs mt-1" style={{ color: "#52525b" }}>
            Go to{" "}
            <a href="/console/architect" className="underline" style={{ color: "#3b82f6" }}>
              Architect
            </a>{" "}
            and compile an architecture to generate a key.
          </p>
        </div>
      ) : (
        <div className="rounded border overflow-hidden" style={{ borderColor: "#1c1c22", background: "#141418" }}>
          <table className="w-full text-left text-sm">
            <thead style={{ background: "#1a1a20", borderBottom: "1px solid #25252b" }}>
              <tr>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "#71717a" }}>Name</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "#71717a" }}>Key Prefix</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "#71717a" }}>Scopes</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "#71717a" }}>Created</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: "#71717a" }}>Last Used</th>
                <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider" style={{ color: "#71717a" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} style={{ borderTop: "1px solid #1c1c22" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "#f4f4f5" }}>{key.name}</td>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2 rounded border px-2.5 py-1 font-mono text-[11px]" style={{ borderColor: "#25252b", background: "#0f0f12", color: "#a1a1aa" }}>
                      {key.key_prefix}…
                      <button onClick={() => handleCopy(key.key_prefix)} className="ml-1 transition-colors hover:text-white">
                        {copied === key.key_prefix ? <Check size={13} style={{ color: "#4ade80" }} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((s) => (
                        <span key={s} className="rounded px-1.5 py-0.5 text-[10px] font-mono" style={{ background: "#1b1b24", color: "#71717a" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#71717a" }}>
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#71717a" }}>
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(key.id, key.name)}
                      disabled={revoking === key.id}
                      className="flex items-center gap-1 ml-auto rounded px-2 py-1 text-xs transition-colors hover:bg-red-900/20 disabled:opacity-50"
                      style={{ color: "#ef4444" }}
                    >
                      {revoking === key.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
