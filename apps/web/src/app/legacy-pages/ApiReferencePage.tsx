import { Breadcrumb } from '@/components/docs/Breadcrumb';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { AlertBox } from '@/components/docs/AlertBox';
import { Link } from 'react-router';

export function ApiReferencePage() {
  return (
    <div className="prose-docs">
      <Breadcrumb items={[{ label: 'Docs', href: '/docs' }, { label: 'API Reference' }]} />

      <h1 className="text-4xl font-bold text-gray-900 mb-6">API Reference</h1>

      <p className="text-lg text-gray-700 mb-6">
        Orquestra provides a RESTful API for all operations. All endpoints require JWT authentication except for login
        and registration.
      </p>

      <AlertBox variant="info" title="Try the Interactive Demo">
        Visit the <Link to="/demo">Live Demo page</Link> to test these endpoints with real examples.
      </AlertBox>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Authentication</h2>
      <p className="text-gray-700 mb-4">Obtain a JWT token by posting credentials to the login endpoint:</p>

      <CodeBlock
        code={`POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
}`}
        language="http"
      />

      <p className="text-gray-700 my-4">Include the token in subsequent requests:</p>

      <CodeBlock
        code={`Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...`}
        language="http"
      />

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Applications</h2>

      <div className="space-y-6">
        <div className="border-l-4 border-green-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">POST /api/applications</h3>
          <p className="text-sm text-gray-600 mb-2">Submit a new application</p>
          <CodeBlock
            code={`{
  "student_name": "Jane Smith",
  "email": "jane@example.com",
  "gpa": 3.8,
  "sat_score": 1450,
  "essay": "My passion for computer science..."
}`}
            language="json"
          />
        </div>

        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">GET /api/applications/:id</h3>
          <p className="text-sm text-gray-600 mb-2">Retrieve application details</p>
          <CodeBlock
            code={`{
  "application_id": "APP-2024-12345",
  "student_name": "Jane Smith",
  "status": "auto_accepted",
  "ai_score": 92,
  "workflow_state": "AUTO_ACCEPTED"
}`}
            language="json"
          />
        </div>

        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">GET /api/applications</h3>
          <p className="text-sm text-gray-600 mb-2">List all applications (paginated)</p>
          <CodeBlock
            code={`Query params:
?page=1&limit=50&status=under_review&sort=created_at_desc`}
            language="http"
          />
        </div>

        <div className="border-l-4 border-purple-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">PUT /api/applications/:id/review</h3>
          <p className="text-sm text-gray-600 mb-2">Submit a review decision (admin only)</p>
          <CodeBlock
            code={`{
  "decision": "accept",
  "notes": "Strong academic record and compelling essays",
  "reviewer_id": "user-123"
}`}
            language="json"
          />
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Workflows</h2>

      <div className="space-y-6">
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">GET /api/workflows/:application_id</h3>
          <p className="text-sm text-gray-600 mb-2">Get workflow state and history</p>
          <CodeBlock
            code={`{
  "current_state": "AUTO_ACCEPTED",
  "history": [
    {
      "state": "SUBMITTED",
      "timestamp": "2026-02-17T14:30:00Z",
      "user": "system"
    },
    {
      "state": "AI_SCREENING",
      "timestamp": "2026-02-17T14:30:02Z",
      "user": "system"
    },
    {
      "state": "AUTO_ACCEPTED",
      "timestamp": "2026-02-17T14:30:05Z",
      "user": "system"
    }
  ]
}`}
            language="json"
          />
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Rate Limits</h2>
      <p className="text-gray-700 mb-4">
        API requests are rate limited to 100 requests per minute per API key. Rate limit headers are included in all
        responses:
      </p>
      <CodeBlock
        code={`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708185600`}
        language="http"
      />

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Error Handling</h2>
      <p className="text-gray-700 mb-4">All errors return a consistent JSON structure:</p>
      <CodeBlock
        code={`{
  "error": "ValidationError",
  "message": "Invalid GPA value: must be between 0.0 and 4.0",
  "details": {
    "field": "gpa",
    "value": 5.2
  }
}`}
        language="json"
      />

      <AlertBox variant="info" className="my-6">
        For more examples and interactive testing, visit the <Link to="/demo">API Demo page</Link>.
      </AlertBox>
    </div>
  );
}
