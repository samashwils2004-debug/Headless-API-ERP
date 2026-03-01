export default function DocsIntroductionPage() {
  return (
    <>
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/50 bg-blue-900/20 px-3 py-1 text-xs text-blue-400 mb-6 font-sans">
        Documentation
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-6">Introduction to Orquestra</h1>
      <p className="text-lg text-gray-400 leading-relaxed mb-8">
        Orquestra is a headless, API-first infrastructure platform. It replaces rigid, hardcoded ERP logic with programmable institutional infrastructure.
      </p>

      <h2 className="text-2xl font-bold mt-12 mb-4">Core Philosophy</h2>
      <p className="text-gray-300 mb-4">
        Traditional institutional ERPs suffer from hardcoded logic and brittle customization. Developers building institutional systems routinely reinvent core logic like manual state management, custom approval flows, and event omission.
      </p>
      <p className="text-gray-300 mb-8">
        Orquestra views AI not as a chatbot, but as a <strong>structural compiler</strong>. You describe your processes in natural language, and Orquestra compiles them into validated, deterministic JSON state machines running on a strictly typed backend.
      </p>

      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 mb-8">
        <h3 className="text-lg font-bold mb-2">What Orquestra Provides:</h3>
        <ul className="list-disc list-inside text-gray-400 space-y-2">
          <li><strong>Workflow Engine:</strong> JSON state machine executor with safe condition evaluation.</li>
          <li><strong>Template System:</strong> Pre-built institutional workflow blueprints.</li>
          <li><strong>AI Blueprint Generator:</strong> Natural language to validated infrastructure.</li>
          <li><strong>Event Backbone:</strong> Real-time event emission (Redis/WebSockets) for every transition.</li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold mt-12 mb-4">Not an Admin UI</h2>
      <div className="p-4 border-l-2 border-amber-500 bg-amber-500/10 text-amber-200 mb-8 rounded-r-md">
        <strong>Important:</strong> Orquestra does NOT provide traditional ERP admin UIs, pre-built dashboards, or end-user facing interfaces. It is the programmable runtime layer upon which your application is built.
      </div>
    </>
  );
}
