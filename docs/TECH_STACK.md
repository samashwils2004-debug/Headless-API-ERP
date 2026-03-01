ADMITFLOW TECHNICAL STACK SPECIFICATION  
Programmable Institutional Workflow Infrastructure  
1. EXECUTIVE SUMMARY  
1.1 Technology Philosophy  
AdmitFlow is built on a modern, cloud -native, API -first architecture  optimized for:  
• Developer Velocity:  Rapid iteration during hackathon, easy extension post -launch  
• Deterministic Execution:  State machines with predictable behavior  
• Event -Native Design:  Real -time event streaming at the core  
• AI-Generated Infrastructure:  Structural compilation, not chatbots  
• Production -Ready from Day 1:  Enterprise -grade from MVP onwards  
1.2 Stack Summary  
Layer  Technology  Rationale  
Backend Framework  FastAPI (Python 3.11)  Async, auto -docs, rapid dev  
Frontend Framework  Next.js 14 (React 18)  SSR, App Router, Vercel integration  
Primary Database  PostgreSQL 15  JSONB, RLS, ACID compliance  
Cache/Events  Redis 7  Event streams, session storage  
AI Engine  OpenAI GPT -4 Turbo  Function calling, deterministic output  
Hosting (Backend)  Railway  Auto -deploy, managed Postgres  
Hosting (Frontend)  Vercel  Next.js optimization, global CDN  
Monitoring  Sentry  Error tracking, performance monitoring  
1.3 Key Technical Decisions  
   Python over Node.js  → Better AI integration, simpler async workflows  
   PostgreSQL over MongoDB  → Strong JSONB support + ACID guarantees  
   Next.js over Vite/CRA  → SSR, file routing, built -in optimization  
   Railway over AWS  → Faster deployment, lower operational overhead  
   Function Calling over Free -form LLM  → Structured, validated output  
 

2. ARCHITECTURE OVERVIEW  
2.1 High -Level System Architecture  
 
 
 
 


2.2 Data Flow  
User Action (Console/API)  
         ↓ 
   API Gateway (FastAPI)  
         ↓ 
   Authentication & Rate Limiting  
         ↓ 
   Workflow Engine (State Machine Execution)  
         ↓ 
   Database Write (PostgreSQL)  
         ↓ 
   Event Emission (Redis Streams)  
         ↓ 
   WebSocket Push (Real -time to Console)  
2.3 Multi -Tenant Isolation  
Every request scoped by:  
• institution_id (tenant identifier)  
• project_id (workspace isolation)  
• Row -level security enforced at database level  
 
3. BACKEND STACK  
3.1 Core Framework  
FastAPI 0.109.0+  
# Framework Configuration  
from fastapi import FastAPI  
from fastapi.middleware.cors import CORSMiddleware  

from fastapi.middleware.trustedhost import TrustedHostMiddleware  
 
app = FastAPI(  
    title="AdmitFlow API",  
    version="1.0.0",  
    docs_url="/docs",  
    redoc_url="/redoc",  
    openapi_url="/openapi.json"  
) 
 
# Middleware  
app.add_middleware(  
    CORSMiddleware,  
    allow_origins=["https://console.admitflow.dev"],  
    allow_credentials=True,  
    allow_methods=["*"],  
    allow_headers=["*"],  
) 
Key Features:  
• Automatic OpenAPI documentation  
• Native async/await support  
• Pydantic validation (type -safe)  
• WebSocket support  
• Dependency injection  
• Excellent performance (comparable to Node.js/Go)  
ASGI Server:  Uvicorn 0.27.0+ with uvloop for production  

3.2 Core Dependencies  
# requirements.txt  
 
# ============================================  
# CORE FRAMEWORK  
# ============================================  
fastapi==0.109.0  
uvicorn[standard]==0.27.0  
python -multipart==0.0.6  
 
# ============================================  
# DATABASE & ORM  
# ============================================  
sqlalchemy==2.0.25  
alembic==1.13.1  
psycopg2 -binary==2.9.9      # PostgreSQL driver  
asyncpg==0.29.0             # Async PostgreSQL  
databases==0.8.0            # Async database support  
 
# ============================================  
# REDIS & CACHING  
# ============================================  
redis==5.0.1  
hiredis==2.3.2              # Faster Redis parsing  
redis -om==0.2.1             # Redis object mapping  
 

# ============================================  
# AUTHENTICATION & SECURITY  
# ============================================  
python -jose[cryptography]==3.3.0  
passlib[bcrypt]==1.7.4  
pyjwt==2.8.0  
cryptography==42.0.0  
python -multipart==0.0.6  
 
# ============================================  
# VALIDATION & SERIALIZATION  
# ============================================  
pydantic==2.5.3  
pydantic -settings==2.1.0  
email -validator==2.1.0  
 
# ============================================  
# AI INTEGRATION  
# ============================================  
openai==1.10.0  
tiktoken==0.5.2             # Token counting  
anthropic==0.8.1            # Alternative AI provider  
 
# ============================================  
# BACKGROUND JOBS (Future)  
# ============================================  

celery==5.3.6  
flower==2.0.1               # Celery monitoring  
 
# ============================================  
# HTTP CLIENT  
# ============================================  
httpx==0.26.0               # Async HTTP client  
 
# ============================================  
# UTILITIES  
# ============================================  
python -dotenv==1.0.0  
tenacity==8.2.3             # Retry logic  
python -dateutil==2.8.2  
pytz==2024.1  
 
# ============================================  
# MONITORING  
# ============================================  
sentry -sdk[fastapi]==1.40.0  
prometheus -client==0.19.0  
 
 
 
 
 

3.3 Project Structure  
backend/  
├── app/  
│   ├── __init__.py  
│   ├── main.py                     # FastAPI app initialization  
│   │ 
│   ├── core/                       # Core configurations  
│   │   ├── config.py               # Settings (Pydantic)  
│   │   ├── security.py             # JWT, password hashing  
│   │   ├── database.py             # DB connection  
│   │   └── redis.py                # Redis connection  
│   │ 
│   ├── models/                     # SQLAlchemy models  
│   │   ├── institution.py  
│   │   ├── project.py  
│   │   ├── workflow.py  
│   │   ├── application.py  
│   │   ├── event.py  
│   │   └── user.py  
│   │ 
│   ├── schemas/                    # Pydantic schemas  
│   │   ├── workflow.py  
│   │   ├── blueprint.py  
│   │   ├── application.py  
│   │   └── event.py  

│   │ 
│   ├── api/                        # API routes  
│   │   ├── v1/ 
│   │   │   ├── auth.py  
│   │   │   ├── projects.py  
│   │   │   ├── workflows.py  
│   │   │   ├── templates.py  
│   │   │   ├── applications.py  
│   │   │   ├── events.py  
│   │   │   └── ai.py  
│   │   └── deps.py                 # Dependencies  
│   │ 
│   ├── engines/                    # Core business logic  
│   │   ├── workflow_engine.py      # State machine executor  
│   │   ├── event_engine.py         # Event emission  
│   │   ├── schema_engine.py        # Validation  
│   │   └── rbac_engine.py          # Permissions  
│   │ 
│   ├── ai/                         # AI integration  
│   │   ├── blueprint_generator.py  # Main AI generator  
│   │   ├── validators/  
│   │   │   ├── schema_validator.py  
│   │   │   ├── graph_validator.py  
│   │   │   ├── permission_validator.py  
│   │   │   └── compliance_validator.py  

│   │   └── prompts/  
│   │       └── system_prompts.py  
│   │ 
│   ├── services/                   # Business logic  
│   │   ├── template_service.py  
│   │   ├── workflow_service.py  
│   │   └── event_service.py  
│   │ 
│   ├── utils/                      # Utilities  
│   │   ├── condition_parser.py     # Safe condition evaluation  
│   │   ├── id_generator.py  
│   │   └── logger.py  
│   │ 
│   └── tests/                      # Tests  
│       ├── unit/  
│       ├── integration/  
│       └── fixtures/  
│ 
├── alembic/                        # Database migrations  
│   ├── versions/  
│   └── env.py  
│ 
├── scripts/                        # Utility scripts  
│   ├── seed_templates.py  
│   └── create_admin.py  

│ 
├── Dockerfile  
├── requirements.txt  
├── requirements -dev.txt  
├── .env.example  
├── alembic.ini  
└── pytest.ini  
 
3.4 Workflow Engine Implementation  
Core Algorithm:  
# app/engines/workflow_engine.py  
from typing import Dict, Any, List  
import logging  
 
logger = logging.getLogger(__name__)  
 
class WorkflowEngine:  
    """ 
    Deterministic state machine executor.  
     
    Features:  
    - Safe condition evaluation (no eval)  
    - Event emission per transition  
    - Audit trail logging  
    - Version support  
    """ 

     
    def __init__(self, workflow_definition: Dict):  
        self.workflow = workflow_definition  
        self.validate_workflow()  
     
    def validate_workflow(self):  
        """Validate workflow structure before execution."""  
        assert 'initial_state' in self.workflow  
        assert 'states' in self.workflow  
        assert len(self.workflow ['states']) >= 2  
         
        # Check all referenced states exist  
        all_states = set(self.workflow['states'].keys())  
        for state_name, state_def in self.workflow['states'].items():  
            for transition in state_def.get('transitions', []):  
                if transition['to'] not in all_states:  
                    raise ValueError(f"Undefined state: {transition['to']}")  
     
    def execute(self, application_data: Dict[str, Any]) -> str:  
        """ 
        Execute workflow from initial state to terminal state.  
         
        Returns: Final state name  
        """ 
        current_state = self.workflow['initial_state']  
        transitions_log = []  

         
        while True:  
            state_def = self.workflow['states'][current_state]  
             
            # Check if terminal state  
            if not state_def.get('transitions'):  
                logger.info(f"Reached terminal state: {current_state}")  
                break  
             
            # Find matching transition  
            matched = False  
            for transition in state_def['transitions']:  
                if self._evaluate_condition(  
                    transition['condition'],  
                    application_data  
                ): 
                    # Log transition  
                    transitions_log.append({  
                        'from': current_state,  
                        'to': transition['to'],  
                        'condition': transition['condition']  
                    }) 
                     
                    # Move to next state  
                    current_state = transition['to']  
                    matched = True  

                    break  
             
            if not matched:  
                raise RuntimeError(  
                    f"No transition matched from state: {current_state}"  
                ) 
         
        return current_state  
     
    def _evaluate_condition(  
        self,  
        condition: str,  
        data: Dict[str, Any]  
    ) -> bool:  
        """ 
        Safely evaluate condition without eval().  
         
        Supports: <, >, <=, >=, ==, !=, and, or  
        Example: "percentage >= 90"  
        """ 
        # Parse condition into AST  
        tokens = self._parse_condition(condition)  
         
        # Evaluate parsed tokens  
        return self._evaluate_tokens(tokens, data)  
     

    def _parse_condition(self, condition: str) -> List:  
        """Parse condition string into tokens."""  
        # Implementation: Simple recursive descent parser  
        # Supports: field operator value  
        # Example: "percentage >= 90" → ['percentage', '>=', 90]  
        pass  
     
    def _evaluate_tokens(self, tokens: List, data: Dict) -> bool:  
        """Evaluate parsed tokens against data."""  
        # Implementation: Safe evaluation without eval()  
        pass  
 
4. FRONTEND STACK  
4.1 Core Framework  
Next.js 14.1.0+ (App Router)  
// next.config.js  
/** @type {import('next').NextConfig} */  
const nextConfig = {  
  reactStrictMode: true,  
  swcMinify: true,  
  images: {  
    domains: ['avatars.githubusercontent.com'],  
  }, 
  env: {  
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,  
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,  

  }, 
} 
 
module.exports = nextConfig  
Key Features:  
• App Router (modern file -based routing)  
• Server Components (better performance)  
• Built -in image optimization  
• API Routes (backend -for-frontend)  
• TypeScript support  
• Automatic code splitting  
4.2 Dependencies  
{ 
  "name": "admitflow -console",  
  "version": "1.0.0",  
  "private": true,  
  "scripts": {  
    "dev": "next dev",  
    "build": "next build",  
    "start": "next start",  
    "lint": "next lint",  
    "type -check": "tsc --noEmit"  
  }, 
  "dependencies": {  
    "next": "14.1.0",  
    "react": "^18.2.0",  

    "react -dom": "^18.2.0",  
     
    "tailwindcss": "^3.4.1",  
    "@tailwindcss/typography": "^0.5.10",  
    "@tailwindcss/forms": "^0.5.7",  
     
    "clsx": "^2.1.0",  
    "tailwind -merge": "^2.2.0",  
     
    "@headlessui/react": "^1.7.18",  
    "@heroicons/react": "^2.1.1",  
    "lucide -react": "^0.323.0",  
     
    "zustand": "^4.5.0",  
     
    "axios": "^1.6.5",  
     
    "react -hot-toast": "^2.4.1",  
    "sonner": "^1.3.1",  
     
    "@monaco -editor/react": "^4.6.0",  
    "monaco -editor": "^0.45.0",  
     
    "date -fns": "^3.3.1",  
     
    "recharts": "^2.12.0",  

     
    "zod": "^3.22.4",  
    "react -hook -form": "^7.49.3",  
    "@hookform/resolvers": "^3.3.4",  
     
    "@sentry/nextjs": "^7.99.0"  
  }, 
  "devDependencies": {  
    "typescript": "^5.3.3",  
    "@types/node": "^20.11.5",  
    "@types/react": "^18.2.48",  
    "@types/react -dom": "^18.2.18",  
     
    "eslint": "^8.56.0",  
    "eslint -config -next": "14.1.0",  
    "@typescript -eslint/parser": "^6.19.0",  
    "@typescript -eslint/eslint -plugin": "^6.19.0",  
     
    "prettier": "^3.2.4",  
    "prettier -plugin -tailwindcss": "^0.5.11",  
     
    "autoprefixer": "^10.4.17",  
    "postcss": "^8.4.33"  
  } 
} 
 

4.3 Project Structure  
frontend/  
├── app/  
│   ├── layout.tsx                  # Root layout  
│   ├── page.tsx                    # Homepage  
│   ├── globals.css                 # Global styles  
│   │ 
│   ├── (auth)/                     # Auth routes  
│   │   ├── login/page.tsx  
│   │   └── signup/page.tsx  
│   │ 
│   ├── console/                    # Console routes  
│   │   ├── layout.tsx              # Console layout (sidebar)  
│   │   ├── page.tsx                # Dashboard  
│   │   ├── templates/  
│   │   │   ├── page.tsx             # Template gallery  
│   │   │   └── [id]/page.tsx       # Template detail  
│   │   ├── workflows/  
│   │   │   ├── page.tsx            # Workflow list  
│   │   │   └── [id]/  
│   │   │       ├── page.tsx        # Workflow detail  
│   │   │       └── edit/page.tsx   # Workflow editor  
│   │   ├── ai/ 
│   │   │   └── page.tsx            # AI generator  
│   │   └── events/  

│   │       └── page.tsx            # Event stream  
│   │ 
│   ├── docs/                       # Documentation  
│   │   └── [...slug]/page.tsx  
│   │ 
│   └── api/                        # API routes (BFF)  
│       └── auth/  
│           └── [...nextauth]/route.ts  
│ 
├── components/  
│   ├── ui/                         # Base UI components  
│   │   ├── button.tsx  
│   │   ├── input.tsx  
│   │   ├── card.tsx  
│   │   ├── modal.tsx  
│   │   └── badge.tsx  
│   │ 
│   ├── home/                       # Homepage components  
│   │   ├── Hero.tsx  
│   │   ├── InfrastructurePrimitives.tsx  
│   │   ├── TemplateShowcase.tsx  
│   │   └── AIGenerator.tsx  
│   │ 
│   ├── console/                    # Console components  
│   │   ├── Sidebar.tsx  

│   │   ├── ContextSelector.tsx  
│   │   ├── EventStream.tsx  
│   │   ├── WorkflowEditor.tsx  
│   │   └── BlueprintPreview.tsx  
│   │ 
│   └── shared/                     # Shared components  
│       ├── CodeBlock.tsx  
│       ├── Navigation.tsx  
│       └── Footer.tsx  
│ 
├── lib/                            # Utilities  
│   ├── api.ts                       # API client  
│   ├── websocket.ts                # WebSocket client  
│   ├── utils.ts                    # Helper functions  
│   └── constants.ts  
│ 
├── hooks/                          # Custom hooks  
│   ├── useEventStream.ts  
│   ├── useWorkflow.ts  
│   └── useAuth.ts  
│ 
├── store/                          # State management  
│   ├── useWorkflowStore.ts  
│   ├── useAuthStore.ts  
│   └── useEventStore.ts  

│ 
├── types/                          # TypeScript types  
│   ├── workflow.ts  
│   ├── blueprint.ts  
│   ├── event.ts  
│   └── api.ts  
│ 
├── public/  
│   ├── images/  
│   └── fonts/  
│ 
├── tailwind.config.js  
├── tsconfig.json  
├── next.config.js  
├── .eslintrc.json  
├── .prettierrc  
└── .env.local  
 
4.4 Styling System  
Tailwind CSS Configuration:  
// tailwind.config.js  
/** @type {import('tailwindcss').Config} */  
module.exports = {  
  content: [  
    './app/**/*.{js,ts,jsx,tsx,mdx}',  

    './components/**/*.{js,ts,jsx,tsx,mdx}',  
  ], 
  theme: {  
    extend: {  
      colors: {  
        primary: {  
          50: '#eff6ff',  
          100: '#dbeafe',  
          200: '#bfdbfe',  
          300: '#93c5fd',  
          400: '#60a5fa',  
          500: '#3b82f6',  
          600: '#2563eb',  
          700: '#1d4ed8',  
          800: '#1e40af',  
          900: '#1e3a8a',  
        }, 
      }, 
      fontFamily: {  
        sans: ['var( --font-inter)', 'system -ui', 'sans -serif'],  
        mono: ['var( --font-jetbrains -mono)', 'Consolas', 'monospace'],  
        display: ['var( --font-cal-sans)', 'sans -serif'],  
      }, 
      animation: {  
        'fade -in': 'fadeIn 0.5s ease -in-out',  
        'slide -up': 'slideUp 0.3s ease -out',  

      }, 
      keyframes: {  
        fadeIn: {  
          '0%': { opacity: '0' },  
          '100%': { opacity: '1' },  
        }, 
        slideUp: {  
          '0%': { transform: 'translateY(10px)', opacity: '0' },  
          '100%': { transform: 'translateY(0)', opacity: '1' },  
        }, 
      }, 
    }, 
  }, 
  plugins: [  
    require('@tailwindcss/forms'),  
    require('@tailwindcss/typography'),  
  ], 
} 
Font Configuration:  
// app/layout.tsx  
import { Inter, JetBrains_Mono } from 'next/font/google'  
import localFont from 'next/font/local'  
 
const inter = Inter({  
  subsets: ['latin'],  
  variable: ' --font-inter',  

  display: 'swap',  
}) 
 
const jetbrainsMono = JetBrains_Mono({  
  subsets: ['latin'],  
  variable: ' --font-jetbrains -mono',  
  display: 'swap',  
}) 
 
const calSans = localFont({  
  src: './fonts/CalSans -SemiBold.woff2',  
  variable: ' --font-cal-sans',  
  display: 'swap',  
}) 
4.5 State Management  
Zustand Implementation:  
// store/useWorkflowStore.ts  
import { create } from 'zustand'  
import { devtools, persist } from 'zustand/middleware'  
 
interface WorkflowStore {  
  workflows: Workflow[]  
  selectedWorkflow: Workflow | null  
  isLoading: boolean  
  error: string | null  
   

  setWorkflows: (workflows: Workflow[]) => void  
  selectWorkflow: (id: string) => void  
  addWorkflow: (workflow: Workflow) => void  
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void  
  deleteWorkflow: (id: string) => void  
  setLoading: (loading: boolean) => void  
  setError: (error: string | null) => void  
} 
 
export const useWorkflowStore = create<WorkflowStore>()(  
  devtools(  
    persist(  
      (set, get) => ({  
        workflows: [],  
        selectedWorkflow: null,  
        isLoading: false,  
        error: null,  
         
        setWorkflows: (workflows) => set({ workflows }),  
         
        selectWorkflow: (id) => set((state) => ({  
          selectedWorkflow: state.workflows.find(w => w.id === id) || null  
        })), 
         
        addWorkflow: (workflow) => set((state) => ({  
          workflows: [...state.workflows, workflow]  

        })), 
         
        updateWorkflow : (id, updates) => set((state) => ({  
          workflows: state.workflows.map(w =>  
            w.id === id ? { ...w, ...updates } : w  
          ) 
        })), 
         
        deleteWorkflow: (id) => set((state) => ({  
          workflows: state.workflows.filter(w => w.id !== id)  
        })), 
         
        setLoading: (loading) => set({ isLoading: loading }),  
        setError: (error) => set({ error }),  
      }), 
      { 
        name: 'workflow -storage',  
        partialize: (state) => ({ workflows: state.workflows }),  
      } 
    ) 
  ) 
) 
 
 
 
 

5. DATABASE & STORAGE  
5.1 PostgreSQL Configuration  
Version:  PostgreSQL 15.x  
Database Schema:  
-- Core tables for MVP  
 
-- institutions  
CREATE TABLE institutions (  
    id VARCHAR(50) PRIMARY KEY ,  
    name VARCHAR(200) NOT NULL,  
    created_at TIMESTAMP DEFAULT NOW(),  
    updated_at TIMESTAMP DEFAULT NOW()  
); 
 
-- projects  
CREATE TABLE projects (  
    id VARCHAR(50) PRIMARY KEY ,  
    institution_id VARCHAR(50) REFERENCES institutions(id) ON DELETE CASCADE,  
    name VARCHAR(200) NOT NULL,  
    created_at TIMESTAMP DEFAULT NOW(),  
    updated_at TIMESTAMP DEFAULT NOW()  
); 
 
CREATE INDEX idx_projects_institution ON projects(institution_id);  
 
-- workflows  

CREATE TABLE workflows (  
    id VARCHAR(50) PRIMARY KEY ,  
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,  
    name VARCHAR(200) NOT NULL,  
    definition JSONB NOT NULL,  
    version VARCHAR(20) NOT NULL DEFAULT '1.0',  
    generated_by_ai BOOLEAN DEFAULT FALSE,  
    created_by VARCHAR(50),  
    created_at TIMESTAMP DEFAULT NOW(),  
    updated_at TIMESTAMP DEFAULT NOW()  
); 
 
CREATE INDEX idx_workflows_project ON workflows(project_id);  
CREATE INDEX idx_workflows_definition ON workflows USING GIN (definition);  
 
-- applications  
CREATE TABLE applications (  
    id VARCHAR(50) PRIMARY KEY ,  
    institution_id VARCHAR(50) REFERENCES institutions(id),  
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,  
    workflow_id VARCHAR(50) REFERENCES workflows(id),  
    workflow_version VARCHAR(20),  
    current_state VARCHAR(100) NOT NULL,  
    applicant_data JSONB NOT NULL,  
    custom_fields JSONB,  
    created_at TIMESTAMP DEFAULT NOW(),  

    updated_at TIMESTAMP DEFAULT NOW()  
); 
 
CREATE INDEX idx_applications_institution ON applications(institution_id);  
CREATE INDEX idx_applications_project ON applications(project_id);  
CREATE INDEX idx_applications_workflow ON applications(workflow_id);  
CREATE INDEX idx_applications_state ON applications(current_state);  
 
-- events  
CREATE TABLE events (  
    id VARCHAR(50) PRIMARY KEY ,  
    institution_id VARCHAR(50) REFERENCES institutions(id),  
    project_id VARCHAR(50) REFERENCES projects(id),  
    type VARCHAR(100) NOT NULL,  
    version VARCHAR(20) DEFAULT 'v1',  
    data JSONB NOT NULL,  
    timestamp TIMESTAMP DEFAULT NOW()  
); 
 
CREATE INDEX idx_events_institution ON events(institution_id);  
CREATE INDEX idx_events_type ON events(type);  
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);  
CREATE INDEX idx_events_data ON events USING GIN (data);  
 
-- blueprint_proposals (AI -generated)  
CREATE TABLE blueprint_proposals (  

    id VARCHAR(50) PRIMARY KEY ,  
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,  
    blueprint JSONB NOT NULL,  
    validation_result JSONB NOT NULL,  
    status VARCHAR(50) NOT NULL DEFAULT 'pending_approval',  
    deployed_workflow_id VARCHAR(50),  
    created_by VARCHAR(50),  
    created_at TIMESTAMP DEFAULT NOW(),  
    deployed_at TIMESTAMP  
); 
 
CREATE INDEX idx_proposals_project ON blueprint_proposals(project_id);  
CREATE INDEX idx_proposals_status ON blueprint_proposals(status);  
 
-- users  
CREATE TABLE users (  
    id VARCHAR(50) PRIMARY KEY ,  
    email VARCHAR(200) UNIQUE NOT NULL,  
    password_hash VARCHAR(200) NOT NULL,  
    institution_id VARCHAR(50) REFERENCES institutions(id),  
    created_at TIMESTAMP DEFAULT NOW(),  
    last_login TIMESTAMP  
); 
 
CREATE INDEX idx_users_email ON users(email);  
CREATE INDEX idx_users_institution ON users(institution_id);  

 
-- api_keys  
CREATE TABLE api_keys (  
    id VARCHAR(50) PRIMARY KEY ,  
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,  
    key_hash VARCHAR(200) NOT NULL,  
    name VARCHAR(200),  
    project_id VARCHAR(50) REFERENCES projects(id),  
    environment VARCHAR(20) DEFAULT 'test',  
    created_at TIMESTAMP DEFAULT NOW(),  
    expires_at TIMESTAMP ,  
    last_used TIMESTAMP  
); 
 
CREATE INDEX idx_api_keys_user ON api_keys(user_id);  
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);  
Connection Configuration:  
# app/core/database.py  
from sqlalchemy import create_engine  
from sqlalchemy.ext.declarative import declarative_base  
from sqlalchemy.orm import sessionmaker  
from sqlalchemy.pool import NullPool  
import os  
 
DATABASE_URL = os.getenv(  
    "DATABASE_URL",  

    "postgresql://user:password@localhost/admitflow"  
) 
 
# Connection pool settings  
engine = create_engine(  
    DATABASE_URL,  
    pool_size=20,  
    max_overflow=0,  
    pool_pre_ping=True,  
    pool_recycle=3600,  
    echo=False,  # Set True for SQL logging in dev  
) 
 
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)  
Base = declarative_base()  
 
def get_db():  
    """Dependency for FastAPI routes."""  
    db = SessionLocal()  
    try: 
        yield db  
    finally:  
        db.close()  
5.2 Redis Configuration  
Version:  Redis 7.2+  
Use Cases:  

1. Event streaming (Redis Streams)  
2. Session storage  
3. Rate limiting  
4. Caching (future)  
5. Celery broker (future)  
Configuration:  
# app/core/redis.py  
import redis  
from redis  import Redis  
import os  
 
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")  
 
# Redis client  
redis_client = Redis.from_url(  
    REDIS_URL,  
    decode_responses=True,  
    socket_timeout=5,  
    socket_connect_timeout=5,  
    retry_on_timeout=True,  
    health_check_interval=30,  
) 
 
# Event stream configuration  
EVENT_STREAM_KEY = "events:{institution_id}"  
EVENT_CONSUMER_GROUP = "webhook -consumers"  

 
def emit_event(institution_id: str, event: dict):  
    """Emit event to Redis Stream."""  
    stream_key = EVENT_STREAM_KEY .format(institution_id=institution_id)  
    redis_client.xadd(  
        stream_key,  
        event,  
        maxlen=10000  # Keep last 10K events  
    ) 
Redis Streams for Real -Time Events:  
# Event emission  
redis_client.xadd(  
    "events:inst_mit",  
    { 
        "event_id": "evt_123",  
        "type": "workflow.transitioned",  
        "data": json.dumps({  
            "application_id": "app_123",  
            "from": "submitted",  
            "to": "accepted"  
        }) 
    } 
) 
 
# WebSocket consumer  
async def stream_events(institution_id: str):  

    """Stream events to WebSocket clients."""  
    stream_key = f"events:{institution_id}"  
    last_id = "0"  
     
    while True:  
        events = redis_client.xread(  
            {stream_key: last_id},  
            count=10,  
            block=1000  
        ) 
         
        for stream, messages in events:  
            for message_id, data in messages:  
                yield json.loads(data['data'])  
                last_id = message_id  
 
6. AI & MACHINE LEARNING  
6.1 OpenAI Integration  
Model:  GPT-4 Turbo (with function calling)  
Configuration:  
# app/ai/config.py  
import openai  
import os  
 
openai.api_key = os.getenv("OPENAI_API_KEY")  
 

AI_CONFIG = {  
    "model": "gpt -4-turbo -preview",  
    "temperature": 0.3,  # Low for deterministic output  
    "max_tokens": 4096,  
    "timeout": 10,  # 10 second timeout  
} 
 
BLUEPRINT_FUNCTION_SCHEMA = {  
    "name": "generate_institutional_blueprint",  
    "description": "Generate complete institutional workflow blueprint",  
    "parameters": {  
        "type": "object",  
        "required": ["metadata", "workflows", "roles"],  
        "properties": {  
            "metadata": {  
                "type": "object",  
                "required": ["name", "description"],  
                "properties": {  
                    "name": {"type": "string"},  
                    "description": {"type": "string"},  
                    "compliance_tags": {  
                        "type": "array",  
                        "items": {  
                            "type": "string",  
                            "enum": ["FERPA", "DPDP", "GDPR", "PCI -DSS"]  
                        } 

                    } 
                } 
            }, 
            "workflows": {  
                "type": "object",  
                "required": ["main"],  
                # ... (full schema from PRD)  
            }, 
            "roles": {  
                "type": "array",  
                "minItems": 2,  
                "maxItems": 10,  
                # ... (full schema from PRD)  
            } 
        } 
    } 
} 
Blueprint Generation Implementation:  
# app/ai/blueprint_generator.py  
import openai  
from tenacity import retry, stop_after_attempt, wait_exponential  
 
@retry(  
    stop=stop_after_attempt(3),  
    wait=wait_exponential(multiplier=1, min=2, max=10)  
) 

async def generate_blueprint(  
    prompt: str,  
    context: dict  
) -> dict:  
    """ 
    Generate institutional blueprint from natural language.  
     
    Uses OpenAI function calling for structured output.  
    Retries on failure with exponential backoff.  
    """ 
    response = await openai.ChatCompletion.acreate(  
        model=AI_CONFIG["model"],  
        temperature=AI_CONFIG["temperature"],  
        messages=[  
            { 
                "role": "system",  
                "content": SYSTEM_PROMPT  # Strict structural instructions  
            }, 
            { 
                "role": "user",  
                "content": f"""Generate institutional workflow blueprint:  
 
Institution Context:  
- Type: {context.get('institution_type', 'university')}  
- Size: {context.get('size', 'medium')}  
- Compliance: {context.get('compliance', ['FERPA'])}  

 
Process Description:  
{prompt}  
 
Generate complete blueprint with workflows, roles, permissions, and events."""  
            } 
        ], 
        tools=[{  
            "type": "function",  
            "function": BLUEPRINT_FUNCTION_SCHEMA  
        }], 
        tool_choice={  
            "type": "function",  
            "function": {"name": "generate_institutional_blueprint"}  
        }, 
        timeout=AI_CONFIG["timeout"]  
    ) 
     
    # Extract function call result  
    tool_call = response.choices[0].message.tool_calls[0]  
    blueprint = json.loads(tool_call.function.arguments)  
     
    return blueprint  
System Prompt:  
SYSTEM_PROMPT = """You are an institutional workflow infrastructure compiler.  
 

You generate ONLY valid JSON blueprints.  
You NEVER output natural language explanations.  
You NEVER output markdown.  
You NEVER output code comments.  
 
Output Format:  
You MUST use the exact JSON schema provided in the function definition.  
 
Workflow Constraints:  
- initial_state must be defined  
- All states must be reachable from initial_state  
- At least one terminal state required  
- No circular transitions  
- No transitions to undefined states  
- Condition syntax: field operator value (simple comparisons only)  
- Operators: <, >, <=, >=, ==, !=, and, or  
- NO function calls, NO eval, NO complex expressions  
 
Role Constraints:  
- Minimum 2 roles, maximum 10 roles  
- All permissions must reference valid actions  
- No contradictory permissions  
 
Event Constraints:  
- All events must have unique types  
- All events must be triggered by valid state transitions  

 
If unable to generate valid blueprint:  
Return error object with reason.  
 
Your output will be validated by multiple analyzers.  
Invalid output will be rejected."""  
6.2 Token Management  
# app/ai/token_counter.py  
import tiktoken  
 
encoding = tiktoken.encoding_for_model("gpt -4") 
 
def count_tokens(text: str) -> int:  
    """Count tokens for GPT -4."""  
    return len(encoding.encode(text))  
 
def estimate_cost( prompt_tokens: int, completion_tokens: int) -> float:  
    """Estimate API cost."""  
    # GPT -4 Turbo pricing (as of Feb 2026)  
    PROMPT_COST_PER_1K = 0.01  
    COMPLETION_COST_PER_1K = 0.03  
     
    prompt_cost = (prompt_tokens / 1000) * PROMPT_COST_PER_1K  
    completion_cost = (completion_tokens / 1000) * COMPLETION_COST_PER_1K  
     
    return prompt_cost + completion_cost  

7. INFRASTRUCTURE & HOSTING  
7.1 Backend Hosting (Railway)  
Platform:  Railway.app  
Configuration:  
# Dockerfile  
FROM python:3.11 -slim 
 
WORKDIR /app  
 
# Install system dependencies  
RUN apt -get update && apt -get install -y \ 
    gcc \ 
    postgresql -client \ 
    && rm -rf /var/lib/apt/lists/*  
 
# Install Python dependencies  
COPY requirements.txt .  
RUN pip install --no-cache -dir -r requirements.txt  
 
# Copy application code  
COPY . .  
 
# Create non -root user  
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app  
USER appuser  
 

# Health check  
HEALTHCHECK --interval=30s --timeout=3s --start -period=5s --retries=3 \ 
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"  
 
# Run application  
CMD ["uvicorn", "app.main:app", " --host", "0.0.0.0", " --port", "8000"]  
Railway Configuration:  
# railway.toml  
[build]  
builder = "DOCKERFILE"  
dockerfilePath = "Dockerfile"  
 
[deploy]  
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"  
healthcheckPath = "/health"  
healthcheckTimeout = 100  
restartPolicyType = "ON_FAILURE"  
restartPolicyMaxRetries = 10  
 
[env]  
DATABASE_URL = { from = "DATABASE_URL" }  
REDIS_URL = { from = "REDIS_URL" }  
OPENAI_API_KEY = { from = "OPENAI_API_KEY" }  
JWT_SECRET = { from = "JWT_SECRET" }  
Resource Allocation:  
• Memory: 1GB (MVP), 2GB (Production)  

• CPU: Shared (MVP), Dedicated (Production)  
• Storage: 10GB PostgreSQL  
• Bandwidth: Unlimited  
7.2 Frontend Hosting (Vercel)  
Platform:  Vercel.com  
Configuration:  
// vercel.json  
{ 
  "framework": "nextjs",  
  "buildCommand": "npm run build",  
  "installCommand": "npm install",  
  "devCommand": "npm run dev",  
  "outputDirectory": ".next",  
  "env": {  
    "NEXT_PUBLIC_API_URL": "@api -url",  
    "NEXT_PUBLIC_WS_URL": "@ws -url" 
  }, 
  "regions": ["iad1"],  
  "functions": {  
    "app/api/**/*.ts": {  
      "maxDuration": 10  
    } 
  } 
} 
Deployment Workflow:  
1. Push to main branch → Production deployment  

2. Push to develop branch → Preview deployment  
3. Pull request → Automatic preview URL  
7.3 Redis Hosting (Upstash)  
Platform:  Upstash.com (Serverless Redis)  
Configuration:  
• Region: US East (close to Railway)  
• TLS: Enabled  
• Eviction: allkeys -lru 
• Persistence: AOF (Append -Only File)  
Free Tier Limits:  
• 10,000 commands/day  
• 256MB storage  
• Good enough for MVP  
Migration Path (Production):  
• Redis Cloud (standard tier)  
• AWS ElastiCache (enterprise)  
8. DEVOPS & CI/CD  
8.1 GitHub Actions  
Backend CI/CD:  
# .github/workflows/backend.yml  
name: Backend CI/CD  
 
on: 
  push:  
    branches: [main, develop]  
    paths:  

      - 'backend/**'  
      - '.github/workflows/backend.yml'  
  pull_request:  
    branches: [main]  
 
jobs:  
  lint: 
    runs -on: ubuntu -latest  
    steps:  
      - uses: actions/checkout@v4  
       
      - name: Set up Python  
        uses: actions/setup -python@v5  
        with:  
          python -version: '3.11'  
          cache: 'pip'  
       
      - name: Install dependencies  
        run: |  
          cd backend  
          pip install -r requirements.txt  
          pip install black ruff mypy  
       
      - name: Run Black  
        run: cd backend && black --check .  
       

      - name: Run Ruff  
        run: cd backend && ruff check .  
       
      - name: Run MyPy  
        run: cd backend && mypy app/  
 
  test:  
    runs -on: ubuntu -latest  
     
    services:  
      postgres:  
        image: postgres:15  
        env:  
          POSTGRES_PASSWORD: postgres  
          POSTGRES_DB: test_db  
        options: > - 
          --health -cmd pg_isready  
          --health -interval 10s  
          --health -timeout 5s  
          --health -retries 5  
        ports:  
          - 5432:5432  
       
      redis:  
        image: redis:7  
        options: > - 

          --health -cmd "redis -cli ping"  
          --health -interval 10s  
          --health -timeout 5s  
          --health -retries 5  
        ports:  
          - 6379:6379  
     
    steps:  
      - uses: actions/checkout@v4  
       
      - name: Set up Python  
        uses: actions/setup -python@v5  
        with:  
          python -version: '3.11'  
          cache: 'pip'  
       
      - name: Install dependencies  
        run: |  
          cd backend  
          pip install -r requirements.txt  
          pip install pytest pytest -cov pytest -asyncio httpx  
       
      - name: Run tests  
        run: |  
          cd backend  
          pytest --cov=app --cov-report=xml --cov-report=html  

        env:  
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db  
          REDIS_URL: redis://localhost:6379/0  
          JWT_SECRET: test_secret  
       
      - name: Upload coverage to Codecov  
        uses: codecov/codecov -action@v3  
        with:  
          files: ./backend/coverage.xml  
          flags: backend  
 
  deploy:  
    needs: [lint, test]  
    if: github.ref == 'refs/heads/main'  
    runs -on: ubuntu -latest  
     
    steps:  
      - uses: actions/checkout@v4  
       
      - name: Install Railway CLI  
        run: npm install -g @railway/cli  
       
      - name: Deploy to Railway  
        run: railway up  
        env:  
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}  

Frontend CI/CD:  
# .github/workflows/frontend.yml  
name: Frontend CI/CD  
 
on: 
  push:  
    branches: [main, develop]  
    paths:  
      - 'frontend/**'  
      - '.github/workflows/frontend.yml'  
  pull_request:  
    branches: [main]  
 
jobs:  
  lint: 
    runs -on: ubuntu -latest  
    steps:  
      - uses: actions/checkout@v4  
       
      - name: Set up Node  
        uses: actions/setup -node@v4  
        with:  
          node -version: '20'  
          cache: 'npm'  
          cache -dependency -path: frontend/package -lock.json  
       

      - name: Install dependencies  
        run: cd frontend && npm ci  
       
      - name: Run ESLint  
        run: cd frontend && npm run lint  
       
      - name: Type check  
        run: cd frontend && npm run type -check  
 
  test:  
    runs -on: ubuntu -latest  
    steps:  
      - uses: actions/checkout@v4  
       
      - name: Set up Node  
        uses: actions/setup -node@v4  
        with:  
          node -version: '20'  
          cache: 'npm'  
          cache -dependency -path: frontend/package -lock.json  
       
      - name: Install dependencies  
        run: cd frontend && npm ci  
       
      - name: Build  
        run: cd frontend && npm run build  

        env:  
          NEXT_PUBLIC_API_URL: https://api.admitflow.dev  
       
      - name: Run tests  
        run: cd frontend && npm test  
 
  deploy:  
    needs: [lint, test]  
    if: github.ref == 'refs/heads/main'  
    runs -on: ubuntu -latest  
     
    steps:  
      - uses: actions/checkout@v4  
       
      - name: Deploy to Vercel  
        uses: amondnet/vercel -action@v25  
        with:  
          vercel -token: ${{ secrets.VERCEL_TOKEN }}  
          vercel -org-id: ${{ secrets.VERCEL_ORG_ID }}  
          vercel -project -id: ${{ secrets.VERCEL_PROJECT_ID }}  
          working -directory: ./frontend  
8.2 Docker Compose (Local Development)  
# docker -compose.yml  
version: '3.9'  
 
services:  

  postgres:  
    image: postgres:15 -alpine  
    environment:  
      POSTGRES_USER: admitflow  
      POSTGRES_PASSWORD: dev_password  
      POSTGRES_DB: admitflow_dev  
    ports:  
      - "5432:5432"  
    volumes:  
      - postgres_data:/var/lib/postgresql/data  
    healthcheck:  
      test: ["CMD -SHELL", "pg_isready -U admitflow"]  
      interval: 10s  
      timeout: 5s  
      retries: 5  
 
  redis:  
    image: redis:7 -alpine  
    command: redis -server --appendonly yes  
    ports:  
      - "6379:6379"  
    volumes:  
      - redis_data:/data  
    healthcheck:  
      test: ["CMD", "redis -cli", "ping"]  
      interval: 10s  

      timeout: 3s  
      retries: 5  
 
  backend:  
    build:  
      context: ./backend  
      dockerfile: Dockerfile  
    ports:  
      - "8000:8000"  
    environment:  
      DATABASE_URL: postgresql://admitflow:dev_password@postgres:5432/admitflow_dev  
      REDIS_URL: redis://redis:6379/0  
      OPENAI_API_KEY: ${OPENAI_API_KEY}  
      JWT_SECRET: dev_secret_key  
      ENVIRONMENT: development  
    depends_on:  
      postgres:  
        condition: service_healthy  
      redis:  
        condition: service_healthy  
    volumes:  
      - ./backend:/app  
    command: uvicorn app.main:app  --host 0.0.0.0 --port 8000 --reload  
 
  frontend:  
    build:  

      context: ./frontend  
      dockerfile: Dockerfile.dev  
    ports:  
      - "3000:3000"  
    environment:  
      NEXT_PUBLIC_API_URL: http://localhost:8000  
      NEXT_PUBLIC_WS_URL: ws://localhost:8000  
    depends_on:  
      - backend  
    volumes:  
      - ./frontend:/app  
      - /app/node_modules  
    command: npm run dev  
 
volumes:  
  postgres_data:  
  redis_data:  
9. MONITORING & OBSERVABILITY  
9.1 Error Tracking (Sentry)  
Backend Integration:  
# app/main.py  
import sentry_sdk  
from sentry_sdk.integrations.fastapi import FastApiIntegration  
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration  
 
sentry_sdk.init(  

    dsn=os.getenv("SENTRY_DSN"),  
    environment=os.getenv("ENVIRONMENT", "development"),  
    traces_sample_rate=0.1,  # 10% of transactions  
    profiles_sample_rate=0.1,  # 10% profiling  
    integrations=[  
        FastApiIntegration(),  
        SqlalchemyIntegration(),  
    ], 
    before_send=filter_sensitive_data,  # Strip PII  
) 
 
def filter_sensitive_data(event, hint):  
    """Remove sensitive data before sending to Sentry."""  
    if 'request' in event:  
        if 'headers' in event['request']:  
            event['request']['headers'].pop('Authorization', None)  
    return event  
Frontend Integration:  
// lib/sentry.ts  
import * as Sentry from "@sentry/nextjs"  
 
Sentry.init({  
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,  
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,  
  tracesSampleRate: 0.1,  
  replaysSessionSampleRate: 0.1,  

  replaysOnErrorSampleRate: 1.0,  
  integrations: [  
    new Sentry.BrowserTracing(),  
    new Sentry.Replay(),  
  ], 
}) 
9.2 Application Metrics (Prometheus)  
# app/core/metrics.py  
from prometheus_client import Counter, Histogram, Gauge  
 
# Workflow execution metrics  
workflow_executions = Counter(  
    'workflow_executions_total',  
    'Total workflow executions',  
    ['workflow_id', 'final_state']  
) 
 
workflow_duration = Histogram(  
    'workflow_execution_duration_seconds',  
    'Workflow execution duration',  
    ['workflow_id']  
) 
 
# AI generation metrics  
ai_generations = Counter(  
    'ai_generations_total',  

    'Total AI blueprint generations',  
    ['status']  # success, validation_failed, error  
) 
 
ai_generation_duration = Histogram(  
    'ai_generation_duration_seconds',  
    'AI generation duration'  
) 
 
# API metrics  
http_requests = Counter(  
    'http_requests_total',  
    'Total HTTP requests',  
    ['method', 'endpoint', 'status']  
) 
 
# Active connections  
active_websockets = Gauge(  
    'active_websocket_connections',  
    'Number of active WebSocket connections'  
) 
9.3 Logging  
# app/core/logger.py  
import logging  
import sys  
from pythonjsonlogger import jsonlogger  

 
def setup_logging():  
    """Configure structured JSON logging."""  
    logger = logging.getLogger()  
    logger.setLevel(logging.INFO)  
     
    # Console handler with JSON formatting  
    handler = logging.StreamHandler(sys.stdout)  
    formatter = jsonlogger.JsonFormatter(  
        '%(asctime)s %(name)s %(levelname)s %(message)s'  
    ) 
    handler.setFormatter(formatter)  
    logger.addHandler(handler)  
     
    return logger  
 
logger = setup_logging()  
 
# Usage  
logger.info(  
    "Workflow executed",  
    extra={  
        "workflow_id": "wf_123",  
        "application_id": "app_456",  
        "final_state": "accepted",  
        "duration_ms": 45  

    } 
) 
10. SECURITY STACK  
10.1 Authentication  
JWT Implementation:  
# app/core/security.py  
from datetime import datetime, timedelta  
from jose import JWTError, jwt  
from passlib.context import CryptContext  
 
SECRET_KEY = os.getenv("JWT_SECRET")  
ALGORITHM = "HS256"  
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours  
 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")  
 
def create_access_token(data: dict) -> str:  
    """Create JWT access token."""  
    to_encode = data.copy()  
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)  
    to_encode.update({"exp": expire})  
     
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY , algorithm=ALGORITHM)  
    return encoded_jwt  
 
def verify_token(token: str) -> dict:  

    """Verify and decode JWT token."""  
    try: 
        payload = jwt.decode(token, SECRET_KEY , algorithms=[ALGORITHM])  
        return payload  
    except JWTError:  
        raise HTTPException(status_code=401, detail="Invalid token")  
 
def hash_password(password: str) -> str:  
    """Hash password using bcrypt."""  
    return pwd_context.hash(password)  
 
def verify_ password(plain_password: str, hashed_password: str) -> bool:  
    """Verify password against hash."""  
    return pwd_context.verify(plain_password, hashed_password)  
10.2 API Key Management  
# app/core/api_keys.py  
import secrets  
import hashlib  
 
def generate_api_key() -> tuple[str, str]:  
    """ 
    Generate API key and its hash.  
     
    Returns: (key, hash)  
    """ 
    # Generate random key  

    key = "sk_" + secrets.token_urlsafe(32)  
     
    # Hash for storage  
    key_hash = hashlib.sha256(key.encode()).hexdigest()  
     
    return key, key_hash  
 
def verify_api_key(provided_key: str, stored_hash: str) -> bool:  
    """Verify API key against stored hash."""  
    provided_hash = hashlib.sha256(provided_key.encode()).hexdigest()  
    return provided_hash == stored_hash  
10.3 Rate Limiting  
# app/middleware/rate_limit.py  
from fastapi import Request, HTTPException  
from redis import Redis  
import time  
 
redis_client = Redis.from_url(os.getenv("REDIS_URL"))  
 
async def rate_limit(request: Request):  
    """ 
    Rate limit middleware.  
     
    Limits: 100 requests per minute per user  
    """ 
    user_id = request.state.user_id  # From auth middleware  

    key = f"rate_limit:{user_id}"  
     
    current = redis_client.incr(key)  
     
    if current == 1:  
        redis_client.expire(key, 60)  # 1 minute window  
     
    if current > 100:  
        raise HTTPException(  
            status_code=429,  
            detail="Rate limit exceeded"  
        ) 
10.4 Input Validation  
Pydantic Schemas:  
# app/schemas/application.py  
from pydantic import BaseModel, EmailStr, Field, validator  
 
class ApplicantData(BaseModel):  
    name: str = Field(..., min_length=1, max_length=200)  
    email: EmailStr  
    phone: str | None = Field(None, pattern=r'^ \+?[0 -9]{10,15}$')  
 
class ApplicationCreate(BaseModel):  
    applicant: ApplicantData  
    program: str = Field(..., pattern=r'^[a -z0-9-]+$')  
    custom_fields: dict = Field(default_factory=dict)  

     
    @validator('custom_fields')  
    def validate_custom_fields(cls, v):  
        """Ensure custom fields don't exceed size limit."""  
        if len(str(v)) > 10000:  # 10KB limit  
            raise ValueError('custom_fields too large')  
        return v  
     
    class Config:  
        json_schema_extra = {  
            "example": {  
                "applicant": {  
                    "name": "John Doe",  
                    "email": "john@example.com"  
                }, 
                "program": "btech -cse",  
                "custom_fields": {"percentage": 92}  
            } 
        } 
 
11. DEVELOPMENT TOOLS  
11.1 Code Quality  
Python:  
# pyproject.toml  
[tool.black]  
line-length = 88  

target -version = ['py311']  
include = ' \.pyi?$'  
 
[tool.ruff]  
line-length = 88  
select = ["E", "F", "W", "I", "N"]  
ignore = ["E501"]  
 
[tool.mypy]  
python_version = "3.11"  
warn_return_any = true  
warn_unused_configs = true  
disallow_untyped_defs = true  
TypeScript:  
// .eslintrc.json  
{ 
  "extends": [  
    "next/core -web -vitals",  
    "plugin:@typescript -eslint/recommended"  
  ], 
  "rules": {  
    "@typescript -eslint/no -unused -vars": "error",  
    "@typescript -eslint/no -explicit -any": "warn",  
    "prefer -const": "error"  
  } 
} 

// tsconfig.json  
{ 
  "compilerOptions": {  
    "target": "ES2020",  
    "lib": ["DOM", "DOM.Iterable", "ES2020"],  
    "jsx": "preserve",  
    "module": "esnext",  
    "moduleResolution": "bundler",  
    "resolveJsonModule": true,  
    "allowJs": true,  
    "strict": true,  
    "noEmit": true,  
    "esModuleInterop": true,  
    "skipLibCheck": true,  
    "forceConsistentCasingInFileNames": true,  
    "incremental": true,  
    "plugins": [  
      { 
        "name": "next"  
      } 
    ], 
    "paths": {  
      "@/*": ["./*"]  
    } 
  }, 
  "include": ["next -env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],  

  "exclude": ["node_modules"]  
} 
11.2 Pre -commit Hooks  
# .pre -commit -config.yaml  
repos:  
  - repo: https://github.com/pre -commit/pre -commit -hooks  
    rev: v4.5.0  
    hooks:  
      - id: trailing -whitespace  
      - id: end -of-file-fixer  
      - id: check -yaml  
      - id: check -added -large -files 
 
  - repo: https://github.com/psf/black  
    rev: 24.1.1  
    hooks:  
      - id: black  
 
  - repo: https://github.com/charliermarsh/ruff -pre-commit  
    rev: v0.1.14  
    hooks:  
      - id: ruff  
        args: [ --fix, --exit-non-zero -on-fix] 
12. TESTING STACK  
12.1 Backend Testing  
# backend/tests/conftest.py  

import pytest  
from fastapi.testclient import TestClient  
from sqlalchemy import create_engine  
from sqlalchemy.orm import sessionmaker  
 
from app.main import app  
from app.core.database import Base, get_db  
 
# Test database  
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"  
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": 
False})  
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)  
 
@pytest.fixture  
def db():  
    """Create test database."""  
    Base.metadata.create_all(bind=engine)  
    db = TestingSessionLocal()  
    try: 
        yield db  
    finally:  
        db.close()  
        Base.metadata.drop_all(bind=engine)  
 
@pytest.fixture  

def client(db):  
    """Create test client."""  
    def override_get_db():  
        try: 
            yield db  
        finally:  
            pass  
     
    app.dependency_overrides[get_db] = override_get_db  
     
    with TestClient (app) as client:  
        yield client  
     
    app.dependency_overrides.clear()  
 
@pytest.fixture  
def auth_headers(client):  
    """Get authentication headers."""  
    response = client.post(  
        "/auth/login",  
        json={"email": "test@example.com", "password": "testpass123"}  
    ) 
    token = response.json()["access_token"]  
    return {"Authorization": f"Bearer {token}"}  
Example Test:  
# backend/tests/test_workflow_execution.py  

def test_workflow_execution(client, auth_headers):  
    """Test workflow execution."""  
    # Deploy template  
    response = client.post(  
        "/templates/undergraduate/deploy",  
        json={"project_id": "proj_123"},  
        headers=auth_headers  
    ) 
    assert response.status_code == 200  
    workflow_id = response.json()["workflow_id"]  
     
    # Submit application  
    response = client.post(  
        "/applications",  
        json={  
            "workflow_id": workflow_id,  
            "applicant": {"name": "Test", "email": "test@example.com"},  
            "custom_fields": {"percentage": 92}  
        }, 
        headers=auth_headers  
    ) 
    assert response.status_code == 200  
    assert response.json()["current_state"] == "auto_accepted"  
12.2 Frontend Testing  
// __tests__/components/WorkflowEditor.test.tsx  
import { render, screen, fireEvent } from '@testing -library/react'  

import { WorkflowEditor } from '@/components/console/WorkflowEditor'  
 
describe('WorkflowEditor', () => {  
  it('renders editor with initial value', () => {  
    const mockOnChange = jest.fn()  
     
    render(  
      <WorkflowEditor  
        value='{"initial_state": "submitted"}'  
        onChange={mockOnChange}  
      /> 
    ) 
     
    expect(screen.getByText(/submitted/i)).toBeInTheDocument()  
  }) 
   
  it('calls onChange  when value changes', () => {  
    const mockOnChange = jest.fn()  
     
    render(  
      <WorkflowEditor  
        value='{}'  
        onChange={mockOnChange}  
      /> 
    ) 
     

    // Simulate editor change (Monaco editor integration)  
    // ...  
     
    expect(mockOnChange).toHaveBeenCalled()  
  }) 
}) 
 
13. THIRD -PARTY SERVICES  
13.1 Service Inventory  
Service  Purpose  Tier Monthly Cost  
Railway  Backend hosting + PostgreSQL  Hobby  $5 (included credits)  
Vercel  Frontend hosting + CDN  Hobby  $0 
Upstash  Serverless Redis  Free  $0 
OpenAI  AI blueprint generation  Pay-as-you-go ~$20 -50 
Sentry  Error tracking  Developer  $0 (free tier)  
GitHub  Code hosting + CI/CD  Free  $0 
Codecov  Code coverage  Free  $0 
Total    
$25-55/month  
13.2 OpenAI Usage Estimation  
Assumptions:  
• 50 AI generations/day  
• Average prompt: 500 tokens  
• Average completion: 2000 tokens  
Monthly Cost:  
Prompt tokens:   50 × 30 × 500  = 750,000 tokens  
Completion:      50 × 30 × 2000 = 3,000,000 tokens  

 
Cost = (750K / 1000 × $0.01) + (3M / 1000 × $0.03)  
     = $7.50 + $90  
     = $97.50/month  
Optimization:  
• Cache common templates  
• Use GPT -3.5 Turbo for simple generations  
• Batch similar requests  
 
14. ENVIRONMENT CONFIGURATION  
14.1 Environment Variables  
Backend (.env):  
# Database  
DATABASE_URL=postgresql://user:password@localhost:5432/admitflow  
REDIS_URL=redis://localhost:6379/0  
 
# Authentication  
JWT_SECRET=your -super -secret -key-change -in-production  
JWT_ALGORITHM=HS256  
ACCESS_TOKEN_EXPIRE_MINUTES=1440  
 
# AI 
OPENAI_API_KEY=sk -... 
OPENAI_ORG_ID=org -... 
 
# Application  

ENVIRONMENT=development  
DEBUG=True  
LOG_LEVEL=INFO  
 
# CORS  
ALLOWED_ORIGINS=http://localhost:3000,https://console.admitflow.dev  
 
# Monitoring  
SENTRY_DSN=https://...@sentry.io/...  
 
# Rate Limiting  
RATE_LIMIT_PER_MINUTE=100  
Frontend (.env.local):  
# API URLs  
NEXT_PUBLIC_API_URL=http://localhost:8000  
NEXT_PUBLIC_WS_URL=ws://localhost:8000  
 
# Environment  
NEXT_PUBLIC_ENVIRONMENT=development  
 
# Sentry  
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...  
 
# Feature Flags  
NEXT_PUBLIC_ENABLE_AI_GENERATOR=true  
14.2 Configuration Management  

# app/core/config.py  
from pydantic_settings import BaseSettings  
 
class Settings(BaseSettings):  
    # Database  
    database_url: str  
    redis_url: str  
     
    # Security  
    jwt_secret: str  
    jwt_algorithm: str = "HS256"  
    access_token_expire_minutes: int = 1440  
     
    # AI 
    openai_api_key: str  
    openai_org_id: str | None = None  
     
    # Application  
    environment: str = "development"  
    debug: bool = False  
    log_level: str = "INFO"  
     
    # CORS  
    allowed_origins: list[str] = ["http://localhost:3000"]  
     
    # Monitoring  

    sentry_dsn : str | None = None  
     
    class Config:  
        env_file = ".env"  
        case_sensitive = False  
 
settings = Settings()  
 
15. DEPLOYMENT ARCHITECTURE  
15.1 Production Deployment Flow  
GitHub (main branch)  
       ↓ 
GitHub Actions CI/CD  
       ├─→ Backend Tests Pass  
       │        ↓  
       │   Railway Auto -Deploy  
       │        ↓  
       │   PostgreSQL Migration  
       │        ↓  
       │   Health Check  
       │        ↓  
       │   Production Live  
       │ 
       └─→ Frontend Tests Pass  
                ↓ 
           Vercel Auto -Deploy  

                ↓ 
           Build Optimization  
                ↓ 
           CDN Distribution  
                ↓ 
           Production Live  
15.2 Zero -Downtime Deployment  
Backend (Railway):  
• Rolling deployment (new container before old shutdown)  
• Health check ensures service ready  
• Automatic rollback on failure  
Frontend (Vercel):  
• Atomic deployments (instant switch)  
• Preview deployments for testing  
• Automatic CDN cache invalidation  
15.3 Database Migrations  
# Create migration  
alembic revision --autogenerate -m "Add blueprint_proposals table"  
 
# Review migration  
cat alembic/versions/xxx_add_blueprint_proposals.py  
 
# Apply to production (via Railway)  
railway run alembic upgrade head  
 
 

16. PERFORMANCE SPECIFICATIONS  
16.1 Target Metrics  
Metric  MVP Target  Production Target  
API Response Time (P95)  < 200ms  < 100ms  
Workflow Execution (P95)  < 100ms  < 50ms  
Event Emission Latency  < 100ms  < 50ms  
AI Generation Time  < 10s  < 8s 
WebSocket Latency  < 500ms  < 200ms  
Database Query (P95)  < 50ms  < 20ms  
16.2 Performance Optimizations  
Backend:  
• Connection pooling (20 connections)  
• Redis caching for frequently accessed data  
• Async I/O throughout  
• Database query optimization (indexes)  
• JSONB indexing for workflow definitions  
Frontend:  
• Next.js Server Components (reduced JavaScript)  
• Image optimization (next/image)  
• Code splitting (automatic)  
• CDN caching (Vercel Edge Network)  
• Lazy loading (components, routes)  
17. SCALABILITY CONSIDERATIONS  
17.1 Horizontal Scaling  
Backend:  

Load Balancer  
     ├─→ API Server 1 (Railway)  
     ├─→ API Server 2 (Railway)  
     └─→ API Server 3 (Railway)  
            ↓ 
     Shared PostgreSQL (Railway)  
     Shared Redis (Upstash)  
Frontend:  
• Vercel Edge Network (automatic global distribution)  
• No scaling needed (serverless)  
17.2 Database Scaling  
Vertical Scaling (First):  
• Railway: Hobby → Pro → Enterprise  
• 1GB RAM → 8GB RAM → 16GB RAM  
Horizontal Scaling (Future):  
• Read replicas for analytics queries  
• Partitioning by institution_id  
17.3 Caching Strategy  
L1 Cache (In -Memory):  
• Workflow definitions (10 minutes TTL)  
• User sessions (24 hours TTL)  
L2 Cache (Redis):  
• API responses (1 minute TTL)  
• Template metadata (1 hour TTL)  
 
18. COST STRUCTURE  

18.1 MVP Cost Breakdown (Monthly)  
Component  Service  Tier Cost  
Backend Hosting  Railway  Hobby  $5 
Database  Railway PostgreSQL  Included  $0 
Redis  Upstash  Free  $0 
Frontend Hosting  Vercel  Hobby  $0 
AI (50 gen/day)  OpenAI  Pay-as-you-go $50 
Error Tracking  Sentry  Developer  $0 
Total    $55/month  
18.2 Production Cost Estimate (1000 users)  
Component  Service  Tier Cost  
Backend Hosting  Railway  Pro $20 
Database  Railway PostgreSQL  4GB $15 
Redis  Redis Cloud  Standard  $10 
Frontend Hosting  Vercel  Pro $20 
AI (500 gen/day)  OpenAI  Pay-as-you-go $500  
Error Tracking  Sentry  Team  $26 
Total    
$591/month  
 
19. TECHNOLOGY DECISION RATIONALE  
19.1 Why FastAPI?  
Chosen:  FastAPI (Python) Alternatives Considered:  Express (Node.js), Django REST, Flask  
Decision Factors:  
•    Auto -generated OpenAPI docs (critical for developer -first product)  
•    Native async support (better for I/O -heavy workflows)  

•    Pydantic validation (type -safe, reduced bugs)  
•    Python ecosystem (better AI integration with OpenAI)  
•    Rapid development (critical for hackathon timeline)  
•    Performance comparable to Node.js  
19.2 Why PostgreSQL?  
Chosen:  PostgreSQL Alternatives Considered:  MongoDB, MySQL  
Decision Factors:  
•    JSONB support (flexible workflow definitions)  
•    ACID compliance (critical for financial/admissions data)  
•    Row -level security (multi -tenancy)  
•    Mature, production -proven  
•    Free tier on Railway  
19.3 Why Next.js?  
Chosen:  Next.js 14 Alternatives Considered:  Vite + React, Remix, SvelteKit  
Decision Factors:  
•    App Router (modern, better DX)  
•    Server Components (performance)  
•    Vercel integration (zero -config deployment)  
•    Built -in optimization (images, fonts, code splitting)  
•    Largest React ecosystem  
19.4 Why Railway + Vercel?  
Chosen:  Railway + Vercel Alternatives Considered:  AWS, Heroku, Render  
Decision Factors:  
•    Fastest time to deploy (critical for hackathon)  
•    GitHub auto -deploy (CI/CD built -in) 

•    Free/cheap tiers (MVP cost -effective)  
•    Managed databases (less operational overhead)  
•    Excellent developer experience  
 
20. FUTURE TECHNOLOGY ROADMAP  
20.1 Phase 2 Additions (Post -Hackathon)  
Backend:  
• Celery for background jobs  
• Webhook retry system  
• Advanced caching (Redis Cluster)  
• GraphQL API (optional)  
Frontend:  
• Real -time collaboration (Yjs)  
• Advanced analytics (Mixpanel)  
• A/B testing (PostHog)  
Infrastructure:  
• Multi -region deployment  
• CDN for API responses  
• Advanced monitoring (Datadog)  
20.2 Phase 3 Additions (Production)  
Backend:  
• Microservices architecture (if needed)  
• Message queue (RabbitMQ/Kafka)  
• Search (Elasticsearch)  
• ML model serving (for workflow optimization)  
Frontend:  

• Mobile apps (React Native)  
• Offline -first (PWA)  
• Real -time notifications (Firebase)  
Infrastructure:  
• Kubernetes (if scale requires)  
• Multi -cloud (AWS + GCP)  
• Global distribution  
• Advanced security (WAF, DDoS protection)  
 
APPENDIX A: QUICK REFERENCE  
API Endpoints Summary  
# Authentication  
POST   /auth/signup  
POST   /auth/login  
POST   /auth/refresh  
 
# Projects  
GET    /projects  
POST   /projects  
GET    /projects/:id  
 
# Templates  
GET    /templates  
GET    /templates/:id  
POST   /templates/:id/deploy  
 

# Workflows  
GET    /workflows  
GET    /workflows/:id  
POST   /workflows/:id/fork  
 
# Applications  
POST   /applications  
GET    /applications/:id  
 
# Events  
GET    /events  
GET    /events/:id  
WS     /events/stream  
 
# AI 
POST   /ai/generate  
GET    /ai/blueprints/:id  
POST   /ai/blueprints/:id/deploy  
Environment URLs  
Local Development:  
  Frontend: http://localhost:3000  
  Backend:  http://localhost:8000  
  Docs:     http://localhost:8000/docs  
 
Production:  
  Frontend: https://console.admitflow.dev  

  Marketing: https://admitflow.dev  
  Backend:  https://api.admitflow.dev  
  Docs:     https://api.admitflow.dev/docs  
Key Commands  
# Backend  
cd backend  
pip install -r requirements.txt  
uvicorn app.main:app --reload  
 
# Frontend  
cd frontend  
npm install  
npm run dev  
 
# Docker  
docker -compose up -d 
docker -compose logs -f backend  
 
# Database  
alembic upgrade head  
alembic revision --autogenerate -m "description"  
 
# Testing  
pytest --cov=app  
npm test  
 

