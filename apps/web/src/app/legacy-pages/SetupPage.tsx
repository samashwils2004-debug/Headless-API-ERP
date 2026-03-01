import { Breadcrumb } from '@/components/docs/Breadcrumb';
import { AlertBox } from '@/components/docs/AlertBox';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { OnThisPage } from '@/components/docs/OnThisPage';
import { HeadingItem } from '@/types';

const headings: HeadingItem[] = [
  { id: 'prerequisites', text: 'Prerequisites', level: 2 },
  { id: 'installation', text: 'Installation', level: 2 },
  { id: 'configuration', text: 'Configuration', level: 2 },
  { id: 'running', text: 'Running the Application', level: 2 },
];

export function SetupPage() {
  return (
    <>
      <div className="prose-docs">
        <Breadcrumb items={[{ label: 'Docs', href: '/docs' }, { label: 'Quick Setup' }]} />

        <h1 className="text-4xl font-bold text-gray-900 mb-6">Quick Setup Guide</h1>

        <p className="text-lg text-gray-700 mb-6">
          Get Orquestra running locally in under 5 minutes. This guide assumes you have basic familiarity with Python,
          Node.js, and PostgreSQL.
        </p>

        <h2 id="prerequisites" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Prerequisites
        </h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
          <li>Python 3.11+ with pip</li>
          <li>Node.js 18+ with npm/yarn</li>
          <li>PostgreSQL 15+</li>
          <li>Ollama (optional, for AI features)</li>
        </ul>

        <h2 id="installation" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Installation
        </h2>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Clone the repository</h3>
          <CodeBlock
            code={`git clone https://github.com/yourusername/orquestra.git
cd orquestra`}
            language="bash"
          />
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Install backend dependencies</h3>
          <CodeBlock
            code={`cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt`}
            language="bash"
          />
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Install frontend dependencies</h3>
          <CodeBlock
            code={`cd ../frontend
npm install`}
            language="bash"
          />
        </div>

        <h2 id="configuration" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Configuration
        </h2>

        <p className="text-gray-700 mb-4">Create a <code>.env</code> file in the backend directory:</p>

        <CodeBlock
          code={`DATABASE_URL=postgresql://postgres:password@localhost:5432/orquestra
SECRET_KEY=your-secret-key-here-change-in-production
OLLAMA_HOST=http://localhost:11434
ENVIRONMENT=development`}
          language="bash"
          title="backend/.env"
        />

        <AlertBox variant="warning" title="Security Warning" className="my-6">
          Never commit your <code>.env</code> file to version control. The SECRET_KEY should be a cryptographically
          secure random string in production.
        </AlertBox>

        <h2 id="running" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Running the Application
        </h2>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Start the database</h3>
          <CodeBlock
            code={`# Using Docker (recommended)
docker-compose up -d postgres

# Or start PostgreSQL manually
createdb orquestra`}
            language="bash"
          />
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Run database migrations</h3>
          <CodeBlock
            code={`cd backend
alembic upgrade head`}
            language="bash"
          />
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Start the backend</h3>
          <CodeBlock
            code={`uvicorn app.main:app --reload`}
            language="bash"
          />
          <p className="text-sm text-gray-600 mt-2">The API will be available at http://localhost:8000</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Start the frontend</h3>
          <CodeBlock
            code={`cd frontend
npm run dev`}
            language="bash"
          />
          <p className="text-sm text-gray-600 mt-2">The UI will be available at http://localhost:5173</p>
        </div>

        <AlertBox variant="success" title="Success!" className="my-6">
          You should now have Orquestra running locally! Visit http://localhost:5173 to see the application. Use the
          demo credentials: <strong>admin@example.com</strong> / <strong>password123</strong>
        </AlertBox>
      </div>

      <div className="fixed top-0 right-0 h-screen">
        <OnThisPage headings={headings} />
      </div>
    </>
  );
}
