export default function DocsApiPage() {
  return (
    <>
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/50 bg-blue-900/20 px-3 py-1 text-xs text-blue-400 mb-6 font-sans">
        API Reference
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-6">Programmable APIs</h1>
      <p className="text-lg text-gray-400 leading-relaxed mb-8">
        Orquestra is Headless-First. While the Console offers a control plane for defining and observing infrastructure, your end-user applications will interact purely with our REST and WebSocket endpoints.
      </p>

      <h2 className="text-2xl font-bold mt-12 mb-4">Authentication</h2>
      <p className="text-gray-400 mb-4">
        All programmatic API access must include a scoped API key in the authorization header:
      </p>

      <div className="rounded-md bg-[#1e1e24] p-4 font-mono text-sm text-gray-300 mb-8 border border-[#25252b]">
        Authorization: Bearer sk_live_erp_v2_abc123...
      </div>

      <h2 className="text-2xl font-bold mt-12 mb-4">Core Endpoints</h2>

      <div className="space-y-6">
        <div className="border border-[var(--border-default)] rounded-md p-4 bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-900/30 text-blue-400 border border-blue-900/50">POST</span>
            <span className="font-mono text-gray-200 text-sm">/v1/applications</span>
          </div>
          <p className="text-gray-400 text-sm mb-4">Initialize a new instance of an entity (e.g., student application, financial claim) targeting a specific Active Workflow Blueprint version.</p>
        </div>

        <div className="border border-[var(--border-default)] rounded-md p-4 bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-900/30 text-green-400 border border-green-900/50">POST</span>
            <span className="font-mono text-gray-200 text-sm">/v1/applications/:id/transition</span>
          </div>
          <p className="text-gray-400 text-sm mb-4">Attempt to transition the application to a new state based on provided parameters. The Workflow Engine will evaluate the conditions.</p>
        </div>

        <div className="border border-[var(--border-default)] rounded-md p-4 bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-900/30 text-purple-400 border border-purple-900/50">GET</span>
            <span className="font-mono text-gray-200 text-sm">/v1/events/stream</span>
          </div>
          <p className="text-gray-400 text-sm mb-4">Subscribe strictly via WebSocket to receive real-time streamed JSON payloads when workflow states transition.</p>
        </div>
      </div>
    </>
  );
}
