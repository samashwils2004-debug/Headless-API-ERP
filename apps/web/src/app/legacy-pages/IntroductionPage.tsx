import { Breadcrumb } from '@/components/docs/Breadcrumb';
import { AlertBox } from '@/components/docs/AlertBox';
import { OnThisPage } from '@/components/docs/OnThisPage';
import { HeadingItem } from '@/types';

const headings: HeadingItem[] = [
  { id: 'what-is-orquestra', text: 'What is Orquestra?', level: 2 },
  { id: 'key-features', text: 'Key Features', level: 2 },
  { id: 'architecture', text: 'Architecture Overview', level: 2 },
  { id: 'use-cases', text: 'Use Cases', level: 2 },
];

export function IntroductionPage() {
  return (
    <>
      <div className="prose-docs">
        <Breadcrumb items={[{ label: 'Docs', href: '/docs' }, { label: 'Introduction' }]} />

        <h1 className="text-4xl font-bold text-gray-900 mb-6">Introduction to Orquestra</h1>

        <AlertBox variant="warning" title="Prototype Notice">
          Orquestra is a prototype built in 20 days to demonstrate workflow-as-code concepts. It is not production-ready
          and should not be used for real admissions processes.
        </AlertBox>

        <h2 id="what-is-orquestra" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          What is Orquestra?
        </h2>
        <p className="text-gray-700 mb-4">
          Orquestra is a workflow-as-code platform specifically designed for university admissions teams. It enables you
          to define complex application workflows in JSON, automate decisions based on configurable criteria, and
          maintain full audit trails of every action.
        </p>
        <p className="text-gray-700 mb-4">
          Unlike traditional admissions systems that hardcode business logic, Orquestra treats workflows as data. This
          means you can version control your admission criteria, test changes in isolation, and deploy updates without
          code changes.
        </p>

        <h2 id="key-features" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Key Features
        </h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
          <li>
            <strong>Workflow-as-Code:</strong> Define state machines in JSON with arbitrary transition conditions
          </li>
          <li>
            <strong>AI-Powered Screening:</strong> Integrates with Ollama to analyze essays, GPAs, and test scores
          </li>
          <li>
            <strong>Auto-Accept High Scorers:</strong> Automatically approve applications that meet configurable
            thresholds
          </li>
          <li>
            <strong>Human Review Queue:</strong> Route edge cases to admissions officers with full context
          </li>
          <li>
            <strong>Complete Audit Trail:</strong> Every state change is logged with timestamp, user, and reason
          </li>
          <li>
            <strong>Document Management:</strong> Secure upload and storage for transcripts, essays, and recommendations
          </li>
          <li>
            <strong>RBAC & Security:</strong> Role-based access control with JWT authentication and IDOR protection
          </li>
        </ul>

        <h2 id="architecture" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Architecture Overview
        </h2>
        <p className="text-gray-700 mb-4">
          Orquestra is built with a modern stack optimized for reliability and developer experience:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
          <li>
            <strong>Backend:</strong> FastAPI (Python) for high-performance async API endpoints
          </li>
          <li>
            <strong>Database:</strong> PostgreSQL with full ACID compliance for data integrity
          </li>
          <li>
            <strong>Frontend:</strong> React with TypeScript for type-safe UI development
          </li>
          <li>
            <strong>AI Integration:</strong> Ollama for local LLM inference (no external API dependencies)
          </li>
          <li>
            <strong>Authentication:</strong> JWT tokens with refresh token rotation
          </li>
        </ul>

        <h2 id="use-cases" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Use Cases
        </h2>
        <div className="space-y-4 mb-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Large State University</h3>
            <p className="text-sm text-gray-700">
              Process 50,000+ applications per cycle. Auto-accept top 20% of applicants based on GPA and test scores.
              Route the middle 60% to AI screening. Send bottom 20% and all edge cases to human reviewers.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Private Liberal Arts College</h3>
            <p className="text-sm text-gray-700">
              Holistic review with AI pre-scoring. Use workflow engine to ensure every application is reviewed by at
              least two admissions officers. Automatically flag applications with unusual patterns for committee review.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Graduate Program</h3>
            <p className="text-sm text-gray-700">
              Multi-stage review process with faculty input. Route applications to specific departments based on
              research interests. Track recommendation letter status and automatically notify applicants of missing
              materials.
            </p>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="fixed top-0 right-0 h-screen">
        <OnThisPage headings={headings} />
      </div>
    </>
  );
}
