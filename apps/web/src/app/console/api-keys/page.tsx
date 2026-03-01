"use client";

import { useState } from "react";
import { KeyRound, Plus, Copy, Check, ShieldAlert } from "lucide-react";
import { useProjectContextStore } from "@/lib/stores/project-context-store";

export default function ApiKeysPage() {
  const context = useProjectContextStore((s) => s.context);
  const [copied, setCopied] = useState<string | null>(null);

  const mockKeys = [
    { id: "key_1", name: "Production Backend Integration", prefix: "sk_live_erp_v2_", created: "2026-02-15", lastUsed: "10 mins ago" },
    { id: "key_2", name: "Student Portal Test Key", prefix: "sk_test_erp_v1_", created: "2026-01-10", lastUsed: "Yesterday" }
  ];

  const handleCopy = (prefix: string) => {
    navigator.clipboard.writeText(prefix + "****************");
    setCopied(prefix);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">API Keys</h2>
          <p className="text-sm text-[var(--text-secondary)]">Manage version-pinned API keys for your institutional platform integrations.</p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-[var(--text-accent)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] hover:bg-blue-600 transition-colors">
          <Plus size={16} /> Generate New Key
        </button>
      </div>

      <div className="rounded-md border border-amber-900/50 bg-amber-900/10 p-4 flex gap-3 text-amber-500 text-sm">
        <ShieldAlert size={18} className="shrink-0 mt-0.5" />
        <div>
          <strong className="block mb-1 font-semibold text-amber-400">Version-Pinned Keys</strong>
          API keys generated here are intrinsically bound to the active Workflow Blueprint version. Upgrading your backend architecture requires rolling to a new <code>v[x]</code> key. Keys cannot escalate privileges post-creation.
        </div>
      </div>

      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1a1a20] border-b border-[var(--border-default)] text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Token Prefix</th>
              <th className="px-4 py-3 font-medium">Created On</th>
              <th className="px-4 py-3 font-medium">Last Used</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {mockKeys.map((key) => (
              <tr key={key.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{key.name}</td>
                <td className="px-4 py-3">
                  <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-2.5 py-1 font-mono text-[11px] text-gray-400">
                    {key.prefix}****************
                    <button onClick={() => handleCopy(key.prefix)} className="hover:text-white transition-colors ml-2">
                      {copied === key.prefix ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{key.created}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{key.lastUsed}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-red-500 hover:text-red-400 font-medium">Revoke</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {mockKeys.length === 0 && (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            <KeyRound size={24} className="mx-auto mb-3 opacity-50" />
            <p>No active API keys found for project {context.projectName}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
