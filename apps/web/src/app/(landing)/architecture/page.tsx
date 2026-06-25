import Link from "next/link";
import { ArrowRight, Layers, Database, Code, Globe2 } from "lucide-react";

export default function ArchitecturePage() {
  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased min-h-screen">
      <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-32 sm:px-6">

        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-900/50 bg-blue-900/20 px-3 py-1 text-xs text-blue-400 mb-6">
            <Layers size={14} /> System Architecture
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            The 4-Layer Institutional <br className="hidden sm:block" />
            <span className="text-gray-400">Control Plane</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-400 leading-relaxed">
            Orquestra isolates UI from logic, logic from state, and state from persistence.
            This strict topology guarantees determinism and safe AI blueprint compilation.
          </p>
        </div>

        {/* 4-Layer Diagram */}
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Surface Layer */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Globe2 size={120} />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400">
                <Globe2 size={20} />
              </div>
              <h2 className="text-2xl font-bold text-white">Client Layer (Surface)</h2>
            </div>
            <p className="text-gray-400 max-w-xl mb-6">
              The public-facing components, generated UIs, and Next.js applications that end-users interact with. Completely decoupled from underlying workflows.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Landing Pages', 'Student Portals', 'Admin Forms', 'Mobile Apps'].map(item => (
                <div key={item} className="rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-medium text-gray-300 text-center">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center -my-2 flex-col items-center">
            <div className="w-px h-8 bg-gradient-to-b from-[var(--border-default)] to-transparent"></div>
            <ArrowRight className="text-gray-600 rotate-90 my-1" size={16} />
            <div className="w-px h-8 bg-gradient-to-t from-[var(--border-default)] to-transparent"></div>
          </div>

          {/* Application Layer */}
          <div className="rounded-xl border border-purple-900/30 bg-[var(--bg-secondary)] p-8 relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-purple-600 rounded-l-xl"></div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center text-purple-400">
                <Code size={20} />
              </div>
              <h2 className="text-2xl font-bold text-white">Application Layer (Control Plane)</h2>
            </div>
            <p className="text-gray-400 max-w-xl mb-6">
              The deterministic rule engine. Parses incoming events, triggers workflow transitions, and validates state changes against schemas.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Workflow Engine', 'Schema Validator', 'FEML Middleware', 'AI Compiler'].map(item => (
                <div key={item} className="rounded border border-purple-900/30 bg-[#1e1030] px-4 py-3 text-sm font-medium text-purple-200 text-center">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center -my-2 flex-col items-center">
            <div className="w-px h-8 bg-gradient-to-b from-purple-900/30 to-transparent"></div>
            <ArrowRight className="text-gray-600 rotate-90 my-1" size={16} />
            <div className="w-px h-8 bg-gradient-to-t from-[var(--border-default)] to-transparent"></div>
          </div>

          {/* Service Layer */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center text-green-400">
                <Layers size={20} />
              </div>
              <h2 className="text-2xl font-bold text-white">Service Layer (Event Backbone)</h2>
            </div>
            <p className="text-gray-400 max-w-xl mb-6">
              Handles side-effects, third-party integrations, and streaming. Every state transition emits a structured domain event here.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Redis Streams', 'WebSockets', 'Notification Hooks', 'RBAC Guard'].map(item => (
                <div key={item} className="rounded border border-green-900/30 bg-green-900/10 px-4 py-3 text-sm font-medium text-green-400 text-center">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center -my-2 flex-col items-center">
            <div className="w-px h-8 bg-gradient-to-b from-[var(--border-default)] to-transparent"></div>
            <ArrowRight className="text-gray-600 rotate-90 my-1" size={16} />
            <div className="w-px h-8 bg-gradient-to-t from-[var(--border-default)] to-transparent"></div>
          </div>

          {/* Data Layer */}
          <div className="rounded-xl border border-gray-800 bg-[#121214] p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                <Database size={20} />
              </div>
              <h2 className="text-2xl font-bold text-white">Data Layer (Persistence)</h2>
            </div>
            <p className="text-gray-400 max-w-xl mb-6">
              Immutable storage of events, workflows, and current entity states. Strictly segregated by tenant ID.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="rounded border border-gray-800 bg-black px-4 py-3 text-sm font-medium text-gray-500">
                PostgreSQL
              </div>
              <div className="rounded border border-gray-800 bg-black px-4 py-3 text-sm font-medium text-gray-500">
                Event Store
              </div>
              <div className="rounded border border-gray-800 bg-black px-4 py-3 text-sm font-medium text-gray-500">
                Redis Cache
              </div>
              <div className="rounded border border-gray-800 bg-black px-4 py-3 text-sm font-medium text-gray-500">
                S3 (Blueprints)
              </div>
            </div>
          </div>

        </div>

        <div className="mt-24 text-center">
          <Link
            href="/docs/introduction"
            className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200 transition-colors"
          >
            Read the Documentation <ArrowRight size={16} />
          </Link>
        </div>

      </main>
    </div>
  );
}
