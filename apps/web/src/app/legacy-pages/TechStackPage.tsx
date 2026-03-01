import { Breadcrumb } from '@/components/docs/Breadcrumb';
import { AlertBox } from '@/components/docs/AlertBox';

export function TechStackPage() {
  return (
    <div className="prose-docs">
      <Breadcrumb items={[{ label: 'Docs', href: '/docs' }, { label: 'Tech Stack' }]} />

      <h1 className="text-4xl font-bold text-gray-900 mb-6">Technology Stack & Architecture</h1>

      <p className="text-lg text-gray-700 mb-6">
        Orquestra was built with modern, production-ready technologies chosen for reliability, developer experience, and
        long-term maintainability.
      </p>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Backend</h2>

      <div className="space-y-4">
        <div className="bg-gray-50 border-l-4 border-green-500 p-4 rounded-r-lg">
          <h3 className="font-semibold text-gray-900 mb-2">FastAPI (Python)</h3>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Why:</strong> Async/await support, automatic OpenAPI docs, excellent performance, built-in
            validation with Pydantic
          </p>
          <p className="text-xs text-gray-600">
            Alternative considered: Django REST Framework (rejected: too heavy, synchronous by default)
          </p>
        </div>

        <div className="bg-gray-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <h3 className="font-semibold text-gray-900 mb-2">PostgreSQL</h3>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Why:</strong> ACID compliance, JSON support for flexible workflow definitions, excellent indexing,
            proven reliability at scale
          </p>
          <p className="text-xs text-gray-600">
            Alternative considered: MongoDB (rejected: no ACID guarantees, admissions data is highly relational)
          </p>
        </div>

        <div className="bg-gray-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
          <h3 className="font-semibold text-gray-900 mb-2">SQLAlchemy ORM</h3>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Why:</strong> Type-safe database access, migration support via Alembic, prevents SQL injection by
            default
          </p>
        </div>

        <div className="bg-gray-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Ollama (AI Integration)</h3>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Why:</strong> Local LLM inference (no OpenAI API costs), privacy-first (no data sent externally),
            supports multiple models
          </p>
          <p className="text-xs text-gray-600">
            Alternative considered: OpenAI API (rejected: cost, data privacy concerns, vendor lock-in)
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Frontend</h2>

      <div className="space-y-4">
        <div className="bg-gray-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <h3 className="font-semibold text-gray-900 mb-2">React 18 + TypeScript</h3>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Why:</strong> Component reusability, massive ecosystem, TypeScript catches bugs at compile time,
            concurrent rendering
          </p>
        </div>

        <div className="bg-gray-50 border-l-4 border-cyan-500 p-4 rounded-r-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Tailwind CSS v4</h3>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Why:</strong> Utility-first, no naming fatigue, purges unused CSS, excellent responsive design
            utilities
          </p>
        </div>

        <div className="bg-gray-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Radix UI</h3>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Why:</strong> Unstyled, accessible components (WCAG 2.1 AA), keyboard navigation out of the box,
            full control over styling
          </p>
        </div>

        <div className="bg-gray-50 border-l-4 border-pink-500 p-4 rounded-r-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Framer Motion</h3>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Why:</strong> Declarative animations, gesture support, layout animations, excellent performance
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Infrastructure & DevOps</h2>

      <div className="space-y-4">
        <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Docker + Docker Compose</h3>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Why:</strong> Reproducible local development, easy deployment, isolation between services
          </p>
        </div>

        <div className="bg-gray-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Nginx</h3>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Why:</strong> Reverse proxy, rate limiting, static file serving, TLS termination
          </p>
        </div>

        <div className="bg-gray-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <h3 className="font-semibold text-gray-900 mb-2">GitHub Actions</h3>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Why:</strong> CI/CD pipelines, automated testing, free for open source
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Architecture Diagram</h2>

      <div className="bg-white border-2 border-gray-300 rounded-lg p-8 my-6">
        <svg viewBox="0 0 800 600" className="w-full h-auto">
          {/* User Layer */}
          <rect x="50" y="50" width="700" height="80" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="2" rx="8" />
          <text x="400" y="90" textAnchor="middle" className="text-base font-semibold fill-gray-900">
            Users (Students, Reviewers, Admins)
          </text>

          {/* Arrow */}
          <line x1="400" y1="130" x2="400" y2="180" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrowhead)" />

          {/* Frontend Layer */}
          <g>
            <rect x="50" y="180" width="700" height="100" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" rx="8" />
            <text x="400" y="215" textAnchor="middle" className="text-base font-semibold fill-gray-900">
              Frontend (React + TypeScript)
            </text>
            <text x="400" y="240" textAnchor="middle" className="text-sm fill-gray-700">
              Tailwind • Radix UI • Framer Motion • React Router
            </text>
          </g>

          {/* Arrow */}
          <line x1="400" y1="280" x2="400" y2="330" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrowhead)" />

          {/* Backend Layer */}
          <g>
            <rect x="50" y="330" width="700" height="100" fill="#dcfce7" stroke="#22c55e" strokeWidth="2" rx="8" />
            <text x="400" y="365" textAnchor="middle" className="text-base font-semibold fill-gray-900">
              Backend (FastAPI)
            </text>
            <text x="400" y="390" textAnchor="middle" className="text-sm fill-gray-700">
              REST API • JWT Auth • Workflow Engine • RBAC
            </text>
          </g>

          {/* Arrow */}
          <line x1="400" y1="430" x2="400" y2="480" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrowhead)" />

          {/* Data Layer */}
          <g>
            <rect x="100" y="480" width="250" height="80" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" rx="8" />
            <text x="225" y="520" textAnchor="middle" className="text-base font-semibold fill-gray-900">
              PostgreSQL
            </text>
            <text x="225" y="540" textAnchor="middle" className="text-xs fill-gray-700">
              Applications, Users, Audit Logs
            </text>
          </g>

          <g>
            <rect x="450" y="480" width="250" height="80" fill="#e9d5ff" stroke="#a855f7" strokeWidth="2" rx="8" />
            <text x="575" y="520" textAnchor="middle" className="text-base font-semibold fill-gray-900">
              Ollama
            </text>
            <text x="575" y="540" textAnchor="middle" className="text-xs fill-gray-700">
              AI Screening (Local LLM)
            </text>
          </g>

          {/* Arrows to data layer */}
          <line x1="300" y1="430" x2="225" y2="480" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <line x1="500" y1="430" x2="575" y2="480" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrowhead)" />

          {/* Arrowhead marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
            </marker>
          </defs>
        </svg>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Key Design Decisions</h2>

      <AlertBox variant="info" title="Why Not Next.js?">
        While Next.js is excellent, Orquestra uses React SPA + FastAPI to maintain clear separation between frontend and
        backend. This makes it easier to scale independently and deploy to different infrastructure.
      </AlertBox>

      <div className="mt-6 space-y-3 text-gray-700">
        <p>
          <strong>Monorepo vs. Separate Repos:</strong> Chose monorepo for easier local development, but backend and
          frontend can be deployed independently
        </p>
        <p>
          <strong>REST vs. GraphQL:</strong> REST for simplicity. GraphQL adds complexity that's not needed for this use
          case
        </p>
        <p>
          <strong>Websockets:</strong> Not implemented in prototype, but architecture supports adding for real-time
          notifications
        </p>
        <p>
          <strong>Testing:</strong> Pytest for backend unit/integration tests, Vitest for frontend unit tests, Playwright
          for E2E
        </p>
      </div>
    </div>
  );
}
