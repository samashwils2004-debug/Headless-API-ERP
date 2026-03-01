export type StateType = "initial" | "intermediate" | "terminal";

export interface WorkflowTransition {
  to: string;
  condition: string;
  emit_event?: string;
}

export interface WorkflowState {
  type: StateType;
  transitions: WorkflowTransition[];
}

export interface WorkflowDefinition {
  id?: string;
  name?: string;
  version?: string;
  initial_state: string;
  states: Record<string, WorkflowState>;
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
  emit_on: string;
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

