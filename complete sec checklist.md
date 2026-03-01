# Complete Security Controls Checklist

**Hackathon Prototype vs Production Requirements**

> ⚠️ **Reality Check:** You're building a **15-20 day hackathon prototype**. This document shows what you HAVE, what you DON'T HAVE, and what's appropriate for each stage.

---

## 📊 Quick Security Score

| Category | Prototype Status | Score | Production Required |
|----------|------------------|-------|---------------------|
| **Input Security** | ⚠️ Partial | 4/10 | 9/10 |
| **Authentication** | ⚠️ Basic | 5/10 | 9/10 |
| **Data Protection** | ⚠️ Minimal | 3/10 | 10/10 |
| **Infrastructure** | ❌ Missing | 2/10 | 9/10 |
| **Monitoring** | ❌ None | 1/10 | 8/10 |
| **OVERALL** | ⚠️ Demo-Ready | **3.5/10** | **9/10** |

**Verdict:** 
- ✅ **Safe for hackathon demo** (fake data, closed environment)
- ❌ **NOT safe for production** (real users, internet-facing)

---

## 1️⃣ Input Validation & Sanitization (XSS Prevention)

### ❓ Your Question:
> "preventing cross-site scripting, XSS"

### 📊 Current Status: ⚠️ PARTIAL (3/10)

#### ✅ What You HAVE:
```python
# Pydantic type validation
class ApplicantCreate(BaseModel):
    name: str          # ✓ Type checked
    email: EmailStr    # ✓ Email format validated
    phone: Optional[str]
```

#### ❌ What's MISSING:

**A. No HTML Sanitization**
```python
# CURRENT CODE (VULNERABLE):
name: str  # Accepts: <script>alert('XSS')</script>

# PRODUCTION FIX:
from pydantic import field_validator
import bleach

class ApplicantCreate(BaseModel):
    name: str
    
    @field_validator('name')
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return bleach.clean(v, tags=[], strip=True)
```

**B. No Output Encoding**
```python
# PRODUCTION: Always encode when rendering
from markupsafe import escape

# In API responses
return {"name": escape(applicant.name)}
```

**C. No Context-Aware Sanitization**
```python
# PRODUCTION: Different sanitization for different contexts
class ApplicationCreate(BaseModel):
    custom_fields: Optional[dict] = None
    
    @field_validator('custom_fields')
    @classmethod
    def sanitize_custom_fields(cls, v):
        if not v:
            return v
        
        sanitized = {}
        for key, value in v.items():
            # Sanitize keys
            clean_key = bleach.clean(str(key), tags=[], strip=True)
            
            # Sanitize values based on type
            if isinstance(value, str):
                clean_value = bleach.clean(value, tags=[], strip=True)
            else:
                clean_value = value
            
            sanitized[clean_key] = clean_value
        
        return sanitized
```

### 🎯 Hackathon Verdict:
- ⚠️ **For Demo:** Acceptable (no real users, demo data only)
- ❌ **For Production:** Critical gap - MUST add sanitization

### ⏱️ Quick Fix (30 minutes):
```bash
pip install bleach
# Add validators to schemas.py (see SECURITY_ASSESSMENT.md)
```

---

## 2️⃣ Secure Authentication (MFA)

### ❓ Your Question:
> "secure authentication (MFA)"

### 📊 Current Status: ❌ MISSING (2/10)

#### ✅ What You HAVE:
```python
# Basic JWT + bcrypt password hashing
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-me")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_token(user_id: int, email: str) -> str:
    data = {"sub": str(user_id), "email": email, "exp": ...}
    return jwt.encode(data, SECRET_KEY, algorithm="HS256")
```

#### ❌ What's MISSING:

**A. No MFA Implementation**
```python
# PRODUCTION: Add TOTP-based MFA
import pyotp
from datetime import datetime

class User(Base):
    # ... existing fields
    mfa_secret = Column(String(32))  # TOTP secret
    mfa_enabled = Column(Boolean, default=False)
    mfa_backup_codes = Column(JSON)  # Encrypted backup codes

# Setup MFA
@router.post("/auth/mfa/setup")
def setup_mfa(user: User = Depends(get_current_user), db: Session = ...):
    # Generate secret
    secret = pyotp.random_base32()
    user.mfa_secret = secret
    
    # Generate backup codes
    backup_codes = [pyotp.random_base32()[:8] for _ in range(10)]
    user.mfa_backup_codes = backup_codes
    
    db.commit()
    
    # Generate QR code
    totp = pyotp.TOTP(secret)
    qr_uri = totp.provisioning_uri(user.email, issuer_name="Admissions ERP")
    
    return {
        "secret": secret,
        "qr_uri": qr_uri,
        "backup_codes": backup_codes
    }

# Enable MFA
@router.post("/auth/mfa/enable")
def enable_mfa(code: str, user: User = Depends(get_current_user), db: Session = ...):
    totp = pyotp.TOTP(user.mfa_secret)
    
    if not totp.verify(code, valid_window=1):
        raise HTTPException(400, "Invalid MFA code")
    
    user.mfa_enabled = True
    db.commit()
    
    return {"message": "MFA enabled successfully"}

# Login with MFA
@router.post("/auth/login")
def login(data: LoginRequest, db: Session = ...):
    user = db.query(User).filter_by(email=data.email).first()
    
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    
    # Check if MFA is enabled
    if user.mfa_enabled:
        # Issue temporary token valid for 5 minutes
        temp_token = create_temp_token(user.id, expires_minutes=5)
        return {
            "requires_mfa": True,
            "temp_token": temp_token
        }
    
    # No MFA - issue regular token
    return {"access_token": create_token(user.id, user.email)}

# Verify MFA
@router.post("/auth/mfa/verify")
def verify_mfa(temp_token: str, mfa_code: str, db: Session = ...):
    # Verify temp token
    user_id = verify_temp_token(temp_token)
    user = db.query(User).get(user_id)
    
    # Verify MFA code
    totp = pyotp.TOTP(user.mfa_secret)
    
    if totp.verify(mfa_code, valid_window=1):
        # Success - issue regular token
        return {"access_token": create_token(user.id, user.email)}
    
    # Check backup codes
    if mfa_code in user.mfa_backup_codes:
        # Remove used backup code
        user.mfa_backup_codes.remove(mfa_code)
        db.commit()
        return {"access_token": create_token(user.id, user.email)}
    
    raise HTTPException(401, "Invalid MFA code")
```

**B. No Password Complexity Requirements**
```python
# PRODUCTION: Enforce strong passwords
import re

def validate_password_strength(password: str) -> None:
    if len(password) < 12:
        raise ValueError("Password must be at least 12 characters")
    
    if not re.search(r'[A-Z]', password):
        raise ValueError("Password must contain uppercase letter")
    
    if not re.search(r'[a-z]', password):
        raise ValueError("Password must contain lowercase letter")
    
    if not re.search(r'[0-9]', password):
        raise ValueError("Password must contain number")
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValueError("Password must contain special character")
    
    # Check against common passwords
    with open('common_passwords.txt') as f:
        common = f.read().splitlines()
    
    if password.lower() in common:
        raise ValueError("Password is too common")

@router.post("/auth/register")
def register(data: RegisterRequest, db: Session = ...):
    # Validate password strength
    validate_password_strength(data.password)
    
    # ... rest of registration
```

**C. No Account Lockout (Brute Force Protection)**
```python
# PRODUCTION: Lock account after failed attempts
class User(Base):
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    last_failed_attempt = Column(DateTime)

@router.post("/auth/login")
def login(data: LoginRequest, db: Session = ...):
    user = db.query(User).filter_by(email=data.email).first()
    
    # Check if locked
    if user and user.locked_until:
        if user.locked_until > datetime.utcnow():
            remaining = (user.locked_until - datetime.utcnow()).seconds
            raise HTTPException(
                403,
                f"Account locked. Try again in {remaining // 60} minutes"
            )
        else:
            # Unlock
            user.locked_until = None
            user.failed_login_attempts = 0
    
    # Verify password
    if not user or not verify_password(data.password, user.password_hash):
        if user:
            user.failed_login_attempts += 1
            user.last_failed_attempt = datetime.utcnow()
            
            # Lock after 5 failed attempts
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.utcnow() + timedelta(minutes=30)
                
                # Send email notification
                send_email(
                    user.email,
                    "Account Locked",
                    f"Your account has been locked due to {user.failed_login_attempts} failed login attempts"
                )
            
            db.commit()
        
        raise HTTPException(401, "Invalid credentials")
    
    # Reset on successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    
    # ... continue with login
```

### 🎯 Hackathon Verdict:
- ✅ **For Demo:** Current JWT auth is fine
- ❌ **For Production:** MUST add MFA + lockout

### ⏱️ Quick Fix: NOT RECOMMENDED
MFA is 4-6 hours of work. Skip for hackathon, add for production.

---

## 3️⃣ Parameterized Queries (SQL Injection Prevention)

### ❓ Your Question:
> "preventing SQLi, using ORMs or database libraries"

### 📊 Current Status: ✅ PROTECTED (9/10)

#### ✅ What You HAVE:
```python
# SQLAlchemy ORM - automatically parameterized
app = db.query(Application).filter_by(id=id, institution_id=1).first()

# This generates: SELECT * FROM applications WHERE id = ? AND institution_id = ?
# Parameters are safely bound, not concatenated
```

**Behind the scenes (what SQLAlchemy does):**
```python
# SAFE (what you write):
db.query(User).filter_by(email=email).first()

# SQLAlchemy compiles to:
# Query: SELECT * FROM users WHERE email = :email
# Params: {"email": "user@example.com"}

# NOT this (vulnerable):
# f"SELECT * FROM users WHERE email = '{email}'"  # ❌ NEVER DO THIS
```

#### ⚠️ Minor Gaps:

**A. No Query Timeout**
```python
# PRODUCTION: Add query timeout to prevent DoS
from sqlalchemy import event
from sqlalchemy.pool import Pool

@event.listens_for(Pool, "connect")
def set_query_timeout(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("SET statement_timeout = '30s'")  # PostgreSQL
    cursor.close()
```

**B. Raw SQL (if used anywhere) should be parameterized**
```python
# IF you ever need raw SQL (you don't currently):

# WRONG (vulnerable):
db.execute(f"SELECT * FROM users WHERE email = '{email}'")  # ❌

# RIGHT (safe):
from sqlalchemy import text
db.execute(
    text("SELECT * FROM users WHERE email = :email"),
    {"email": email}
)  # ✅
```

### 🎯 Hackathon Verdict:
- ✅ **For Demo:** Fully protected - SQLAlchemy handles this
- ✅ **For Production:** Already good, just add query timeouts

### ⏱️ Quick Fix: NONE NEEDED ✅
You're already protected!

---

## 4️⃣ HTTPS Everywhere (TLS 1.3 + HSTS)

### ❓ Your Question:
> "enforce TLS 1.3, use HTTPS strict transport security (HSTS)"

### 📊 Current Status: ❌ NOT ENFORCED (0/10)

#### ❌ What You DON'T HAVE:
```bash
# Current: Running HTTP only
uvicorn app.main:app --reload  # Port 8000, HTTP
```

#### 🔒 PRODUCTION Requirements:

**A. Force HTTPS Redirect**
```python
# main.py
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

**B. Add HSTS Header**
```python
# main.py
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    if os.getenv("ENVIRONMENT") == "production":
        # HSTS: Force HTTPS for 1 year, include subdomains
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        
        # Other security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
    
    return response
```

**C. TLS 1.3 Configuration**
```bash
# PRODUCTION: Uvicorn with TLS 1.3
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 443 \
  --ssl-keyfile=/etc/ssl/private/key.pem \
  --ssl-certfile=/etc/ssl/certs/cert.pem \
  --ssl-version=TLSv1_3 \
  --ssl-cert-reqs=2 \
  --ssl-ciphers='ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256'
```

**D. Or Use Reverse Proxy (Recommended)**
```nginx
# nginx.conf (PRODUCTION PREFERRED)
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # TLS 1.3 only
    ssl_protocols TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # SSL certificate
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    
    # Proxy to FastAPI
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 🎯 Hackathon Verdict:
- ✅ **For Demo:** HTTP localhost is fine
- ❌ **For Production:** CRITICAL - MUST enforce HTTPS/TLS 1.3

### ⏱️ Quick Fix: NOT NEEDED for demo
Add this when deploying to production.

---

## 5️⃣ Principle of Least Privilege (PoLP)

### ❓ Your Question:
> "PoLP"

### 📊 Current Status: ⚠️ PARTIAL (4/10)

#### ⚠️ What You HAVE (Basic):
```python
# Simple role field
class User(Base):
    role = Column(String(50), default="admin")

# But everything defaults to admin!
# And no granular permissions
```

#### ❌ What's MISSING:

**A. Granular Permissions**
```python
# PRODUCTION: Permission-based access control
from enum import Enum

class Permission(str, Enum):
    # Application permissions
    VIEW_OWN_APPLICATIONS = "view_own_applications"
    VIEW_ALL_APPLICATIONS = "view_all_applications"
    SUBMIT_APPLICATIONS = "submit_applications"
    APPROVE_APPLICATIONS = "approve_applications"
    REJECT_APPLICATIONS = "reject_applications"
    
    # Workflow permissions
    VIEW_WORKFLOWS = "view_workflows"
    EDIT_WORKFLOWS = "edit_workflows"
    CREATE_WORKFLOWS = "create_workflows"
    
    # Admin permissions
    MANAGE_USERS = "manage_users"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    MANAGE_PROGRAMS = "manage_programs"

ROLE_PERMISSIONS = {
    "applicant": [
        Permission.VIEW_OWN_APPLICATIONS,
        Permission.SUBMIT_APPLICATIONS,
    ],
    "reviewer": [
        Permission.VIEW_ALL_APPLICATIONS,
        Permission.APPROVE_APPLICATIONS,
        Permission.REJECT_APPLICATIONS,
        Permission.VIEW_WORKFLOWS,
    ],
    "department_head": [
        Permission.VIEW_ALL_APPLICATIONS,
        Permission.APPROVE_APPLICATIONS,
        Permission.REJECT_APPLICATIONS,
        Permission.VIEW_WORKFLOWS,
        Permission.MANAGE_PROGRAMS,
    ],
    "admin": [perm for perm in Permission],  # All permissions
}

def has_permission(user: User, permission: Permission) -> bool:
    """Check if user has specific permission."""
    return permission in ROLE_PERMISSIONS.get(user.role, [])

def require_permission(permission: Permission):
    """Decorator to require specific permission."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, user: User = Depends(get_current_user), **kwargs):
            if not has_permission(user, permission):
                raise HTTPException(
                    403,
                    f"Permission denied. Required: {permission.value}"
                )
            return await func(*args, user=user, **kwargs)
        return wrapper
    return decorator

# Usage:
@router.post("/applications/{id}/transition")
@require_permission(Permission.APPROVE_APPLICATIONS)
async def transition_application(
    id: int,
    data: TransitionRequest,
    user: User = Depends(get_current_user)
):
    # Only users with approve permission can execute
    pass

@router.get("/admin/audit-log")
@require_permission(Permission.VIEW_AUDIT_LOGS)
async def get_audit_log(user: User = Depends(get_current_user)):
    # Only admins can view audit logs
    pass
```

**B. Database-Level PoLP**
```sql
-- PRODUCTION: Database user with minimal permissions

-- Application user (NOT root!)
CREATE USER admissions_app WITH PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE admissions TO admissions_app;
GRANT SELECT, INSERT, UPDATE ON applications TO admissions_app;
GRANT SELECT ON programs TO admissions_app;
GRANT SELECT ON workflow_definitions TO admissions_app;

-- NO DELETE permission (soft delete only)
-- NO ALTER TABLE permission
-- NO DROP permission
```

**C. API Key Scoping**
```python
# PRODUCTION: Scoped API keys
class APIKey(Base):
    key_hash = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    permissions = Column(JSON)  # Subset of user permissions
    expires_at = Column(DateTime)
    last_used = Column(DateTime)

@router.post("/api-keys")
async def create_api_key(
    permissions: List[Permission],
    expires_days: int = 30,
    user: User = Depends(get_current_user)
):
    # Validate user has these permissions
    for perm in permissions:
        if not has_permission(user, perm):
            raise HTTPException(403, f"Cannot grant permission you don't have: {perm}")
    
    # Generate key
    key = secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    
    api_key = APIKey(
        key_hash=key_hash,
        user_id=user.id,
        permissions=[p.value for p in permissions],
        expires_at=datetime.utcnow() + timedelta(days=expires_days)
    )
    db.add(api_key)
    db.commit()
    
    # Return key ONCE (never stored plain)
    return {"api_key": key, "expires_at": api_key.expires_at}
```

### 🎯 Hackathon Verdict:
- ⚠️ **For Demo:** Simple admin role is OK
- ❌ **For Production:** MUST implement granular permissions

### ⏱️ Quick Fix (2 hours):
Implement permission enum and decorator (see code above).

---

## 6️⃣ Software Composition Analysis (SCA)

### ❓ Your Question:
> "SCA"

### 📊 Current Status: ❌ NOT DONE (0/10)

#### ❌ What You DON'T HAVE:
```python
# No dependency vulnerability scanning
```

#### 🔍 PRODUCTION Requirements:

**A. Safety Check (Python)**
```bash
# Install safety
pip install safety

# Check for known vulnerabilities
safety check

# In requirements.txt
# fastapi==0.104.1  # Vulnerable version
# fastapi==0.108.0  # Patched version

# Output example:
# +==============================================================================+
# |                                                                              |
# |                               /$$$$$$            /$$                         |
# |                              /$$__  $$          | $$                         |
# |           /$$$$$$$  /$$$$$$ | $$  \__//$$$$$$  /$$$$$$   /$$   /$$           |
# |          /$$_____/ |____  $$| $$$$   /$$__  $$|_  $$_/  | $$  | $$           |
# |         |  $$$$$$   /$$$$$$$| $$_/  | $$$$$$$$  | $$    | $$  | $$           |
# |          \____  $$ /$$__  $$| $$    | $$_____/  | $$ /$$| $$  | $$           |
# |          /$$$$$$$/|  $$$$$$$| $$    |  $$$$$$$  |  $$$$/|  $$$$$$$           |
# |         |_______/  \_______/|__/     \_______/   \___/   \____  $$           |
# |                                                           /$$  | $$           |
# |                                                          |  $$$$$$/           |
# |  by pyup.io                                              \______/            |
# |                                                                              |
# +==============================================================================+
# | REPORT                                                                       |
# +============================+===========+==========================+==========+
# | package                    | installed | affected                 | ID       |
# +============================+===========+==========================+==========+
# | fastapi                    | 0.104.1   | <0.108.0                 | 51234    |
# +============================+===========+==========================+==========+
```

**B. GitHub Dependabot**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-username"
    labels:
      - "dependencies"
      - "security"
```

**C. Snyk Integration**
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/python@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Run Safety check
        run: |
          pip install safety
          safety check --json --output safety-report.json
      
      - name: Upload Safety report
        uses: actions/upload-artifact@v3
        with:
          name: safety-report
          path: safety-report.json
```

**D. OWASP Dependency Check**
```bash
# Install
wget https://github.com/jeremylong/DependencyCheck/releases/download/v8.4.0/dependency-check-8.4.0-release.zip
unzip dependency-check-8.4.0-release.zip

# Run
./dependency-check/bin/dependency-check.sh \
  --project "Admissions ERP" \
  --scan backend/requirements.txt \
  --format HTML \
  --out dependency-check-report.html
```

### 🎯 Hackathon Verdict:
- ✅ **For Demo:** Not needed
- ❌ **For Production:** MUST run weekly scans

### ⏱️ Quick Fix (15 minutes):
```bash
pip install safety
safety check
# Fix any critical vulnerabilities found
```

---

## 7️⃣ Content Security Policy (CSP)

### ❓ Your Question:
> "CSP"

### 📊 Current Status: ❌ MISSING (0/10)

#### ❌ What You DON'T HAVE:
```python
# No CSP headers
```

#### 🛡️ PRODUCTION Requirements:

**A. Strict CSP Headers**
```python
# main.py
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Content Security Policy
    csp = (
        "default-src 'none'; "  # Deny everything by default
        "script-src 'self'; "   # Scripts only from same origin
        "style-src 'self' 'unsafe-inline'; "  # Styles (inline needed for Tailwind)
        "img-src 'self' data: https:; "  # Images from self, data URIs, HTTPS
        "font-src 'self'; "  # Fonts only from same origin
        "connect-src 'self'; "  # API calls only to same origin
        "frame-ancestors 'none'; "  # Prevent clickjacking
        "base-uri 'self'; "  # Prevent base tag injection
        "form-action 'self'; "  # Forms only submit to same origin
        "upgrade-insecure-requests;"  # Upgrade HTTP to HTTPS
    )
    
    response.headers["Content-Security-Policy"] = csp
    
    # Report violations (optional but recommended)
    response.headers["Content-Security-Policy-Report-Only"] = (
        csp + " report-uri /api/csp-violations;"
    )
    
    return response

# CSP violation reporting endpoint
@app.post("/api/csp-violations")
async def csp_violations(request: Request):
    violation = await request.json()
    
    # Log violation
    logger.warning(f"CSP Violation: {violation}")
    
    # Store in database for analysis
    db.add(CSPViolation(
        document_uri=violation.get('document-uri'),
        violated_directive=violation.get('violated-directive'),
        blocked_uri=violation.get('blocked-uri'),
        timestamp=datetime.utcnow()
    ))
    db.commit()
    
    return {"status": "logged"}
```

**B. CSP for API (Simpler)**
```python
# For API-only backend (no HTML rendering)
response.headers["Content-Security-Policy"] = "default-src 'none'"
```

### 🎯 Hackathon Verdict:
- ✅ **For Demo:** Not needed (API backend)
- ⚠️ **For Production:** Add if serving HTML; skip for pure API

### ⏱️ Quick Fix: SKIP
Only needed if you serve HTML. Your API doesn't need CSP.

---

## 8️⃣ WAAP (Web Application & API Protection)

### ❓ Your Question:
> "WAAP (api security)"

### 📊 Current Status: ❌ NOT IMPLEMENTED (0/10)

#### ❌ What You DON'T HAVE:
```python
# No WAF/WAAP
```

#### 🛡️ PRODUCTION Options:

**A. CloudFlare (Recommended - Easy)**
```yaml
# CloudFlare WAF Rules (via dashboard)
- OWASP Top 10 Protection: ON
- Rate Limiting: 1000 requests/minute per IP
- DDoS Protection: ON
- Bot Management: Challenge bots
- Firewall Rules:
    - Block countries: [List of high-risk countries]
    - Challenge suspicious User-Agents
    - Block tor exit nodes
```

**B. AWS WAF**
```yaml
# AWS WAF CloudFormation
Resources:
  WebACL:
    Type: AWS::WAFv2::WebACL
    Properties:
      Scope: REGIONAL
      DefaultAction:
        Allow: {}
      Rules:
        # Rate limiting
        - Name: RateLimitRule
          Priority: 1
          Statement:
            RateBasedStatement:
              Limit: 2000
              AggregateKeyType: IP
          Action:
            Block:
              CustomResponse:
                ResponseCode: 429
        
        # SQL injection protection
        - Name: SQLiProtection
          Priority: 2
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesSQLiRuleSet
          Action:
            Block: {}
        
        # XSS protection
        - Name: XSSProtection
          Priority: 3
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesKnownBadInputsRuleSet
          Action:
            Block: {}
        
        # Bot protection
        - Name: BotProtection
          Priority: 4
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesBotControlRuleSet
          Action:
            Block: {}
```

**C. ModSecurity (Self-Hosted)**
```nginx
# nginx.conf with ModSecurity
load_module modules/ngx_http_modsecurity_module.so;

http {
    modsecurity on;
    modsecurity_rules_file /etc/nginx/modsec/main.conf;
    
    server {
        listen 443 ssl;
        
        # ModSecurity rules
        modsecurity_rules '
            SecRuleEngine On
            SecRequestBodyAccess On
            SecRule REQUEST_HEADERS:Content-Type "text/xml" \
                "id:200000,phase:1,t:none,t:lowercase,pass,nolog,ctl:requestBodyProcessor=XML"
            
            # OWASP Core Rule Set
            Include /etc/nginx/modsec/coreruleset/*.conf
        ';
        
        location / {
            proxy_pass http://localhost:8000;
        }
    }
}
```

### 🎯 Hackathon Verdict:
- ✅ **For Demo:** Not needed
- ⚠️ **For Production:** Recommended but expensive ($50-200/month)

### ⏱️ Quick Fix: SKIP
Too expensive and complex for hackathon. Add when you have budget.

---

## 9️⃣ JSON Web Tokens (JWT) Properly

### ❓ Your Question:
> "using JSON web tokens (JWT) properly"

### 📊 Current Status: ⚠️ BASIC (5/10)

#### ⚠️ What You HAVE (Basic):
```python
# Simple JWT
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-me")
ALGORITHM = "HS256"

def create_token(user_id: int, email: str) -> str:
    data = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=24),
    }
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
```

#### ❌ What's MISSING (Proper JWT):

**A. No Token Rotation**
```python
# PRODUCTION: Refresh token pattern
def create_token_pair(user_id: int, email: str):
    # Short-lived access token (15 minutes)
    access_token = jwt.encode({
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),  # JWT ID for revocation
    }, SECRET_KEY, algorithm=ALGORITHM)
    
    # Long-lived refresh token (30 days)
    refresh_token = jwt.encode({
        "sub": str(user_id),
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=30),
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),
    }, SECRET_KEY, algorithm=ALGORITHM)
    
    # Store refresh token hash in DB (for revocation)
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    db.add(RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(days=30)
    ))
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "expires_in": 900  # 15 minutes in seconds
    }

@router.post("/auth/refresh")
def refresh_tokens(refresh_token: str, db: Session = ...):
    try:
        # Verify refresh token
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        
        # Check if token is revoked
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored_token = db.query(RefreshToken).filter_by(token_hash=token_hash).first()
        
        if not stored_token or stored_token.revoked:
            raise HTTPException(401, "Token revoked")
        
        user_id = int(payload["sub"])
        user = db.query(User).get(user_id)
        
        # Revoke old refresh token
        stored_token.revoked = True
        db.commit()
        
        # Issue new token pair
        return create_token_pair(user.id, user.email)
        
    except JWTError:
        raise HTTPException(401, "Invalid token")
```

**B. No Key Rotation**
```python
# PRODUCTION: Multiple signing keys with rotation
class JWTKey(Base):
    kid = Column(String, primary_key=True)  # Key ID
    secret = Column(String, nullable=False)  # Encrypted
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)

def get_current_key(db: Session) -> JWTKey:
    """Get active signing key."""
    return db.query(JWTKey).filter_by(is_active=True).first()

def create_token_with_kid(user_id: int, email: str, db: Session):
    """Create token with key ID."""
    key = get_current_key(db)
    
    token = jwt.encode({
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "iat": datetime.utcnow(),
    }, key.secret, algorithm=ALGORITHM, headers={"kid": key.kid})
    
    return token

def verify_token_with_kid(token: str, db: Session):
    """Verify token using correct key."""
    # Decode header to get kid
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    
    if not kid:
        raise HTTPException(401, "Missing key ID")
    
    # Get key from database
    key = db.query(JWTKey).filter_by(kid=kid).first()
    
    if not key:
        raise HTTPException(401, "Unknown key ID")
    
    # Verify token
    payload = jwt.decode(token, key.secret, algorithms=[ALGORITHM])
    return payload

# Rotate keys every 90 days
@router.post("/admin/rotate-jwt-key")
async def rotate_jwt_key(user: User = Depends(require_admin), db: Session = ...):
    # Deactivate current key (but keep for verification)
    current = get_current_key(db)
    current.is_active = False
    current.expires_at = datetime.utcnow() + timedelta(days=7)  # Grace period
    
    # Generate new key
    new_key = JWTKey(
        kid=str(uuid.uuid4()),
        secret=secrets.token_urlsafe(32),
        is_active=True
    )
    db.add(new_key)
    db.commit()
    
    return {"message": "Key rotated", "new_kid": new_key.kid}
```

**C. No Token Revocation**
```python
# PRODUCTION: Token revocation (logout)
class RevokedToken(Base):
    jti = Column(String, primary_key=True)  # JWT ID
    revoked_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)  # When to delete from DB

@router.post("/auth/logout")
def logout(user: User = Depends(get_current_user), db: Session = ...):
    # Get JWT ID from current token
    token = request.headers.get("Authorization").replace("Bearer ", "")
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    jti = payload.get("jti")
    
    # Revoke token
    db.add(RevokedToken(
        jti=jti,
        expires_at=datetime.fromtimestamp(payload["exp"])
    ))
    db.commit()
    
    return {"message": "Logged out successfully"}

# Check revocation in auth dependency
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    try:
        token = credentials.credentials
        payload = verify_token(token)
        
        # Check if token is revoked
        jti = payload.get("jti")
        if jti and db.query(RevokedToken).filter_by(jti=jti).first():
            raise HTTPException(401, "Token has been revoked")
        
        # ... rest of validation
```

**D. No Audience Validation**
```python
# PRODUCTION: Validate audience (prevent token reuse)
def create_token(user_id: int, email: str, audience: str = "api"):
    return jwt.encode({
        "sub": str(user_id),
        "email": email,
        "aud": audience,  # Who this token is for
        "iss": "admissions-erp",  # Who issued it
        "exp": datetime.utcnow() + timedelta(minutes=15),
    }, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str, expected_audience: str = "api"):
    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM],
        audience=expected_audience,
        issuer="admissions-erp"
    )
```

### 🎯 Hackathon Verdict:
- ⚠️ **For Demo:** Basic JWT is OK
- ❌ **For Production:** MUST add refresh tokens + revocation

### ⏱️ Quick Fix (3 hours):
Implement refresh token pattern (see code above).

---

## 🔟 Rate Limiting & Throttling

### ❓ Your Question:
> "rate limiting and throttling"

### 📊 Current Status: ❌ MISSING (0/10)

#### ❌ What You DON'T HAVE:
```python
# No rate limiting - can be spammed!
```

#### 🚦 PRODUCTION Requirements:

**A. Application-Level Rate Limiting**
```bash
# Install SlowAPI
pip install slowapi
```

```python
# main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# auth.py
@router.post("/login")
@limiter.limit("5/minute")  # 5 login attempts per minute
async def login(request: Request, data: LoginRequest, db: Session = ...):
    # ... login logic

@router.post("/register")
@limiter.limit("3/hour")  # 3 registrations per hour
async def register(request: Request, data: RegisterRequest, db: Session = ...):
    # ... registration logic

# applications.py
@router.post("/applications")
@limiter.limit("10/minute")  # 10 submissions per minute
async def submit_application(request: Request, data: ApplicationCreate, db: Session = ...):
    # ... submission logic

@router.post("/applications/{id}/documents")
@limiter.limit("20/minute")  # 20 uploads per minute
async def upload_document(request: Request, id: int, file: UploadFile, db: Session = ...):
    # ... upload logic
```

**B. Redis-Based Rate Limiting (Better for Production)**
```python
# Install redis
pip install redis

# Rate limiter with Redis
from redis import Redis
import time

redis_client = Redis(host='localhost', port=6379, db=0)

def rate_limit(key: str, limit: int, window: int) -> bool:
    """
    Check if rate limit is exceeded.
    
    Args:
        key: Unique identifier (IP, user ID, etc.)
        limit: Max requests allowed
        window: Time window in seconds
    
    Returns:
        True if allowed, False if rate limited
    """
    current = time.time()
    window_start = current - window
    
    # Use sorted set to track requests
    pipe = redis_client.pipeline()
    
    # Remove old requests
    pipe.zremrangebyscore(key, 0, window_start)
    
    # Count requests in window
    pipe.zcard(key)
    
    # Add current request
    pipe.zadd(key, {current: current})
    
    # Set expiry
    pipe.expire(key, window)
    
    result = pipe.execute()
    request_count = result[1]
    
    return request_count < limit

# Usage in endpoints
@router.post("/applications")
async def submit_application(
    request: Request,
    data: ApplicationCreate,
    user: User = Depends(get_current_user)
):
    # Rate limit by user ID
    key = f"rate_limit:applications:{user.id}"
    
    if not rate_limit(key, limit=10, window=60):  # 10 per minute
        raise HTTPException(429, "Too many requests. Please try again later.")
    
    # ... rest of logic
```

**C. Adaptive Rate Limiting**
```python
# PRODUCTION: Adjust limits based on user behavior
class RateLimitTier(Enum):
    FREE = (10, 60)  # 10 requests per minute
    STARTER = (100, 60)  # 100 requests per minute
    PROFESSIONAL = (1000, 60)  # 1000 requests per minute
    ENTERPRISE = (10000, 60)  # 10000 requests per minute

def get_rate_limit(user: User) -> tuple[int, int]:
    """Get rate limit based on subscription tier."""
    tier_map = {
        "free": RateLimitTier.FREE,
        "starter": RateLimitTier.STARTER,
        "professional": RateLimitTier.PROFESSIONAL,
        "enterprise": RateLimitTier.ENTERPRISE,
    }
    
    tier = tier_map.get(user.subscription_tier, RateLimitTier.FREE)
    return tier.value

@router.post("/applications")
async def submit_application(
    request: Request,
    data: ApplicationCreate,
    user: User = Depends(get_current_user)
):
    limit, window = get_rate_limit(user)
    key = f"rate_limit:applications:{user.id}"
    
    if not rate_limit(key, limit, window):
        raise HTTPException(
            429,
            f"Rate limit exceeded. Limit: {limit} requests per {window} seconds"
        )
    
    # ... rest of logic
```

**D. IP-Based Rate Limiting (DDoS Protection)**
```python
# Nginx rate limiting (recommended)
# nginx.conf
http {
    # Define rate limit zone
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
    
    server {
        listen 443 ssl;
        
        # Apply to all API requests
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://localhost:8000;
        }
        
        # Stricter for login
        location /api/auth/login {
            limit_req zone=login_limit burst=3 nodelay;
            proxy_pass http://localhost:8000;
        }
    }
}
```

### 🎯 Hackathon Verdict:
- ✅ **For Demo:** Not needed (closed environment)
- ❌ **For Production:** CRITICAL - MUST add before going live

### ⏱️ Quick Fix (30 minutes):
```bash
pip install slowapi
# Add to main.py (see code above)
```

---

## 1️⃣1️⃣ IDOR Protection

### ❓ Your Question:
> "IDOR protection"

### 📊 Current Status: ⚠️ PARTIAL (5/10)

#### ⚠️ What You HAVE (Partial):
```python
# Basic institution check
@router.get("/applications/{id}")
def get_application(id: int, db: Session = ...):
    app = db.query(Application).filter_by(
        id=id,
        institution_id=1  # ✓ Checks institution
    ).first()
```

#### ❌ What's MISSING:

**A. No User Ownership Check**
```python
# CURRENT (VULNERABLE):
@router.get("/applications/{id}")
def get_application(id: int, db: Session = ...):
    # Any logged-in user can view any application!
    app = db.query(Application).filter_by(id=id, institution_id=1).first()

# PRODUCTION FIX:
@router.get("/applications/{id}")
def get_application(
    id: int,
    user: User = Depends(get_current_user),
    db: Session = ...
):
    app = db.query(Application).filter_by(id=id, institution_id=1).first()
    
    if not app:
        raise HTTPException(404, "Application not found")
    
    # Check ownership
    if user.role == "applicant":
        # Applicants can only view their own applications
        if app.applicant.email != user.email:
            raise HTTPException(403, "Not authorized to view this application")
    elif user.role == "reviewer":
        # Reviewers can view all applications
        pass
    
    return app
```

**B. Predictable IDs**
```python
# CURRENT: Sequential IDs are guessable
id = Column(Integer, primary_key=True, autoincrement=True)
# IDs: 1, 2, 3, 4... (easy to guess)

# PRODUCTION: Use UUIDs
import uuid

id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
# IDs: "3f4b9c2d-8a7e-4f6d-9e1a-5b3c7d2f8e4a" (impossible to guess)
```

**C. No Object-Level Authorization**
```python
# PRODUCTION: Centralized authorization check
def check_application_access(
    application_id: str,
    user: User,
    required_action: str,
    db: Session
) -> Application:
    """
    Centralized authorization for application access.
    
    Args:
        application_id: Application ID
        user: Current user
        required_action: 'view', 'edit', 'approve', 'delete'
        db: Database session
    
    Returns:
        Application object if authorized
    
    Raises:
        HTTPException: If not authorized
    """
    app = db.query(Application).filter_by(
        id=application_id,
        institution_id=user.institution_id
    ).first()
    
    if not app:
        raise HTTPException(404, "Application not found")
    
    # Define permissions per role
    permissions = {
        "applicant": {
            "view": lambda a, u: a.applicant.email == u.email,
            "edit": lambda a, u: a.applicant.email == u.email and a.current_status == "draft",
            "approve": lambda a, u: False,
            "delete": lambda a, u: a.applicant.email == u.email and a.current_status == "draft",
        },
        "reviewer": {
            "view": lambda a, u: True,
            "edit": lambda a, u: False,
            "approve": lambda a, u: True,
            "delete": lambda a, u: False,
        },
        "admin": {
            "view": lambda a, u: True,
            "edit": lambda a, u: True,
            "approve": lambda a, u: True,
            "delete": lambda a, u: True,
        },
    }
    
    # Check if action is allowed
    role_perms = permissions.get(user.role, {})
    check_func = role_perms.get(required_action)
    
    if not check_func or not check_func(app, user):
        raise HTTPException(403, f"Not authorized to {required_action} this application")
    
    return app

# Usage:
@router.get("/applications/{id}")
def get_application(
    id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = check_application_access(id, user, "view", db)
    return app

@router.delete("/applications/{id}")
def delete_application(
    id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = check_application_access(id, user, "delete", db)
    db.delete(app)
    db.commit()
    return {"message": "Application deleted"}
```

**D. Audit IDOR Attempts**
```python
# PRODUCTION: Log potential IDOR attempts
@router.get("/applications/{id}")
def get_application(
    id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter_by(id=id).first()
    
    if not app:
        raise HTTPException(404, "Application not found")
    
    # Check if user trying to access another institution's data
    if app.institution_id != user.institution_id:
        # LOG POTENTIAL ATTACK
        db.add(SecurityIncident(
            user_id=user.id,
            incident_type="IDOR_ATTEMPT",
            details=f"User tried to access application from institution {app.institution_id}",
            severity="HIGH",
            ip_address=request.client.host
        ))
        db.commit()
        
        # Alert security team
        send_alert(
            "IDOR Attempt",
            f"User {user.email} attempted to access application {id} from different institution"
        )
        
        raise HTTPException(404, "Application not found")  # Don't reveal existence
    
    # ... rest of logic
```

### 🎯 Hackathon Verdict:
- ⚠️ **For Demo:** Basic institution check is OK
- ❌ **For Production:** MUST add ownership checks + UUIDs

### ⏱️ Quick Fix (1 hour):
1. Add ownership checks to all endpoints
2. Switch to UUIDs (requires migration)

---

## 1️⃣2️⃣ Secure File Uploads

### ❓ Your Question:
> "secure file uploads"

### 📊 Current Status: ❌ VULNERABLE (1/10)

#### ❌ What You DON'T HAVE:

```python
# CURRENT CODE (VULNERABLE):
@router.post("/applications/{id}/documents")
def upload_document(file: UploadFile = File(...)):
    # NO validation!
    ext = os.path.splitext(file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
    
    with open(file_path, "wb") as f:
        f.write(file.file.read())  # ❌ No size check, no type check, no virus scan
```

#### 🔒 PRODUCTION Requirements:

**A. File Type Validation**
```python
# Install python-magic
pip install python-magic-bin

import magic

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png'
}

@router.post("/applications/{id}/documents")
def upload_document(file: UploadFile = File(...)):
    # 1. Validate filename exists
    if not file.filename:
        raise HTTPException(400, "Filename required")
    
    # 2. Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # 3. Read content
    content = file.file.read()
    
    # 4. Validate MIME type (magic bytes)
    mime = magic.from_buffer(content, mime=True)
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"File content doesn't match extension. Detected: {mime}")
    
    # 5. Validate size
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    if len(content) > MAX_SIZE:
        raise HTTPException(400, f"File too large. Max: {MAX_SIZE / 1024 / 1024}MB")
    
    # 6. Generate safe filename
    safe_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # 7. Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # ... rest of logic
```

**B. Virus Scanning**
```python
# Install ClamAV
# Ubuntu: sudo apt-get install clamav clamav-daemon
# macOS: brew install clamav

import clamd

def scan_for_malware(file_content: bytes) -> bool:
    """
    Scan file for malware using ClamAV.
    
    Returns:
        True if clean, False if malware detected
    """
    try:
        cd = clamd.ClamdUnixSocket()
        result = cd.instream(io.BytesIO(file_content))
        
        # Result format: {'stream': ('OK', None)} or {'stream': ('FOUND', 'Virus.Name')}
        status, virus_name = result['stream']
        
        if status == 'FOUND':
            logger.warning(f"Malware detected: {virus_name}")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"Virus scan failed: {e}")
        # Fail closed - reject file if scan fails
        return False

@router.post("/applications/{id}/documents")
def upload_document(file: UploadFile = File(...)):
    # ... validation above ...
    
    # Scan for malware
    if not scan_for_malware(content):
        raise HTTPException(400, "File rejected: malware detected or scan failed")
    
    # ... save file ...
```

**C. Content Sanitization (PDFs)**
```python
# Install PyPDF2
pip install PyPDF2

from PyPDF2 import PdfReader, PdfWriter

def sanitize_pdf(input_path: str, output_path: str):
    """Remove potentially malicious content from PDF."""
    reader = PdfReader(input_path)
    writer = PdfWriter()
    
    # Copy pages (removes embedded JavaScript, etc.)
    for page in reader.pages:
        writer.add_page(page)
    
    # Remove metadata that could contain exploits
    writer.add_metadata({
        '/Creator': 'Admissions ERP',
        '/Producer': 'Admissions ERP',
    })
    
    with open(output_path, 'wb') as f:
        writer.write(f)

@router.post("/applications/{id}/documents")
def upload_document(file: UploadFile = File(...)):
    # ... validation ...
    
    # Save temporary file
    temp_path = f"/tmp/{uuid.uuid4()}.pdf"
    with open(temp_path, "wb") as f:
        f.write(content)
    
    # Sanitize PDF
    final_path = os.path.join(UPLOAD_DIR, safe_filename)
    if ext == '.pdf':
        sanitize_pdf(temp_path, final_path)
        os.remove(temp_path)
    else:
        shutil.move(temp_path, final_path)
    
    # ... rest of logic ...
```

**D. Secure Storage**
```python
# PRODUCTION: Store outside web root
UPLOAD_DIR = "/var/uploads/admissions"  # NOT in /var/www/html

# Use presigned URLs instead of direct file access
@router.get("/documents/{id}")
def get_document(id: str, user: User = Depends(get_current_user), db: Session = ...):
    doc = db.query(Document).filter_by(id=id).first()
    
    # Check authorization
    if not can_access_document(doc, user):
        raise HTTPException(403, "Not authorized")
    
    # Generate temporary URL (S3 presigned or custom)
    if ENVIRONMENT == "production":
        # S3 presigned URL
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': doc.storage_key},
            ExpiresIn=3600  # 1 hour
        )
        return {"url": url, "expires_in": 3600}
    else:
        # Local: Serve through FastAPI (still requires auth)
        return FileResponse(doc.file_path, filename=doc.file_name)
```

### 🎯 Hackathon Verdict:
- ❌ **For Demo:** Current code is unsafe
- ❌ **For Production:** CRITICAL - Must fix before ANY uploads

### ⏱️ Quick Fix (45 minutes):
```bash
pip install python-magic-bin
# Add validation (see code above - file type, size, MIME)
# Skip virus scanning for demo (too complex)
```

---

## 1️⃣3️⃣ Secrets Management

### ❓ Your Question:
> "Never hardcode API keys or database credentials. Use environment variables, secret managers"

### 📊 Current Status: ⚠️ PARTIAL (5/10)

#### ⚠️ What You HAVE:
```python
# Environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-me")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./admissions.db")
```

#### ❌ What's MISSING:

**A. Default Values Hardcoded**
```python
# CURRENT (UNSAFE):
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-me")  # ❌ Default = bad

# PRODUCTION:
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set")
```

**B. No Secret Rotation**
```python
# PRODUCTION: AWS Secrets Manager
import boto3
from functools import lru_cache

@lru_cache()
def get_secret(secret_name: str) -> dict:
    """Get secret from AWS Secrets Manager."""
    client = boto3.client('secretsmanager', region_name='us-east-1')
    
    try:
        response = client.get_secret_value(SecretId=secret_name)
        return json.loads(response['SecretString'])
    except Exception as e:
        logger.error(f"Failed to get secret {secret_name}: {e}")
        raise

class Settings(BaseSettings):
    # Load from Secrets Manager in production
    def __init__(self):
        if os.getenv("ENVIRONMENT") == "production":
            secrets = get_secret("admissions-erp/production")
            self.database_url = secrets['database_url']
            self.secret_key = secrets['secret_key']
            self.sendgrid_api_key = secrets['sendgrid_api_key']
        else:
            # Load from .env in development
            super().__init__()
```

**C. Secrets in Code/Logs**
```python
# BAD: Logging secrets
logger.info(f"Connecting to {DATABASE_URL}")  # ❌ Contains password

# GOOD: Redact secrets
def redact_url(url: str) -> str:
    """Redact password from database URL."""
    from urllib.parse import urlparse, urlunparse
    parsed = urlparse(url)
    if parsed.password:
        parsed = parsed._replace(netloc=f"{parsed.username}:****@{parsed.hostname}")
    return urlunparse(parsed)

logger.info(f"Connecting to {redact_url(DATABASE_URL)}")  # ✓ Safe
```

**D. .env in Git**
```bash
# .gitignore
.env
.env.*
!.env.example

# Committed:
.env.example  # ✓ Template only

# NOT committed:
.env  # ❌ Contains real secrets
```

### 🎯 Hackathon Verdict:
- ⚠️ **For Demo:** .env file is OK (but add to .gitignore!)
- ❌ **For Production:** MUST use Secrets Manager + no defaults

### ⏱️ Quick Fix (10 minutes):
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "!.env.example" >> .gitignore

# Remove defaults from code
# Raise error if SECRET_KEY not set
```

---

## 1️⃣4️⃣ Anti-Tampering & Code Hardening

### ❓ Your Question:
> "Use code obfuscation (ProGuard/R8), Certificate Pinning"

### 📊 Current Status: N/A (Backend API)

**Reality Check:**
- ❌ **Code Obfuscation:** NOT applicable to backend APIs (Python is interpreted)
- ❌ **Certificate Pinning:** Frontend concern, not backend

**These are MOBILE APP security measures, not relevant for your FastAPI backend.**

**IF you had a mobile app (future):**
```kotlin
// Android - Certificate Pinning
val certificatePinner = CertificatePinner.Builder()
    .add("api.yourdomain.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    .build()

val client = OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .build()
```

### 🎯 Hackathon Verdict:
- N/A - Skip this for backend API
- ⚠️ Consider IF you build mobile app later

---

## 1️⃣5️⃣ Security Testing (SAST/DAST)

### ❓ Your Question:
> "Static Analysis (SAST), Dynamic Analysis (DAST)"

### 📊 Current Status: ❌ NOT DONE (0/10)

#### ❌ What You DON'T HAVE:
```python
# No automated security testing
```

#### 🔍 PRODUCTION Requirements:

**A. SAST (Static Analysis)**
```yaml
# .github/workflows/sast.yml
name: SAST Security Scan
on: [push, pull_request]

jobs:
  bandit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Bandit (Python SAST)
        run: |
          pip install bandit
          bandit -r backend/app -f json -o bandit-report.json
      
      - name: Upload Bandit report
        uses: actions/upload-artifact@v3
        with:
          name: bandit-report
          path: bandit-report.json
  
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: "p/security-audit"
```

**B. DAST (Dynamic Analysis)**
```yaml
# .github/workflows/dast.yml
name: DAST Security Scan
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday 2am

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'https://staging.yourdomain.com'
          rules_file_name: '.zap/rules.tsv'
```

**C. Pre-Commit Hooks**
```bash
# Install pre-commit
pip install pre-commit

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.5
    hooks:
      - id: bandit
        args: ['-ll']
  
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: check-added-large-files
      - id: detect-private-key
      - id: check-yaml
      - id: check-json

# Install hooks
pre-commit install
```

### 🎯 Hackathon Verdict:
- ✅ **For Demo:** Not needed
- ❌ **For Production:** MUST add to CI/CD pipeline

### ⏱️ Quick Fix (20 minutes):
```bash
pip install bandit
bandit -r backend/app
# Fix any HIGH severity issues found
```

---

## 📋 FINAL SECURITY CHECKLIST

### For Hackathon (Current State)

✅ **HAVE:**
- SQL Injection Protection (SQLAlchemy ORM)
- Basic JWT Authentication
- Password Hashing (bcrypt)
- Environment Variables for Secrets

⚠️ **PARTIAL:**
- Input Validation (Pydantic only)
- Role-Based Access Control (too simple)
- IDOR Protection (institution check only)

❌ **MISSING:**
- XSS Prevention (no HTML sanitization)
- MFA
- HTTPS/TLS Enforcement
- Rate Limiting
- File Upload Validation
- CSRF Protection
- Security Headers (CSP, HSTS)
- SCA (Dependency Scanning)
- SAST/DAST
- WAAP

**Verdict:** 🟡 **6/10** - Adequate for closed demo with fake data

---

### For Production (What You MUST Add)

🔴 **P0 - CRITICAL (Do BEFORE any real users):**
1. Enforce HTTPS/TLS 1.3
2. Add HTML sanitization (bleach)
3. Validate file uploads (type, size, virus scan)
4. Add MFA
5. Implement rate limiting
6. Add account lockout (brute force protection)
7. Use Secrets Manager (not .env defaults)
8. Switch to UUIDs (prevent IDOR)

🟠 **P1 - HIGH (Within first month):**
9. Add CSRF protection
10. Implement security headers (CSP, HSTS, etc.)
11. Add refresh token rotation
12. Implement granular RBAC
13. Set up SCA (weekly scans)
14. Add SAST to CI/CD

🟡 **P2 - MEDIUM (Within 3 months):**
15. Set up WAAP (CloudFlare or AWS WAF)
16. Implement DAST
17. Add API request signing
18. Conduct penetration testing
19. Get security audit (SOC 2 prep)

**Production Verdict:** 🔴 **3/10** - NOT production-ready yet

---

## 🚀 Quick Wins for Hackathon (If You Have 2-3 Hours)

**Priority 1: Input Sanitization (30 min)**
```bash
pip install bleach
# Add validators to schemas.py
```

**Priority 2: File Upload Validation (45 min)**
```bash
pip install python-magic-bin
# Add size/type checks to upload endpoint
```

**Priority 3: Rate Limiting (30 min)**
```bash
pip install slowapi
# Add to auth endpoints
```

**Priority 4: Remove Secret Defaults (10 min)**
```python
# Raise error if SECRET_KEY not set
# Add .env to .gitignore
```

**Total: ~2 hours** → Improves security from 6/10 to 7/10

---

## 💬 What to Tell Judges

**When asked about security:**

✅ **Say:**
"We implement core security best practices:
- SQL injection protection via SQLAlchemy ORM
- Password hashing with bcrypt (cost 12)
- JWT authentication with proper expiry
- Environment-based configuration

For production, our roadmap includes:
- Multi-factor authentication
- TLS 1.3 enforcement
- Input sanitization and CSP headers
- Rate limiting via CloudFlare
- Regular security audits and SAST/DAST

We're aware of OWASP Top 10 and have documented the security roadmap in our technical specifications."

❌ **Don't say:**
"Security isn't important for the prototype"
"We'll worry about security later"
"We don't know what OWASP is"

---

## 🎯 Bottom Line

**For Hackathon:**
Your security is **6/10** - adequate for a demo with fake data in a closed environment. This is EXPECTED and CORRECT for a 15-20 day prototype.

**For Production:**
Your security is **3/10** - CRITICAL gaps that MUST be fixed before real users. Do NOT deploy without implementing P0 fixes.

