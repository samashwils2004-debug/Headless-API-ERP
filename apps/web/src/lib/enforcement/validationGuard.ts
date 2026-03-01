import type { ValidationResult } from "@/types/contracts";

export function hasBlockingValidationIssues(validationResult: ValidationResult | null) {
  if (!validationResult) {
    return true;
  }

  return (
    !validationResult.schema.valid ||
    !validationResult.graph.valid ||
    validationResult.graph.has_cycles ||
    validationResult.graph.terminal_states.length === 0 ||
    validationResult.graph.unreachable_states.length > 0 ||
    !validationResult.permissions.valid ||
    !validationResult.compliance.compliant
  );
}

export function assertDeployAllowed(validationResult: ValidationResult | null) {
  if (hasBlockingValidationIssues(validationResult)) {
    throw new Error("Deployment blocked by validation.");
  }
}

