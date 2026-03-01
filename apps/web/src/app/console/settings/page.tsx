export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
        Runtime defaults, RBAC configuration, and tenant security controls are managed here. Frontend role checks are
        informational; backend authorization is authoritative.
      </div>
    </div>
  );
}
