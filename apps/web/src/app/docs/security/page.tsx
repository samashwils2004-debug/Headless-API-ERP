export default function DocsSecurityPage() {
  return (
    <>
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/50 bg-blue-900/20 px-3 py-1 text-xs text-blue-400 mb-6 font-sans">
        Security
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-6">Data Security & Isolation</h1>
      <p className="text-lg text-gray-400 leading-relaxed mb-8">
        Orquestra relies on strictly enforced Multi-Tenant Architecture. Because institutional
        workflows process highly sensitive data (admissions, finance, health records),
        cross-tenant isolation is the primary non-negotiable invariant.
      </p>

      <h2 className="text-2xl font-bold mt-12 mb-4">Multi-Tenant Isolation Enforcement Model</h2>

      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 mb-8 font-mono text-sm text-gray-300">
        Auth → RBAC → RLS → Scoped DB → Scoped Events → Scoped UI
      </div>

      <ul className="list-disc list-inside text-gray-400 space-y-4">
        <li>
          <strong className="text-gray-200">Auth & RBAC:</strong> Every API access requires a tightly scoped Application versioned API Key or a JWT tied to an authenticated Institutional user.
        </li>
        <li>
          <strong className="text-gray-200">Row-Level Security (RLS):</strong> Every query explicitly filters by <code>institution_id</code> and <code>project_id</code> at the database engine level. Applications cannot accidentally query cross-institution workflows.
        </li>
        <li>
          <strong className="text-gray-200">Frontend Enforcement Middleware Layer (FEML):</strong> The Orquestra Console interface utilizes FEML to guarantee that state, Zustand stores, and Websocket subscriptions are categorically destroyed and recreated when shifting between Projects or Institutions.
        </li>
      </ul>

      <h2 className="text-2xl font-bold mt-12 mb-4">Immutability of Blueprints</h2>
      <p className="text-gray-400 mb-4">
        Once a generated Institutional Workflow Blueprint is deployed by a Control Plane administrator, it is designated as <strong>immutable</strong>.
      </p>
      <div className="p-4 border-l-2 border-red-500 bg-red-500/10 text-red-200 mb-8 rounded-r-md">
        <strong>Strict Invariant:</strong> You cannot hot-patch a running workflow. Any change to transitions, conditions, or attached roles generates a new semantic version (e.g., v1.1 or v2.0) ensuring audit trails and active application continuations are never corrupted.
      </div>
    </>
  );
}
