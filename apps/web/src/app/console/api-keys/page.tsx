export default function ApiKeysPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">API Keys</h2>
      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
        Key lifecycle is project-scoped. Creation, rotation, and revoke actions are enforced by backend authority and
        audited as infrastructure events.
      </div>
    </div>
  );
}
