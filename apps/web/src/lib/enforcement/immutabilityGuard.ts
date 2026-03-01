export function assertWorkflowEditable(workflow: { deployed?: boolean }) {
  if (workflow.deployed) {
    throw new Error("Deployed workflows are immutable.");
  }
}

