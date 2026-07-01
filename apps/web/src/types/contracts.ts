export type StateType = "initial" | "intermediate" | "terminal";

// ── Shared domain types ───────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  institution_id: string;
  institution_name?: string;
  email: string;
  name: string;
  role: string;
}
export interface ProjectItem {
  id: string;
  institution_id: string;
  name: string;
  slug: string;
  environment: "test" | "production";
}
export interface WorkflowTransition {
  to: string;
  condition: string | null;
  emit_event?: string | null;
}

export interface WorkflowState {
  type: StateType;
  transitions: WorkflowTransition[];
}

export interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  min?: number | null;
  max?: number | null;
  enum?: string[] | null;
  format?: string | null;
}

export interface WorkflowSchema {
  fields: SchemaField[];
}

export interface WorkflowDefinition {
  id?: string;
  name?: string;
  version?: string;
  initial_state: string;
  states: Record<string, WorkflowState>;
  schema?: WorkflowSchema;
}

export interface BlueprintMetadata {
  name: string;
  description: string;
  compliance_tags?: Array<"FERPA" | "DPDP" | "GDPR" | "PCI-DSS">;
}

export interface BlueprintRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface BlueprintEvent {
  type: string;
  emit_on?: string;
  version?: string;
}

export interface InstitutionalBlueprint {
  metadata: BlueprintMetadata;
  schemas?: Record<string, unknown>;
  workflows: {
    main: WorkflowDefinition;
  };
  roles: BlueprintRole[];
  events?: BlueprintEvent[];
}

export interface WorkflowBlueprint {
  workflow: WorkflowDefinition & { schema?: WorkflowSchema };
  roles: BlueprintRole[];
  events: BlueprintEvent[];
  compliance_tags: string[];
}

export interface DomainDef {
  id: string;
  label: string;
  color?: string | null;
  icon?: string;
  modules?: Array<{ id: string; label: string }>;
  requires_workflow?: boolean;
  workflow_id?: string | null;
  workflow_name?: string | null;
}

export interface ERPDomainGraph {
  erp_system: {
    domains: DomainDef[];
  };
}

export interface DomainEvent {
  id: string;
  type: string;
  version: string;
  timestamp: string;
  institution_id: string;
  project_id: string;
  data: Record<string, unknown>;
}

export interface ValidationResult {
  schema: {
    valid: boolean;
    errors: string[];
  };
  graph: {
    valid: boolean;
    unreachable_states: string[];
    has_cycles: boolean;
    terminal_states: string[];
  };
  permissions: {
    valid: boolean;
    conflicts: string[];
    escalation_risks: string[];
  };
  compliance: {
    compliant: boolean;
    issues: string[];
    warnings: string[];
  };
}
