import { Breadcrumb } from '@/components/docs/Breadcrumb';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { AlertBox } from '@/components/docs/AlertBox';
import { OnThisPage } from '@/components/docs/OnThisPage';
import { HeadingItem } from '@/types';

const headings: HeadingItem[] = [
  { id: 'overview', text: 'Overview', level: 2 },
  { id: 'state-definition', text: 'State Definition', level: 2 },
  { id: 'transitions', text: 'Transitions', level: 2 },
  { id: 'conditions', text: 'Condition Syntax', level: 2 },
  { id: 'example', text: 'Complete Example', level: 2 },
];

export function WorkflowEnginePage() {
  return (
    <>
      <div className="prose-docs">
        <Breadcrumb
          items={[{ label: 'Docs', href: '/docs' }, { label: 'Core Concepts' }, { label: 'Workflow Engine' }]}
        />

        <h1 className="text-4xl font-bold text-gray-900 mb-6">Workflow Engine</h1>

        <p className="text-lg text-gray-700 mb-6">
          Orquestra's workflow engine is a state machine that processes applications through a series of states based on
          configurable transition conditions. It's the core of the platform's automation capabilities.
        </p>

        <h2 id="overview" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Overview
        </h2>
        <p className="text-gray-700 mb-4">
          Each application starts in an initial state and moves through the workflow based on transition rules. The
          engine evaluates conditions in order and takes the first matching transition. All state changes are logged to
          the audit trail.
        </p>

        <h2 id="state-definition" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          State Definition
        </h2>
        <p className="text-gray-700 mb-4">States are defined in JSON with the following structure:</p>

        <CodeBlock
          code={`{
  "states": {
    "submitted": {
      "type": "initial",
      "description": "Application received",
      "transitions": [...]
    },
    "under_review": {
      "type": "intermediate",
      "description": "Manual review required",
      "transitions": [...]
    },
    "accepted": {
      "type": "terminal",
      "description": "Application accepted"
    }
  }
}`}
          language="json"
        />

        <p className="text-sm text-gray-600 mt-4">
          State types: <code>initial</code> (starting point), <code>intermediate</code> (has outgoing transitions),{' '}
          <code>terminal</code> (end state, no outgoing transitions)
        </p>

        <h2 id="transitions" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Transitions
        </h2>
        <p className="text-gray-700 mb-4">
          Transitions define how an application moves from one state to another. Each transition has a target state and
          a condition:
        </p>

        <CodeBlock
          code={`"transitions": [
  {
    "to": "auto_accepted",
    "condition": "ai_score >= 90 and gpa >= 3.5"
  },
  {
    "to": "under_review",
    "condition": "ai_score < 90 or gpa < 3.5"
  }
]`}
          language="json"
        />

        <AlertBox variant="info" title="Evaluation Order" className="my-6">
          Transitions are evaluated in the order they appear. The first matching condition wins. Always put your most
          specific conditions first.
        </AlertBox>

        <h2 id="conditions" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Condition Syntax
        </h2>
        <p className="text-gray-700 mb-4">
          Conditions use Python expression syntax with access to application fields:
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">Available Fields</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              <code>ai_score</code> - AI-generated score (0-100)
            </li>
            <li>
              <code>gpa</code> - Grade point average (0.0-4.0)
            </li>
            <li>
              <code>sat_score</code> - SAT score (400-1600)
            </li>
            <li>
              <code>act_score</code> - ACT score (1-36)
            </li>
            <li>
              <code>application_type</code> - "early_decision", "early_action", "regular"
            </li>
            <li>
              <code>legacy</code> - Boolean, true if legacy applicant
            </li>
          </ul>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">Operators</h3>
        <CodeBlock
          code={`# Comparison
ai_score >= 90
gpa > 3.5
sat_score <= 1400

# Logical
ai_score >= 90 and gpa >= 3.5
sat_score >= 1400 or act_score >= 32
not legacy

# Membership
application_type in ["early_decision", "early_action"]`}
          language="python"
        />

        <h2 id="example" className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
          Complete Example
        </h2>
        <p className="text-gray-700 mb-4">Here's a real-world workflow for undergraduate admissions:</p>

        <CodeBlock
          code={`{
  "name": "Undergraduate Admissions 2026",
  "version": "1.0.0",
  "states": {
    "submitted": {
      "type": "initial",
      "description": "Application submitted by student",
      "transitions": [
        {
          "to": "ai_screening",
          "condition": "true"
        }
      ]
    },
    "ai_screening": {
      "type": "intermediate",
      "description": "AI analyzes application",
      "transitions": [
        {
          "to": "auto_accepted",
          "condition": "ai_score >= 90 and gpa >= 3.7"
        },
        {
          "to": "auto_rejected",
          "condition": "ai_score < 30 and gpa < 2.0"
        },
        {
          "to": "under_review",
          "condition": "true"
        }
      ]
    },
    "under_review": {
      "type": "intermediate",
      "description": "Manual review by admissions officer",
      "transitions": [
        {
          "to": "accepted",
          "condition": "reviewer_decision == 'accept'"
        },
        {
          "to": "waitlisted",
          "condition": "reviewer_decision == 'waitlist'"
        },
        {
          "to": "rejected",
          "condition": "reviewer_decision == 'reject'"
        }
      ]
    },
    "auto_accepted": {
      "type": "terminal",
      "description": "Automatically accepted"
    },
    "accepted": {
      "type": "terminal",
      "description": "Accepted after review"
    },
    "waitlisted": {
      "type": "terminal",
      "description": "Placed on waitlist"
    },
    "rejected": {
      "type": "terminal",
      "description": "Application rejected"
    },
    "auto_rejected": {
      "type": "terminal",
      "description": "Automatically rejected"
    }
  }
}`}
          language="json"
        />

        <AlertBox variant="success" title="Pro Tip" className="my-6">
          Store your workflow definitions in Git alongside your code. This gives you version control, code review, and
          rollback capabilities for your business logic.
        </AlertBox>
      </div>

      <div className="fixed top-0 right-0 h-screen">
        <OnThisPage headings={headings} />
      </div>
    </>
  );
}
