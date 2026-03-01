import { Breadcrumb } from '@/components/docs/Breadcrumb';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { AlertBox } from '@/components/docs/AlertBox';
import { Shield, Lock, Key, FileText } from 'lucide-react';

export function SecurityPage() {
  return (
    <div className="prose-docs">
      <Breadcrumb items={[{ label: 'Docs', href: '/docs' }, { label: 'Security' }]} />

      <h1 className="text-4xl font-bold text-gray-900 mb-6">Security Architecture</h1>

      <p className="text-lg text-gray-700 mb-6">
        Orquestra implements multiple layers of security to protect sensitive student data and ensure regulatory
        compliance.
      </p>

      <AlertBox variant="warning" title="Prototype Disclaimer">
        This is a prototype implementation. A production deployment would require additional security hardening,
        penetration testing, and compliance audits.
      </AlertBox>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Security Controls Implemented</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">JWT Authentication</h3>
          </div>
          <p className="text-sm text-gray-700">
            Stateless authentication with short-lived access tokens (15 min) and refresh tokens (7 days)
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">IDOR Protection</h3>
          </div>
          <p className="text-sm text-gray-700">
            Every resource access validates ownership. Users can only view their own applications.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">RBAC</h3>
          </div>
          <p className="text-sm text-gray-700">
            Role-based access control: student, reviewer, admin. Permissions enforced at API layer.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Full Audit Trail</h3>
          </div>
          <p className="text-sm text-gray-700">
            Every state change, login, and data access is logged with user, timestamp, and IP.
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">JWT Architecture</h2>
      <p className="text-gray-700 mb-4">
        Tokens are signed with RS256 (asymmetric encryption). The private key never leaves the server.
      </p>

      <CodeBlock
        code={`{
  "sub": "user-123",
  "email": "jane@example.com",
  "role": "student",
  "exp": 1708185600,
  "iat": 1708185000,
  "jti": "unique-token-id"
}`}
        language="json"
        title="JWT Payload"
      />

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">IDOR Prevention Example</h2>
      <p className="text-gray-700 mb-4">
        Every database query includes ownership validation:
      </p>

      <CodeBlock
        code={`# WRONG: Vulnerable to IDOR
application = db.query(Application).filter_by(id=app_id).first()

# CORRECT: Validates ownership
application = (
    db.query(Application)
    .filter_by(id=app_id, user_id=current_user.id)
    .first()
)

if not application:
    raise HTTPException(status_code=404, detail="Application not found")`}
        language="python"
      />

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data Encryption</h2>
      <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
        <li>
          <strong>At Rest:</strong> PostgreSQL with full disk encryption (LUKS/dm-crypt)
        </li>
        <li>
          <strong>In Transit:</strong> TLS 1.3 for all HTTP connections
        </li>
        <li>
          <strong>Passwords:</strong> Bcrypt with cost factor 12
        </li>
        <li>
          <strong>PII Fields:</strong> AES-256 encryption for SSN, date of birth
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Compliance Considerations</h2>

      <AlertBox variant="info" title="FERPA Compliance">
        Student education records are protected under FERPA. Orquestra implements access controls, audit logs, and data
        retention policies to support FERPA compliance.
      </AlertBox>

      <div className="mt-6 space-y-3 text-gray-700">
        <p>
          <strong>GDPR (if applicable):</strong> Right to access, right to deletion, data portability endpoints
          implemented
        </p>
        <p>
          <strong>SOC 2 Type II:</strong> Audit trail, access controls, and encryption support SOC 2 requirements
        </p>
        <p>
          <strong>Data Retention:</strong> Applications retained for 7 years per university policy, then automatically
          anonymized
        </p>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Vulnerability Mitigation</h2>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 font-semibold">Threat</th>
              <th className="text-left py-2 font-semibold">Mitigation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="py-2">SQL Injection</td>
              <td className="py-2">SQLAlchemy ORM with parameterized queries</td>
            </tr>
            <tr>
              <td className="py-2">XSS</td>
              <td className="py-2">React auto-escapes output, CSP headers</td>
            </tr>
            <tr>
              <td className="py-2">CSRF</td>
              <td className="py-2">JWT tokens (not cookies), SameSite cookies for refresh tokens</td>
            </tr>
            <tr>
              <td className="py-2">Clickjacking</td>
              <td className="py-2">X-Frame-Options: DENY header</td>
            </tr>
            <tr>
              <td className="py-2">Brute Force</td>
              <td className="py-2">Rate limiting (100 req/min), account lockout after 5 failures</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AlertBox variant="warning" title="Production Deployment">
        Before deploying to production, conduct a professional security audit, implement WAF rules, enable DDoS
        protection, and obtain appropriate cyber insurance.
      </AlertBox>
    </div>
  );
}
