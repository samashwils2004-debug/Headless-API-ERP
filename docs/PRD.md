ADMITFLOW  
 
Programmable Institutional Workflow Infrastructure  
Product Requirements Document (PRD)  
1. Executive Summary  
1.1 Product Overview  
AdmitFlow  is a headless, API -first infrastructure platform that enables developers to define, 
deploy, and execute institutional workflows as versioned, deterministic state machines.  
It replaces rigid, hardcoded ERP logic with programmable institutional infrastructure . 
1.2 Core Innovation  
AdmitFlow introduces AI-powered structural generation  for institutional systems:  
• Input:  Natural language description of institutional processes  
• Output:  Validated, deployable infrastructure blueprints (workflows + roles + events + 
schemas)  
• Deployment:  Human -reviewed, versioned, deterministic runtime  
Developers don't write workflow logic manually. They don't configure visual builders. They 
describe processes, and AI generates infrastructure.  
What AdmitFlow Provides  
Layer  Description  
Workflow Engine  JSON state machine executor with safe condition evaluation  
Template System  Pre-built institutional workflow blueprints  
AI Blueprint Generator  Natural language → validated infrastructure  
Event Backbone  Real -time event emission for every state transition  
Developer Console  Infrastructure observability and management  
Headless API  REST endpoints for integration  
 
1.4 What AdmitFlow Does NOT Provide  

-  Traditional ERP admin UI  
- Pre-built institutional dashboards  
- No-code drag -drop workflow builder  
- End-user facing interfaces  
AdmitFlow is infrastructure upon which institutional systems are built.  
 
2. Problem Statement  
2.1 Institutional ERP Limitations  
Traditional institutional ERPs suffer from:  
Hardcoded Logic  
• Business rules embedded in application code  
• Workflow changes require vendor customization  
• No version control for institutional processes  
Brittle Customization  
• Custom logic breaks during upgrades  
• Migration risk forces institutions to delay updates  
• Vendor lock -in due to customization debt  
No Event Architecture  
• Systems don't emit structured events  
• Integration requires polling or batch jobs  
• Real -time workflows impossible  
Non -Programmable  
• Developers cannot extend via API  
• Logic trapped behind admin UIs  
• No infrastructure abstraction layer  
2.2 Developer Pain Points  

Developers building institutional systems must:  
1. Reinvent Workflow Logic   
o Manual state management  
o Custom approval flows  
o Hard -coded conditional transitions  
2. Build Event Infrastructure   
o Custom event emission  
o Webhook systems from scratch  
o Notification orchestration  
3. Manage Permission Complexity   
o Role -based access control  
o Row -level security  
o Audit trail implementation  
4. Handle Version Evolution   
o Migrate active applications  
o Support multiple workflow versions  
o Maintain backward compatibility  
There is no programmable infrastructure layer for institutional workflows.  
2.3 AI Integration Gap  
Current "AI ERP builders":  
• Generate UI forms  
• Create admin dashboards  
• Write natural language flows  
They don't generate deterministic infrastructure.  
AdmitFlow uses AI to generate:  
• Validated state machines  

• Type -safe schemas  
• Permission matrices  
• Event definitions  
• Compliance -ready structures  
AI as structural compiler, not chatbot.  
3. Product Vision & Principles  
3.1 Vision Statement  
"To make institutional systems programmable, versioned, and event -native — starting with 
admissions, expanding to all institutional workflows."  
3.2 Long -Term Strategic Vision  
Phase 1 (Year 0):  Admissions workflows Phase 2 (Year 1):  Course registration, library systems 
Phase 3 (Year 2):  Faculty approvals, HR processes Phase 4 (Year 3):  Full institutional blueprint 
marketplace  
End State:  The programmable runtime layer for institutional infrastructure.  
3.3 Design Principles  
Principle  Meaning  
Infrastructure, Not SaaS  We provide APIs, not admin UIs  
Headless -First  API is the primary interface  
Workflows as Code  JSON state machines, not visual builders  
Deterministic Execution  No eval(), no dynamic code  
Event -Native  Every transition emits structured events  
Versioned Components  Workflows, schemas, events all versioned  
AI-Generated Structure  Natural language → validated infrastructure  
Multi -Tenant by Design  Isolation built -in from day one  
Developer Experience  Optimized for developers, not admins  
 

4. Target Users  
4.1 Primary User Persona  
Example:  
Name:  Samuel Ashwin  Role:  Senior Developer at University IT Department Goal:  Build custom 
admissions portal that integrates with campus systems Pain Points:  
• Writing workflow logic from scratch  
• Maintaining state consistency  
• Building event infrastructure  
• Version management complexity  
How AdmitFlow Helps:  
• Deploy pre -built admissions workflow (1 minute)  
• Customize via JSON or AI generation (5 minutes)  
• Auto -emit events for LMS integration  
• Version management handled by platform  
4.2 Secondary User Persona  
Name:  Jordan Wajiri  Role:  Technical Founder, EdTech Startup Goal:  Build white -label admissions 
platform for multiple colleges Pain Points:  
• Each college has different admission rules  
• Multi -tenant workflow management  
• Compliance requirements (FERPA, DPDP)  
• Scaling custom logic  
How AdmitFlow Helps:  
• Multi -tenant infrastructure built -in 
• AI generates custom workflows per college  
• Compliance rules in template system  
• Event -driven architecture for integrations  
4.3 Not Targeting (Critical)  

Non -Technical Admissions Officers  
• They will use systems built on AdmitFlow  
• They will NOT use AdmitFlow directly  
Institutional Administrators  
• They need admin dashboards  
• AdmitFlow doesn't provide this  
No-Code Users  
• AdmitFlow is developer -first infrastructure  
 
5. Product Architecture Overview  
5.1 Three -Surface Model  
 
 


 
5.2 Data Flow Architecture  
Developer Action (Console or API)  
         ↓ 
   API Gateway (auth, rate limit)  
         ↓ 
   Workflow Engine (state transition)  
         ↓ 
   Event Emitter (domain event)  
         ↓ 
   Event Store (persistence)  
         ↓ 
   WebSocket Push (real -time to console)  
 
6. Core Infrastructure Primitives  
6.1 Primitive 1: Workflow Engine  
Definition  
Declarative JSON state machine executor with safe condition evaluation.  
Example Workflow Definition  


json 
{ 
  "id": "undergraduate -admissions",  
  "version": "1.0",  
  "initial_state": "submitted",  
  "states": {  
    "submitted": {  
      "type": "initial",  
      "transitions": [  
        { 
          "to": "auto_accepted",  
          "condition": "percentage >= 90",  
          "emit_event": "application.auto_accepted"  
        }, 
        { 
          "to": "under_review",  
          "condition": "percentage < 90",  
          "emit_event": "application.under_review"  
        } 
      ] 
    }, 
    "auto_accepted": {  
      "type": "terminal",  
      "transitions": []  
    }, 
    "under_review": {  

      "type": "intermediate",  
      "transitions": [  
        { 
          "to": "accepted",  
          "condition": "manual_approval == true",  
          "emit_event": "application.accepted"  
        }, 
        { 
          "to": "rejected",  
          "condition": "manual_approval == false",  
          "emit_event": "application.rejected"  
        } 
      ] 
    }, 
    "accepted": {  
      "type": "terminal",  
      "transitions": []  
    }, 
    "rejected": {  
      "type": "terminal",  
      "transitions": []  
    } 
  } 
} 
 
 

Functional Requirements  
Requirement  Description  
Deterministic  Same input always produces same output  
Safe Evaluation  No eval(), no dynamic code execution  
Condition Parsing  Support <, >, <=, >=, ==, !=, and, or  
Terminal Detection  Detect when workflow reaches end state  
Transition Logging  Log every state change with timestamp  
Event Emission  Emit structured event for each transition  
Schema Validation  Validate workflow JSON against schema  
 
Non -Functional Requirements : 
 
Requirement  Target  
Execution Time  < 50ms per transition  
Concurrency  Handle 100 concurrent executions  
Memory  Stateless execution (no in -memory state)  
Versioning  Immutable definitions once deployed  
 
Execution Algorithm  
python  
def execute_transition(workflow, application_data):  
    current_state = workflow['initial_state']  
     
    while True:  
        state_def = workflow['states'][current_state]  
         

        # Check if terminal  
        if not state_def['transitions']:  
            break  
         
        # Find matching transition  
        for transition in state_def['transitions']:  
            if evaluate_condition (transition['condition'], application_data):  
                # Log transition  
                log_transition(current_state, transition['to'])  
                 
                # Emit event  
                emit_event(transition['emit_event'], application_data)  
                 
                # Move to next state  
                current_state = transition['to']  
                break  
        else:  
            # No transition matched  
            raise NoTransitionError()  
     
    return current_state  
``` 
 
### Condition Grammar (Safe)  
``` 
condition       := comparison | logical  

comparison   := field operator value  
logical          := comparison (AND | OR) comparison  
field              := identifier  
operator      := < | > | <= | >= | == | !=  
value            := number | string | boolean  
identifier     := [a -zA-Z_][a -zA-Z0-9_]*  
Explicitly Forbidden:  
• Function calls  
• Method invocation  
• Dynamic property access  
• Nested expressions beyond one level  
 
6.2 Primitive 2: Schema Engine  
Definition  
Type -safe data structure validation for all institutional objects.  
Example Schema  
json 
{ 
  "applicant": {  
    "type": "object",  
    "required": ["name", "email"],  
    "properties": {  
      "name": {"type": "string", "minLength": 1},  
      "email": {"type": "string", "format": "email"},  
      "phone": {"type": "string", "pattern": "^[0 -9]{10}$"}  
    } 

  }, 
  "application": {  
    "type": "object",  
    "required": ["program", "percentage"],  
    "properties": {  
      "program": {"type": "string", "enum": ["btech -cse", "btech -ece"]},  
      "percentage": {"type": "number", "minimum": 0, "maximum": 100},  
      "sat_score": {"type": "number", "minimum": 400, "maximum": 1600}  
    } 
  } 
} 
Validation Rules  
1. Required Fields:  Must be present  
2. Type Checking:  String, number, boolean, object, array  
3. Format Validation:  Email, URL, date, phone  
4. Range Constraints:  Min/max for numbers  
5. Pattern Matching:  Regex for strings  
6. Enum Validation:  Value must be in allowed list  
 
6.3 Primitive 3: Event Engine  
Definition  
Structured event emission for every state transition and system action.  
Event Structure  
json 
{ 
  "id": "evt_1a2b3c4d",  

  "type": "workflow.transitioned",  
  "version": "v1",  
  "timestamp": "2026 -02-23T10:30:45Z",  
  "institution_id": "inst_mit",  
  "project_id": "proj_admissions",  
  "data": {  
    "application_id": "app_123",  
    "workflow_id": "wf_undergraduate",  
    "from_state": "submitted",  
    "to_state": "auto_accepted",  
    "triggered_by": "system",  
    "reason": "percentage (92) >= threshold (90)"  
  } 
} 
Event Types (MVP)  
Event Type  Emitted When  
workflow.transitioned  State changes  
application.submitted  New application created  
application.auto_accepted  Auto -accept triggered  
application.accepted  Manual acceptance  
application.rejected  Application rejected  
template.deployed  Template deployed to project  
ai.blueprint.generated  AI creates new blueprint  

ai.blueprint.deployed  AI blueprint deployed  
 
Event Storage (MVP)  
• Store in events table (PostgreSQL)  
• Append to Redis stream for real -time  
• Expose via WebSocket to console  
• Queryable via REST endpoint  
Event Versioning (Future)  
json 
{ 
  "type": "workflow.transitioned",  
  "version": "v2",  // New version  
  "data": {  
    // v2 adds 'execution_time_ms' field  
    "execution_time_ms": 45  
  } 
} 
6.4 Primitive 4: RBAC Engine  
Definition  
Role -based access control with row -level security.  
Role Structure  
json 
{ 
  "role_id": "admissions_officer",  
  "permissions": [  
    "application:read",  

    "application:approve",  
    "application:reject",  
    "workflow:read",  
    "event:read"  
  ], 
  "constraints": {  
    "institution_id": "inst_mit",  
    "project_id": "proj_admissions"  
  } 
} 
Permission Matrix (MVP)  
Role  Permissions  
Developer  All (admin access)  
Admissions Officer  application:*, workflow:read, event:read  
Reviewer  application:read, application:recommend  
API Client  Scoped by API key  
 
Row -Level Security  
Every query filtered by:  
sql 
WHERE institution_id = current_user.institution_id  
  AND project_id IN (SELECT project_id FROM user_projects WHERE user_id = current_user.id)  
``` 
 

--- 
 
# 7. AI Blueprint Generator (Core Innovation)  
 
## 7.1 Philosophy  
 
**AI is not an assistant. AI is a structural compiler.**  
``` 
Natural Language Description  
         ↓ 
   AI Structural Generator  
         ↓ 
   Institutional Blueprint  
         ↓ 
   Validation Layers (4 stages)  
         ↓ 
   Human Review & Approval  
         ↓ 
   Deployed Infrastructure  
7.2 Blueprint Object Model  
Complete Blueprint Structure  
json 
{ 
  "metadata": {  
    "name": "Graduate Admissions with Committee Review",  
    "description": "Rolling admissions with faculty committee review for borderline cases",  

    "version": "0.1 -draft",  
    "generated_at": "2026 -02-23T10:30:00Z",  
    "generated_by": "ai",  
    "compliance_tags": ["FERPA", "DPDP"]  
  }, 
   
  "schemas": {  
    "applicant": {  
      "type": "object",  
      "required": ["name", "email", "gpa"],  
      "properties": {  
        "name": {"type": "string"},  
        "email": {"type": "string", "format": "email"},  
        "gpa": {"type": "number", "minimum": 0, "maximum": 4.0},  
        "gre_score": {"type": "number", "minimum": 260, "maximum": 340}  
      } 
    } 
  }, 
   
  "workflows": {  
    "main": {  
      "initial_state": "submitted",  
      "states": {  
        "submitted": {  
          "type": "initial",  
          "transitions": [  

            {"to": "auto_accepted", "condition": "gpa >= 3.8"},  
            {"to": "auto_rejected", "condition": "gpa < 2.5"},  
            {"to": "committee_review", "condition": "gpa >= 2.5 and gpa < 3.8"}  
          ] 
        }, 
        "committee_review": {  
          "type": "intermediate",  
          "transitions": [  
            {"to": "accepted", "condition": "committee_decision == approved"},  
            {"to": "rejected", "condition": "committee_decision == rejected"}  
          ] 
        }, 
        "auto_accepted": {"type": "terminal", "transitions": []},  
        "accepted": {"type": "terminal", "transitions": []},  
        "auto_rejected": {"type": "terminal", "transitions": []},  
        "rejected": {"type": "terminal", "transitions": []}  
      } 
    } 
  }, 
   
  "roles": [  
    { 
      "id": "admissions_officer",  
      "name": "Admissions Officer",  
      "permissions": ["application:read", "application:approve", "application:reject"]  
    }, 

    { 
      "id": "committee_member",  
      "name": "Faculty Committee Member",  
      "permissions": ["application:read", "application:recommend"]  
    }, 
    { 
      "id": "department_chair",  
      "name": "Department Chair",  
      "permissions": ["application:read", "application:approve", "application:assign_reviewer"]  
    } 
  ], 
   
  "permissions": [  
    { 
      "action": "application:approve",  
      "allowed_roles": ["admissions_officer", "department_chair"],  
      "conditions": ["application.status == under_review"]  
    } 
  ], 
   
  "events": [  
    {"type": "application.submitted", "emit_on": "state_transition to submitted"},  
    {"type": "application.auto_accepted", "emit_on": "state_transition to auto_accepted"},  
    {"type": "application.committee_review", "emit_on": "state_transition to 
committee_review"},  
    {"type": "application.accepted", "emit_on": "state_transition to accepted"},  

    {"type": "application.rejected", "emit_on": "state_transition to rejected"}  
  ], 
   
  "integrations": [  
    {"type": "email", "trigger": "application.auto_accepted", "template": "acceptance_email"},  
    {"type": "email", "trigger": "application.rejected", "template": "rejection_email"},  
    {"type": "lms", "trigger": "application.accepted", "action": "create_student_account"}  
  ] 
} 
``` 
 
## 7.3 AI Generation Modes  
 
### Mode A: Full Blueprint Generation (Primary)  
 
**User Input:**  
``` 
"We have rolling admissions for graduate programs.  
Applications with GPA ≥ 3.8 are auto -accepted.  
Below 2.5 are auto -rejected.  
Between 2.5 -3.8 require faculty committee review."  
``` 
 
**AI Generates:**  
- Complete workflow (6 states, 8 transitions)  
- 3 roles (Admissions Officer, Committee Member, Chair)  

- Permission matrix (who can approve/reject)  
- Validation schema (GPA range, required fields)  
- Event definitions (8 events)  
- Integration suggestions (email, LMS)  
 
### Mode B: Modular Generation (Future)  
 
**User Selects:**  
- [ ] Generate workflow only  
- [ ] Generate roles only  
- [ ] Generate validation schema only  
- [ ] Generate event definitions only  
 
**Use Case:** Modify existing blueprint, not start from scratch  
 
### Mode C: Refinement Mode (Future)  
 
**User Input:**  
``` 
"Add second -level approval for scholarship applicants above ₹5 lakh"  
``` 
 
**AI Modifies:**  
- Adds new state: `scholarship_review`  
- Adds new transition condition  
- Returns diff preview  

- Requires approval before applying  
 
## 7.4 AI System Prompt (Strict Contract)  
``` 
SYSTEM INSTRUCTION:  
 
You are an institutional workflow infrastructure compiler.  
 
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
Invalid output will be rejected.  
7.5 AI Implementation (OpenAI Function Calling)  
python  
# ai/blueprint_generator.py  
 
BLUEPRINT_FUNCTION_SCHEMA = {  
    "name": "generate_institutional_blueprint",  
    "description": "Generate a complete institutional workflow blueprint",  
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
                        "items": {"type": "string", "enum": ["FERPA", "DPDP", "GDPR"]}  
                    } 
                } 
            }, 
            "schemas": {  
                "type": "object",  
                "additionalProperties": {"type": "object"}  
            }, 
            "workflows": {  
                "type": "object",  
                "required": ["main"],  
                "properties": {  
                    "main": {  
                        "type": "object",  
                        "required": ["initial_state", "states"],  
                        "properties": {  
                            "initial_state": {"type": "string"},  
                            "states": {  
                                "type": "object",  

                                "additionalProperties": {  
                                    "type": "object",  
                                    "required": ["type", "transitions"],  
                                    "properties": {  
                                        "type": {  
                                            "type": "string",  
                                            "enum": ["initial", "intermediate", "terminal"]  
                                        }, 
                                        "transitions": {  
                                            "type": "array",  
                                            "items": {  
                                                "type": "object",  
                                                "required": ["to", "condition"],  
                                                "properties": {  
                                                    "to": {"type": "string"},  
                                                    "condition": {"type": "string"}  
                                                } 
                                            } 
                                        } 
                                    } 
                                } 
                            } 
                        } 
                    } 
                } 
            }, 

            "roles": {  
                "type": "array",  
                "minItems": 2,  
                "maxItems": 10,  
                "items": {  
                    "type": "object",  
                    "required": ["id", "name", "permissions"],  
                    "properties": {  
                        "id": {"type": "string"},  
                        "name": {"type": "string"},  
                        "permissions": {  
                            "type": "array",  
                            "items": {"type": "string"}  
                        } 
                    } 
                } 
            }, 
            "events": {  
                "type": "array",  
                "items": {  
                    "type": "object",  
                    "required": ["type", "emit_on"],  
                    "properties": {  
                        "type": {"type": "string"},  
                        "emit_on": {"type": "string"}  
                    } 

                } 
            } 
        } 
    } 
} 
 
async def generate_blueprint(prompt: str, context: dict) -> Blueprint:  
    """ 
    Generate institutional blueprint from natural language.  
    """ 
    response = await openai.chat. completions.create(  
        model="gpt -4", 
        temperature=0.3,  # Low temperature for deterministic output  
        messages=[  
            { 
                "role": "system",  
                "content": AI_SYSTEM_INSTRUCTION  # Strict contract above  
            }, 
            { 
                "role": "user",  
                "content": f"""Generate institutional workflow blueprint:  
 
Institution Context:  
- Type: {context.institution_type}  
- Size: {context.size}  
- Compliance: {context.compliance_requirements}  

 
Process Description:  
{prompt}  
 
Generate complete blueprint with workflows, roles, permissions, and events."""  
            } 
        ], 
        tools=[{  
            "type": "function",  
            "function": BLUEPRINT_FUNCTION_SCHEMA  
        }], 
        tool_choice={"type": "function", "function": {"name": "generate_institutional_blueprint"}}  
    ) 
     
    # Extract blueprint from function call  
    tool_call = response.choices[0].message.tool_calls[0]  
    blueprint_json = json.loads(tool_call.function.arguments)  
     
    # Construct Blueprint object  
    blueprint = Blueprint(**blueprint_json)  
     
    return blueprint  
7.6 Validation Pipeline (4 -Stage)  
Stage 1: Schema Validation  
python  
class SchemaValidator:  

    def validate(self, blueprint: Blueprint) -> ValidationResult:  
        """ 
        Validate against JSON schema.  
        """ 
        errors = []  
         
        # Check required fields  
        if not blueprint.metadata.name:  
            errors.append("metadata.name is required")  
         
        # Check workflow structure  
        if "main" not in blueprint.workflows:  
            errors.append("workflows.main is required")  
         
        # Check state definitions  
        main_workflow = blueprint.workflows["main"]  
        if not main_workflow.initial_state:  
            errors.append("initial_state is required")  
         
        # Validate all referenced states exist  
        all_states = set(main_workflow.states.keys())  
        for state_name, state_def in main_workflow.states.items():  
            for transition in state_def.transitions:  
                if transition.to not in all_states:  
                    errors.append(f"Transition to undefined state: {transition.to}")  
         

        return ValidationResult(  
            valid=len(errors) == 0,  
            errors=errors  
        ) 
Stage 2: Graph Integrity Validation  
python  
class GraphAnalyzer:  
    def analyze(self, workflow: Workflow) -> GraphAnalysis:  
        """ 
        Check for unreachable states, circular transitions, terminal states.  
        """ 
        initial = workflow.initial_state  
         
        # Find all reachable states (BFS)  
        reachable = self._find_reachable(workflow, initial)  
         
        # Find unreachable states  
        all_states = set(workflow.states.keys())  
        unreachable = all_states - reachable  
         
        # Find terminal states  
        terminals = [  
            state for state, defn in workflow.states.items()  
            if not defn.transitions  
        ] 
         

        # Check for cycles (dangerous)  
        has_cycles = self._detect_cycles(workflow)  
         
        return GraphAnalysis(  
            reachable_states=list(reachable),  
            unreachable_states=list(unreachable),  
            terminal_states=terminals,  
            has_cycles=has_cycles,  
            is_valid=len(unreachable) == 0 and len(terminals) > 0  
        ) 
     
    def _find_reachable(self, workflow, start_state):  
        """BFS to find all reachable states."""  
        visited = set()  
        queue = [start_state]  
         
        while queue:  
            state = queue.pop(0)  
            if state in visited:  
                continue  
            visited.add(state)  
             
            state_def = workflow.states.get(state)  
            if state_def:  
                for transition in state_def.transitions:  
                    queue.append(transition.to)  

         
        return visited  
Stage 3: Permission Conflict Analyzer  
python  
class PermissionAnalyzer:  
    def analyze(self, blueprint: Blueprint) -> PermissionAnalysis:  
        """ 
        Check for contradictory permissions.  
        """ 
        conflicts = []  
         
        # Check if any role has both approve and restrict permissions  
        for role in blueprint.roles:  
            perms = set(role.permissions)  
             
            # Example conflict: can't have both approve and deny  
            if "application:approve" in perms and "application:deny_all" in perms:  
                conflicts.append(f"Role {role.id} has conflicting permissions")  
         
        # Check for privilege escalation paths  
        escalation_risks = self._check_escalation(blueprint.roles)  
         
        return PermissionAnalysis(  
            conflicts=conflicts,  
            escalation_risks=escalation_risks,  
            is_valid=len(conflicts) == 0  

        ) 
Stage 4: Compliance Rule Checker  
python  
class ComplianceChecker:  
    def check(self, blueprint: Blueprint) -> ComplianceReport:  
        """ 
        Check compliance with FERPA, DPDP rules.  
        """ 
        issues = []  
        warnings = []  
         
        # FERPA: Sensitive data must have role restrictions  
        if self._has_sensitive_fields(blueprint.schemas):  
            if not self._has_role_restrictions(blueprint.roles):  
                issues.append("FERPA: Sensitive data requires role -based access")  
         
        # DPDP: Rejections must emit notification  
        workflow = blueprint.workflows.get("main")  
        if workflow:  
            rejection_states = [s for s in workflow.states if "reject" in s.lower()]  
            for state in rejection_states:  
                if not self._has_notification_event(state, blueprint.events):  
                    warnings.append(f"DPDP: Rejection state '{state}' should emit notification")  
         
        return ComplianceReport(  
            issues=issues,  

            warnings=warnings,  
            compliant=len(issues) == 0  
        ) 
``` 
 
## 7.7 AI Output Preview Interface  
 
### Console UI Flow  
``` 
1. User enters prompt in AI Generator page  
2. Click "Generate Blueprint"  
3. Loading state (3 -5 seconds)  
4. Preview appears with 5 tabs:  
 
   Tab 1: Overview  
   - Blueprint name  
   - Description  
   - Compliance tags  
   - Summary stats (5 states, 3 roles, 8 events)  
    
   Tab 2: Workflow Graph  
   - Visual SVG rendering  
   - Interactive node inspection  
   - Condition tooltips  
    
   Tab 3: JSON Blueprint  

   - Syntax -highlighted code  
   - Collapsible sections  
   - Copy button  
    
   Tab 4: Validation Report  
   - ✓ Schema: Valid  
   - ✓ Graph: No unreachable states  
   - ⚠ Permissions: 1 warning  
   - ✓ Compliance: FERPA compliant  
    
   Tab 5: Roles & Permissions  
   - Table view of roles  
   - Permission matrix  
   - Conflict warnings  
 
5. Action buttons:  
   [ Edit Blueprint ] [ Deploy ] [ Cancel ]  
``` 
 
### Validation Display  
``` 
┌─ Validation Results ─────────────────────────┐  
│                                                  │ 
│  ✓ Schema Validation                                     │ 
│    All required fields present                 │ 
│    No unknown properties                       │ 

│                                                  │ 
│  ✓ Graph Integrity                             │ 
│    All states reachable                         │ 
│    3 terminal states found                     │ 
│    No circular transitions                      │ 
│                                                  │ 
│  ⚠ Permission Analysis                         │ 
│    Warning: Role 'reviewer' has limited       │ 
│    permissions. Consider adding read access.  │ 
│                                                  │ 
│  ✓ Compliance Check                           │ 
│    FERPA: Role -based access configured         │ 
│    DPDP: Notification events present           │ 
│                                                  │ 
└─────────────────────────────────────────┘  
[ Deploy This Blueprint]  
7.8 Deployment Flow  
python  
@router.post("/ai/blueprints/{blueprint_id}/deploy")  
async def deploy_ai_blueprint(  
    blueprint_id: str,  
    deployment: BlueprintDeployment,  
    db: Session = Depends(get_db),  
    current_user: User = Depends(get_current_user)  
): 
    """ 

    Deploy AI -generated blueprint after human approval.  
    """ 
    # 1. Load proposal  
    proposal = db.query(BlueprintProposal).filter_by(id=blueprint_id).first()  
    if not proposal:  
        raise HTTPException(404, "Blueprint not found")  
     
    # 2. Re -validate (safety check)  
    validation = validate_blueprint(proposal.blueprint)  
    if not validation.valid:  
        raise HTTPException(400, f"Blueprint  validation failed: {validation.errors}")  
     
    # 3. Create workflow  
    workflow = Workflow(  
        id=f"wf_{generate_id()}",  
        project_id=deployment.project_id,  
        name=proposal.blueprint.metadata.name,  
        definition=proposal.blueprint.workflows["main"],  
        version="1.0",  
        generated_by_ai=True,  
        created_by=current_user.id  
    ) 
    db.add(workflow)  
     
    # 4. Create roles  
    for role_def in proposal.blueprint.roles:  

        role = Role(  
            project_id=deployment.project_id,  
            name=role_def.name,  
            permissions=role_def.permissions  
        ) 
        db.add(role)  
     
    # 5. Store event definitions  
    for event_def in proposal.blueprint.events:  
        event_schema = EventSchema(  
            project_id=deployment.project_id,  
            type=event_def.type,  
            emit_trigger=event_def.emit_on  
        ) 
        db.add(event_schema)  
     
    # 6. Mark proposal as deployed  
    proposal.status = "deployed"  
    proposal.deployed_workflow_id = workflow.id  
    proposal.deployed_at = datetime.utcnow()  
     
    db.commit()  
     
    # 7. Emit system event  
    emit_event(  
        "ai.blueprint.deployed",  

        { 
            "blueprint_id": blueprint_id,  
            "workflow_id": workflow.id,  
            "project_id": deployment.project_id,  
            "deployed_by": current_user.id  
        } 
    ) 
     
    # 8. Audit log  
    audit_log(  
        action="ai.blueprint.deploy",  
        user_id=current_user.id,  
        resource_id=workflow.id,  
        details={  
            "blueprint_id": blueprint_id,  
            "validation_passed": True  
        } 
    ) 
     
    return {  
        "workflow_id": workflow.id,  
        "roles_created": len(proposal.blueprint.roles),  
        "events_configured": len(proposal.blueprint.events),  
        "status": "deployed",  
        "console_url": f"/console/workflows/{workflow.id}"  
    } 

``` 
 
## 7.9 Safety Constraints  
 
### Input Constraints  
- Max prompt length: 2000 characters  
- Rate limit: 5 generations per minute per user  
- Require project context (institution type, compliance)  
 
### Output Constraints  
- Max states: 15 (prevent complexity explosion)  
- Max transitions per state: 5  
- Max roles: 10  
- Max condition depth: 1 (no nested expressions)  
 
### Validation Requirements  
- ALL blueprints must pass 4 -stage validation  
- Validation errors block deployment  
- Warnings allowed but flagged  
 
### Human -in-the-Loop  
- NO auto -deployment (ever)  
- Preview required  
- Explicit approval action  
- Deployment creates audit trail  
 

--- 
 
# 8. System Architecture  
 
## 8.1 Technology Stack  
 
### Backend  
``` 
Language:     Python 3.11  
Framework:    FastAPI  
Database:     SQLite (MVP) → PostgreSQL (production)  
Cache/Events: Redis  
AI:           OpenAI API (GPT -4) 
Auth:         JWT (python -jose)  
Validation:   Pydantic  
ORM:          SQLAlchemy  
``` 
 
### Frontend  
``` 
Framework:    Next.js 14 (App Router)  
Language:     TypeScript  
Styling:      Tailwind CSS  
State:        React Context / Zustand (if needed)  
WebSocket:    native WebSocket API  
Charts:       Recharts (minimal use)  

Code Editor:  Monaco (workflow editor)  
``` 
 
### Infrastructure  
``` 
Backend Host:  Railway  
Frontend Host: Vercel  
Redis:         Upstash (free tier)  
Database:      Railway PostgreSQL (production)  
8.2 Data Model (MVP)  
Tables  
sql 
-- institutions  
CREATE TABLE institutions (  
    id VARCHAR(50) PRIMARY KEY ,  
    name VARCHAR(200) NOT NULL,  
    created_at TIMESTAMP DEFAULT NOW()  
); 
 
-- projects  
CREATE TABLE projects (  
    id VARCHAR(50) PRIMARY KEY ,  
    institution_id VARCHAR(50) REFERENCES institutions(id),  
    name VARCHAR(200) NOT NULL,  
    created_at TIMESTAMP DEFAULT NOW()  
); 

 
-- workflows  
CREATE TABLE workflows (  
    id VARCHAR( 50) PRIMARY KEY ,  
    project_id VARCHAR(50) REFERENCES projects(id),  
    name VARCHAR(200) NOT NULL,  
    definition JSONB NOT NULL,  -- The workflow JSON  
    version VARCHAR(20) NOT NULL,  
    generated_by_ai BOOLEAN DEFAULT FALSE,  
    created_by VARCHAR(50),  
    created_at TIMESTAMP DEFAULT NOW()  
); 
 
-- applications  
CREATE TABLE applications (  
    id VARCHAR(50) PRIMARY KEY ,  
    project_id VARCHAR(50) REFERENCES projects(id),  
    workflow_id VARCHAR(50) REFERENCES workflows(id),  
    current_state VARCHAR(100) NOT NULL,  
    applicant_data JSONB NOT NULL,  
    custom_fields JSONB,  
    created_at TIMESTAMP DEFAULT NOW(),  
    updated_at TIMESTAMP DEFAULT NOW()  
); 
 
-- events  

CREATE TABLE events (  
    id VARCHAR(50) PRIMARY KEY ,  
    institution_id VARCHAR( 50) REFERENCES institutions(id),  
    project_id VARCHAR(50) REFERENCES projects(id),  
    type VARCHAR(100) NOT NULL,  
    version VARCHAR(20) DEFAULT 'v1',  
    data JSONB NOT NULL,  
    timestamp TIMESTAMP DEFAULT NOW()  
); 
 
-- blueprint_proposals (AI -generated)  
CREATE TABLE blueprint_proposals (  
    id VARCHAR(50) PRIMARY KEY ,  
    project_id VARCHAR(50) REFERENCES projects(id),  
    blueprint JSONB NOT NULL,  -- Full blueprint object  
    validation_result JSONB NOT NULL,  
    status VARCHAR(50) NOT NULL,  -- pending_approval, deployed, rejected  
    deployed_workflow_id VARCHAR(50),  
    created_by VARCHAR(50),  
    created_at TIMESTAMP DEFAULT NOW(),  
    deployed_at TIMESTAMP  
); 
 
-- users (basic auth)  
CREATE TABLE users (  
    id VARCHAR(50) PRIMARY KEY ,  

    email VARCHAR(200) UNIQUE NOT NULL,  
    password_hash VARCHAR(200) NOT NULL,  
    institution_id VARCHAR(50) REFERENCES institutions(id),  
    created_at TIMESTAMP DEFAULT NOW()  
); 
 
-- api_keys  
CREATE TABLE api_keys (  
    id VARCHAR( 50) PRIMARY KEY ,  
    user_id VARCHAR(50) REFERENCES users(id),  
    key_hash VARCHAR(200) NOT NULL,  
    name VARCHAR(200),  
    project_id VARCHAR(50) REFERENCES projects(id),  
    created_at TIMESTAMP DEFAULT NOW(),  
    expires_at TIMESTAMP  
); 
``` 
 
## 8.3 API Endpoints (MVP)  
 
### Authentication  
``` 
POST   /auth/signup              Create account  
POST   /auth/login               Get JWT token  
POST   /auth/refresh             Refresh token  
``` 

 
### Projects  
``` 
GET    /projects                 List user's projects  
POST   /projects                 Create project  
GET    /projects/:id             Get project details  
``` 
 
### Templates  
``` 
GET    /templates                List available templates  
GET    /templates/:id            Get template details  
POST   /templates/:id/deploy     Deploy template to project  
``` 
 
### Workflows  
``` 
GET    /workflows                List workflows in project  
GET    /workflows/:id            Get workflow definition  
POST   /workflows/:id/fork       Fork workflow for editing  
PUT    /workflows/:id            Update workflow (future)  
``` 
 
### Applications  
``` 
POST   /applications             Submit new application  

GET    /applications/:id         Get application details  
POST   /applications/:id/transition  Manual state transition (future)  
``` 
 
### Events  
``` 
GET    /events                   List events (paginated)  
GET    /events/:id               Get event details  
WS     /events/stream            WebSocket stream  
``` 
 
### AI Generator  
``` 
POST   /ai/generate              Generate blueprint from prompt  
GET    /ai/blueprints/:id        Get blueprint proposal  
POST   /ai/blueprints/:id/deploy  Deploy approved blueprint  
DELETE /ai/blueprints/:id        Reject blueprint  
``` 
 
## 8.4 Security Model  
 
### Authentication Flow  
``` 
1. User signs up → JWT issued  
2. JWT includes: user_id, institution_id  
3. Every API request validated via JWT  

4. API keys also supported for programmatic access  
Multi -Tenant Isolation  
python  
# Automatic tenant scoping  
def get_applications(  
    db: Session,  
    current_user: User = Depends(get_current_user)  
): 
    return db.query(Application).filter(  
        Application.institution_id == current_user.institution_id  
    ).all()  
``` 
 
### API Key Scoping  
``` 
API keys scoped to:  
- institution_id  
- project_id (optional)  
- Permissions (read -only vs full access)  
``` 
 
--- 
# 9. MVP Scope Definition  
 
## 9.1 What WILL Be Built (Hackathon)  
 

**Backend API  ** 
- FastAPI setup  
- 5 core tables (institutions, projects, workflows, applications, events)  
- Workflow engine (deterministic execution)  
- Template system (1 pre -built template)  
- Event emission (Redis + database)  
- JWT authentication  
- OpenAI integration for AI generator  
- 4-stage validation pipeline  
 
**Frontend Console  
- Marketing homepage (code -first hero)  
- Dashboard (API key, deploy button, event stream)  
- Template gallery (2 templates)  
- AI Blueprint Generator (prompt → preview → deploy)  
- Event stream viewer (live WebSocket)  
- API Playground (optional but recommended)  
 
**Documentation  
- 1-page quickstart guide  
- API endpoint documentation  
- Blueprint JSON schema reference  
 
**Demo Choreography **  
- 3-minute demo script  
- Test data seeded  

- Demo video recording  
 
## 9.2 What Will NOT Be Built (Post -Hackathon)  
 
- Event Schema Registry (show diagram only)  
- Workflow Migration Simulator (mention in pitch)  
- Multi -environment (Test/Live isolation)Advanced RBAC (role editor)  
- Webhook retry logic   
- Compliance dashboard   
- Performance charts   
- Billing system   
- Team collaboration features   
- Production deployment hardening  
 
## 9.3 What Will Be DESIGNED (Architecture)  
- Event Schema Registry architecture diagram  
- Migration Simulator mockup screenshot  
- Multi -tenant isolation diagram  
- Compliance mapping table (FERPA → RLS + Audit)  
- Scalability roadmap (Phases 1 -4) 
 
To be seen:  
- You built working infrastructure  
- You designed for scale  
- You understand production requirements  
 
--- 
 

# 10. Demo Flow (Critical)  
 
## 10.1 5 -Minute Demo Script  
 
### **Minute 1: The Problem (30 seconds)**  
``` 
"Colleges spend $500K on ERPs that don't fit their workflows.  
Why? Because institutional logic is hardcoded.  
 
We're building programmable infrastructure for institutional workflows."  
``` 
 
### **Minute 2: The Solution Architecture (60 seconds)**  
``` 
[Show architecture diagram]  
 
"Four infrastructure primitives:  
1. Workflow Engine: JSON state machines  
2. Schema Engine: Type -safe validation  
3. Event Engine: Real -time updates  
4. RBAC Engine: Security built -in 
 
Everything versioned. Everything auditable.  
AI generates the infrastructure."  
``` 
 

### **Minute 3: Live Demo Part 1 - Template (60 seconds)**  
``` 
[Share screen: Console]  
 
1. Show dashboard  
2. Click "Deploy Template" button  
3. Select "Undergraduate Admissions"  
4. Click Deploy → Workflow created  
5. Show event stream: "template.deployed"  
 
"One click. Production -ready workflow infrastructure."  
``` 
 
### **Minute 4: Live Demo Part 2 - API (60 seconds)**  
``` 
[Switch to API Playground]  
 
1. Show code:  
   POST /applications  
   { 
     "applicant": {"name": "Sarah"},  
     "percentage": 92  
   } 
 
2. Click "Run"  
3. Response: "auto_accepted" (instant)  

4. Show event stream: "workflow.transitioned"  
 
"Workflow executed. Event emitted. All deterministic."  
``` 
 
### **Minute 5: Live Demo Part 3 - AI (90 seconds)**  
``` 
[Switch to AI Generator]  
 
1. Type prompt:  
   "Rolling admissions. Auto -reject below 60%.  
    Department review for 60 -85%."  
 
2. Click Generate (3 seconds)  
3. Show preview:  
   - Workflow graph (5 states)  
   - Validation: ✓ All checks passed  
   - Roles: 3 roles generated  
 
4. Click Deploy  
5. Show new workflow in dashboard  
 
6. Run same API call:  
   POST /applications {"percentage": 55}  
   Response: "auto_rejected"  
 

"AI generated infrastructure. We deployed it. It works."  
10.2 Demo Day Slides (3 slides max)  
Slide 1: Problem  
• Traditional ERPs: Hardcoded logic  
• Developers: Rebuild workflows every time  
• Gap: No infrastructure abstraction  
Slide 2: Solution  
• Programmable workflow infrastructure  
• AI generates validated blueprints  
• Event -native architecture  
• Developer -first APIs  
Slide 3: Architecture  
• Four primitives diagram  
• Template → AI → Custom (three paths)  
• Event backbone  
• Future vision (marketplace)  
 
11. Success Criteria  
11.1 Hackathon Success Criteria  
Working Demo  
• Template deploys successfully  
• Application transitions automatically  
• Events emit in real -time  
• AI generates valid workflow  
• AI-generated workflow works  
Technical Depth  

• 4-stage validation pipeline working  
• Deterministic workflow execution  
• Safe condition evaluation (no eval)  
• Event persistence + streaming  
Innovation  
• AI as structural compiler (not chatbot)  
• Blueprint abstraction (not just workflow)  
• Infrastructure positioning (not SaaS)  
Presentation  
• Clear 5 -minute pitch  
• Live demo without failures  
• Architecture diagram impresses judges  
• Judges understand "Stripe for workflows"  
11.2 Post -Hackathon Success Criteria  
Developer Adoption:  
• 10 developers sign up  
• 5 deploy a template  
• 3 use AI generator  
• 1 builds integration  
Technical Validation:  
• Workflow engine handles 100 concurrent apps  
• AI generates valid blueprints 95% of time  
• Event latency < 100ms  
• Zero security vulnerabilities  
Strategic Validation:  
• EdTech startup shows interest  

• University IT team requests demo  
• Infrastructure positioning resonates  
12. Roadmap  
12.1 Phase 1: MVP (Hackathon - 17 days)  
Week 1: Core Backend  
• Workflow engine  
• Template system  
• Event emission  
• AI generator  
Week 2: Frontend  
• Marketing homepage  
• Developer console (3 screens)  
• AI preview interface  
Week 3: Polish  
• Demo rehearsal  
• Documentation  
• Video recording  
12.2 Phase 2: Developer Beta (3 months)  
Infrastructure Enhancements:  
• Event Schema Registry (working)  
• Webhook system with retries  
• Multi -environment (Test/Live)  
• Workflow version migration  
Developer Experience:  
• JavaScript SDK  
• Python SDK  

• CLI tool  
• Postman collection  
Console Improvements:  
• Workflow editor with validation  
• Event replay  
• Performance metrics  
12.3 Phase 3: Template Marketplace (6 months)  
Marketplace Features:  
• Public template registry  
• Template versioning  
• Community contributions  
• Template analytics  
AI Improvements:  
• Modular generation (workflow only, roles only)  
• Refinement mode (modify existing)  
• Blueprint -level generation  
Compliance:  
• FERPA compliance automation  
• DPDP audit helpers  
• Governance diff viewer  
12.4 Phase 4: Institutional Infrastructure (12 months)  
Domain Expansion:  
• Course registration workflows  
• Library management  
• Faculty approvals  
• HR processes  

Enterprise Features:  
• SSO integration  
• Advanced RBAC  
• Audit trail export  
• SLA guarantees  
13. Risks & Mitigation  
13.1 Technical Risks  
Risk: AI Generates Invalid Blueprints  
Impact:  High Probability:  Medium Mitigation:  
• 4-stage validation pipeline  
• Strict JSON schema enforcement  
• Human approval required  
• Fail-safe: Fall back to manual workflow definition  
Risk: Workflow Engine Performance  
Impact:  Medium Probability:  Low Mitigation:  
• Stateless execution design  
• Condition complexity limits  
• Load testing before demo  
• Fallback to synchronous execution if async fails  
Risk: Event System Latency  
Impact:  Low Probability:  Low Mitigation:  
• Redis for low latency  
• Async event processing  
• WebSocket for real -time  
• Acceptable latency: <100ms  
13.2 Market Risks  

Risk: Institutions Slow to Adopt  
Impact:  High Probability:  High Mitigation:  
• Target edtech startups first (faster sales cycle)  
• Focus on developer adoption initially  
• Free tier with generous limits  
• Show ROI vs custom development  
Risk: "Not Invented Here" Syndrome  
Impact:  Medium Probability:  Medium Mitigation:  
• Emphasize developer control  
• Show code examples  
• Provide fork/customize options  
• Open API design  
13.3 Scope Risks  
Risk: Overengineering Before Validation  
Impact:  Critical Probability:  Medium Mitigation:  
• Strict MVP boundary  
• Only build what's needed for demo  
• Design advanced features, don't build them  
• Measure adoption before adding features  
14. Competitive Positioning  
14.1 vs Traditional ERP  
 
 
 
 
 

 
Feature  Traditional ERP  AdmitFlow  
Workflow Modification  Vendor customization  JSON editing or AI generation  
Integration  Batch jobs, polling  Real -time events  
Versioning  Risky upgrades  Immutable versions  
Developer Access  Limited APIs  API-first design  
Cost  $500K+ implementation  Free tier + usage -based  
 
14.2 vs No -Code Builders  
 
Feature  No-Code Builder  AdmitFlow  
Target User  Non -technical admins  Developers  
Output  UI forms  Infrastructure  
Runtime  Platform -locked  API-accessible  
Determinism  Visual flows  JSON state machines  
AI Usage  Generate UI  Generate infrastructure  
 
14.3 vs Generic Backend Platforms  
 
Feature  Firebase/Supabase  AdmitFlow  
Abstraction  Database + Auth  Institutional workflows  
Domain Logic  Write yourself  Built -in primitives  
State Machines  Build from scratch  Core feature  
Events  Generic functions  Domain events  
AI Not applicable  Structural generation  
 
 
14.4 Unique Value Proposition  

AdmitFlow is the only platform that:  
1. Treats institutional workflows as infrastructure primitives  
2. Uses AI to generate deterministic runtime architecture  
3. Provides event -native institutional backends  
4. Combines developer -first APIs with domain expertise  
Positioning Statement:  
"Stripe for payments. Auth0 for identity. AdmitFlow for institutional workflows."  
 
15. Long -Term Strategic Vision  
15.1 Market Evolution  
Year 1:  Admissions infrastructure for universities Year 2:  All institutional workflows (registration, 
library, HR) Year 3:  Template marketplace ecosystem Year 5:  Standard runtime for institutional 
systems  
15.2 Business Model (Future)  
Free Tier:  
• 1 project  
• 10,000 API calls/month  
• 1 deployed workflow  
• Community support  
Pro Tier ($99/month):  
• Unlimited projects  
• 500,000 API calls/month  
• Unlimited workflows  
• Email support  
• Multi -environment  
Enterprise (Custom):  
• Volume -based pricing  

• SSO integration  
• SLA guarantees  
• Dedicated support  
• Custom compliance  
15.3 Strategic Moats  
1. Network Effects:  Template marketplace  
2. Data Moat:  Workflow patterns from usage  
3. Switching Costs:  Institutional processes locked in  
4. AI Training:  Better blueprints from feedback loop  
5. Compliance:  Built -in regulatory knowledge  
17. Appendix B: Blueprint JSON Schema  
json 
{ 
  "$schema": "http://json -schema.org/draft -07/schema#",  
  "type": "object",  
  "required": ["metadata", "workflows", "roles"],  
  "properties": {  
    "metadata": {  
      "type": "object",  
      "required": ["name", "description"],  
      "properties": {  
        "name": {"type": "string"},  
        "description": {"type": "string"},  
        "version": {"type": "string"},  
        "compliance_tags": {  
          "type": "array",  

          "items": {"type": "string"}  
        } 
      } 
    }, 
    "schemas": {  
      "type": "object",  
      "additionalProperties": {"type": "object"}  
    }, 
    "workflows": {  
      "type": "object",  
      "required": ["main"],  
      "additionalProperties": {  
        "$ref": "#/definitions/workflow"  
      } 
    }, 
    "roles": {  
      "type": "array",  
      "items": {  
        "type": "object",  
        "required": ["id", "name", "permissions"],  
        "properties": {  
          "id": {"type": "string"},  
          "name": {"type": "string"},  
          "permissions": {  
            "type": "array",  
            "items": {"type": "string"}  

          } 
        } 
      } 
    }, 
    "events": {  
      "type": "array",  
      "items": {  
        "type": "object",  
        "required": ["type", "emit_on"],  
        "properties": {  
          "type": {"type": "string"},  
          "emit_on": {"type": "string"}  
        } 
      } 
    } 
  } 
} 
 
 
8.5 Non -Functional System Requirements  
8.5.1 Availability & Uptime  
Environment  Target  Measurement  
MVP (Hackathon)  95% uptime  Best -effort monitoring  
Production (Post -launch)  99.5% uptime  Uptime monitoring with alerts  

Enterprise (Future)  99.9% SLA  Contractual guarantees + credits  
 
Recovery Targets:  
• Recovery Time Objective (RTO): < 1 hour  
• Recovery Point Objective (RPO): < 15 minutes (event log replay)  
8.5.2 Performance Targets  
Component  Metric  MVP Target  Production Target  
Workflow Execution  P95 latency  < 100ms  < 50ms  
API Response  P95 latency  < 200ms  < 100ms  
Event Emission  Latency  < 100ms  < 50ms  
AI Generation  Timeout  10 seconds  8 seconds  
WebSocket Delivery  Latency  < 500ms  < 200ms  
 
8.5.3 Rate Limiting Policy  
Per User:  
• API calls: 100 requests/minute (MVP), 1000 requests/minute (Pro)  
• AI generations: 5 per minute, 50 per day (MVP)  
• Webhook deliveries: 1000 per hour  
Per Institution:  
• Concurrent workflow executions: 50 (MVP), 500 (Pro)  
• Event storage: 1M events retained (90 days)  
8.5.4 Data Retention & Backup  
Event Storage:  
• Retention: 90 days (standard), 2 years (enterprise)  
• Backup: Daily snapshots, 30 -day retention  

• Audit logs: 7 years (compliance requirement)  
Workflow Definitions:  
• Versioned immutably  
• No automatic deletion  
• Export available via API  
Application Data:  
• Active applications: Indefinite retention  
• Completed applications: 365 days (standard)  
• Deletion on request: 30 -day soft delete  
8.5.5 Security & Compliance  
Authentication:  
• JWT expiration: 24 hours  
• Refresh token: 30 days  
• API keys: No expiration (manual rotation recommended every 90 days)  
Data Encryption:  
• In-transit: TLS 1.3  
• At-rest: AES -256 (production)  
• Secrets: Environment variables (MVP), Vault (production)  
Audit Requirements:  
• All state transitions logged  
• All API calls logged (excluding health checks)  
• All AI generations logged with prompt + output  
• Logs immutable, tamper -evident  
8.5.6 Monitoring & Observability  
Metrics Collected:  
• Workflow execution count, latency, error rate  

• API endpoint latency (per route)  
• AI generation success rate, latency  
• Event delivery success rate  
• Database query performance  
Alerting Thresholds:  
• Error rate > 5%  
• P95 latency > target  
• AI generation failures > 10%  
• Disk usage > 80%  
6.5 Workflow Versioning Strategy  
6.5.1 Philosophy  
Workflows are immutable infrastructure . Once deployed, definitions cannot be modified —only 
superseded by new versions.  
6.5.2 Version Pinning Model  
Applications are pinned to workflow versions at creation time.  
Application Created → Pinned to Workflow v1.0  
   ↓ 
Workflow v2.0 Deployed → New applications use v2.0  
   ↓ 
Old Application → Still runs on v1.0 (pinned)  
Rationale:  
• Prevents mid -flight state corruption  
• Guarantees deterministic execution  
• Enables safe workflow evolution  
6.5.3 Version Coexistence  
Multiple versions run concurrently:  

Workflow: undergraduate -admissions  
 
v1.0 → 47 active applications  
v1.1 → 12 active applications  
v2.0 → 156 active applications (latest)  
Constraints:  
• Max 3 active versions per workflow (MVP)  
• Max 10 active versions (production)  
• Deprecated versions phased out after 90 days notice  
6.5.4 Migration Paths (Designed, Not Built in MVP)  
Future Migration Strategies:  
Strategy 1: Automatic Migration (Safe)  
Conditions:  
- New version is backward -compatible  
- No breaking state changes  
- All existing states preserved  
 
Action:  
- System auto -migrates applications  
- Emits migration.completed event  
- Audit log records change  
Strategy 2: Manual Migration (Breaking Changes)  
Conditions:  
- States renamed or removed  
- Transition logic fundamentally changed  
- Schema incompatible  

 
Action:  
- Admin reviews affected applications  
- Manually transitions to compatible state  
- Or leaves on old version indefinitely  
Strategy 3: Batch Migration  
Workflow:  
1. Identify applications in "safe" states  
2. Queue migration jobs  
3. Execute migrations during low -traffic period  
4. Rollback on first failure  
5. Emit migration.batch.completed  
6.5.5 Version Metadata  
Each workflow version tracks:  
json 
{ 
  "version": "2.0",  
  "created_at": "2026 -03-15T10:00:00Z",  
  "created_by": "user_123",  
  "changelog": "Added scholarship review state",  
  "breaking_changes": true,  
  "migration_path": "manual",  
  "active_applications": 156,  
  "deprecated": false,  
  "deprecation_notice_at": null  
} 

``` 
 
### 6.5.6 Deprecation Process  
 
**Timeline:**  
``` 
Day 0:   New version deployed (v2.0)  
Day 30:  Old version marked "deprecated" (v1.0)  
Day 60:  Migration assistance offered  
Day 90:  New applications blocked on v1.0  
Day 120: v1.0 decommissioned (if zero active apps)  
``` 
 
**User Notifications:**  
- Email alert on deprecation  
- Console warning banner  
- API response header: `X -Workflow -Version -Deprecated: true`  
 
### 6.5.7 Why This Matters  
 
**Without version pinning:**  
- Active applications break mid -execution  
- State corruption  
- Unpredictable behavior  
 
**With version pinning:**  

- Deterministic execution guaranteed  
- Safe workflow evolution  
- Zero downtime deployments  
- Gradual migration possible  
 
--- 
 
## **ENHANCED SECTION 16: Business Model & Go -to-Market**  
 
 
 
Customer Acquisition Funnel  

 
Key Metrics:  
• Signup → Activation: 10% (industry standard: 5 -15%)  
• Activation → Paid: 25% (aggressive for developer tools)  
• Churn: <5% monthly (infra products have low churn)  
16.5 Go -to-Market Strategy  
Phase 1: Developer Community (Months 0 -6) 
Channels:  
1. Developer Relations (DevRel)   


o Technical blog posts (workflows as code, event -driven ERP)  
o Open -source template library on GitHub  
o Conference talks (Python conferences, edtech summits)  
2. Content Marketing   
o "Build an Admissions System in 10 Minutes" tutorial  
o Comparison articles: "Hardcoded ERP vs Infrastructure"  
o Case studies from early adopters  
3. Community Building   
o Discord server for developers  
o Weekly "office hours" for technical questions  
o Open roadmap (public GitHub project board)  
Target:  50 active developers  
Phase 2: Edtech Partnerships (Months 6 -12) 
Direct Outreach:  
1. Edtech Startups   
o White -label admissions platforms  
o SIS (Student Information System) providers  
o Bootcamp management software  
2. University Innovation Labs   
o Partner with forward -thinking IT departments  
o Pilot programs at 3 -5 universities  
o Co-marketing case studies  
Target:  5 paying customers, 2 enterprise pilots  
Phase 3: Enterprise Sales (Months 12 -24) 
Sales Strategy:  
1. Inbound from pilot success  

2. IT consulting partnerships  (Deloitte Digital, Accenture)  
3. University consortium memberships  
Target:  10 enterprise customers  
16.6 Growth Levers  
Network Effects:  
• Template marketplace (more templates → more users)  
• Integration ecosystem (more integrations → more valuable)  
Viral Growth:  
• Open -source templates drive awareness  
• Developer word -of-mouth (technical credibility)  
• API-first means easy try -before -buy 
Expansion Revenue:  
• Start with admissions (foot in door)  
• Expand to registration, library, HR (land and expand)  
• Cross -sell AI workflow generation  
16.7 Competitive Moats  
1. Blueprint Abstraction  (technical moat)  
o Novel approach to institutional infrastructure  
o Not easily replicable  
2. Template Marketplace  (network effects moat)  
o More templates → more users → more templates  
3. Domain Knowledge  (data moat)  
o Workflow patterns from usage  
o Compliance mapping expertise  
4. Developer Lock -in (switching costs moat)  
o Once integrated, hard to migrate  

o Institutional processes encoded in workflows  
5. AI Training Data  (AI moat)  
o Better blueprint generation from feedback loop  
16.8 Initial GTM Focus: Edtech Startups  
Why Start Here:  
• Faster sales cycles (weeks, not years)  
• Developer -centric (natural fit)  
• High technical sophistication  
• Need multi -tenant solutions  
• Open to new infrastructure  
Target Segment:  
• 10-50 person startups  
• Building institutional SaaS (admissions, registration, etc.)  
• Technical founding team  
• Raised Seed/Series A funding  
• US/India markets  
Value Proposition:  
"Stop building workflow infrastructure from scratch. Deploy production -ready admissions 
systems in days, not months."  
IMPROVED APPENDIX A: JSON Schema Reference  
About These Schemas  
The following JSON schemas define strict contracts for deterministic validation . 
AdmitFlow uses these schemas to:  
1. Validate AI -generated blueprints before deployment  
2. Reject invalid workflow definitions early (fail -fast)  
3. Ensure backward compatibility across versions  

4. Enable automated testing and verification  
These schemas are enforced by code , not just documentation. Any workflow or blueprint that 
violates these schemas will be rejected at runtime.  
For Developers:  These schemas also serve as the contract for the REST API. All endpoints accept 
and return data conforming to these definitions.  
For AI System:  The AI generator uses these schemas as function call parameters, ensuring 
structured output.  
 
Workflow JSON Schema  
json 
{ 
  "$schema": "http://json -schema.org/draft -07/schema#",  
  "title": "AdmitFlow Workflow Definition",  
  "description": "Schema for declarative workflow state machines",  
  "type": "object",  
  "required": ["id", "version", "initial_state", "states"],  
  "properties": {  
    "id": {  
      "type": "string",  
      "pattern": "^[a -z0-9-]+$",  
      "description": "Unique workflow identifier (kebab -case)"  
    }, 
    "version": {  
      "type": "string",  
      "pattern": "^[0 -9]+\\.[0-9]+$",  
      "description": "Semantic version (e.g., 1.0, 2.3)"  
    }, 

    "initial_state": {  
      "type": "string",  
      "description": "Starting state for all new applications"  
    }, 
    "states": {  
      "type": "object",  
      "minProperties": 2,  
      "description": "State definitions (at least 2 required)",  
      "additionalProperties": {  
        "type": "object",  
        "required": ["type", "transitions"],  
        "properties": {  
          "type": {  
            "type": "string",  
            "enum": ["initial", "intermediate", "terminal"],  
            "description": "State classification"  
          }, 
          "transitions": {  
            "type": "array",  
            "description": "Available state transitions",  
            "items": {  
              "type": "object",  
              "required": ["to", "condition"],  
              "properties": {  
                "to": {  
                  "type": "string",  

                  "description": "Target state name"  
                }, 
                "condition": {  
                  "type": "string",  
                  "description": "Boolean expression (safe grammar only)"  
                }, 
                "emit_event": {  
                  "type": "string",  
                  "description": "Event to emit on transition"  
                } 
              } 
            } 
          } 
        } 
      } 
    } 
  } 
} 
Blueprint JSON Schema  
(Already comprehensive, just adding introductory context)  
json 
{ 
  "$schema": "http://json -schema.org/draft -07/schema#",  
  "title": "AdmitFlow Institutional Blueprint",  
  "description": "Complete institutional infrastructure definition including workflows, roles, 
events, and schemas",  

  "type": "object",  
  "required": ["metadata", "workflows", "roles"],  
  // ... (rest of schema as defined earlier)  
} 
 
We are not replacing ERP frontends. We are replacing institutional workflow logic  
 
 

