"""
Workflow engine with safe condition evaluation (NO eval()).
"""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    WorkflowDefinition,
    WorkflowInstance,
    WorkflowTransition,
    Application,
    AuditLog,
)


def evaluate_condition(condition: str, context: dict) -> bool:
    """Safe condition evaluator. Supports: field >= value, field > value, etc."""
    if not condition or not condition.strip():
        return True

    parts = condition.split()
    if len(parts) != 3:
        return False

    field, operator, value_str = parts
    field_value = context.get(field)
    if field_value is None:
        return False

    try:
        value = float(value_str) if "." in value_str else int(value_str)
    except ValueError:
        value = value_str.strip("'\"")

    if operator == ">=":
        return field_value >= value
    if operator == ">":
        return field_value > value
    if operator == "<=":
        return field_value <= value
    if operator == "<":
        return field_value < value
    if operator == "==":
        return field_value == value
    if operator == "!=":
        return field_value != value
    return False


class WorkflowEngine:
    def __init__(self, db: Session):
        self.db = db

    def _find_initial_state(self, state_machine: dict) -> str:
        for name, config in state_machine.get("states", {}).items():
            if config.get("type") == "initial":
                return name
        raise ValueError("No initial state in workflow")

    def start_workflow(
        self, workflow_name: str, application_id: str, context: dict
    ) -> str:
        workflow_def = (
            self.db.query(WorkflowDefinition)
            .filter_by(name=workflow_name, is_active=True)
            .first()
        )
        if not workflow_def:
            raise ValueError(f"Workflow not found: {workflow_name}")

        state_machine = workflow_def.state_machine
        if isinstance(state_machine, str):
            import json
            state_machine = json.loads(state_machine)
        initial_state = self._find_initial_state(state_machine)

        instance = WorkflowInstance(
            workflow_definition_id=workflow_def.id,
            application_id=application_id,
            current_state=initial_state,
            context=context,
            status="active",
        )
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)

        app = self.db.query(Application).filter(Application.id == application_id).first()
        if app:
            app.current_status = initial_state
            app.submitted_at = datetime.utcnow()
            self.db.commit()

        self._process_automatic_transitions(instance, state_machine, context)
        return instance.id

    def transition(
        self, instance_id: str, to_state: str, user_id: Optional[str] = None
    ) -> None:
        instance = self.db.query(WorkflowInstance).filter(WorkflowInstance.id == instance_id).first()
        if not instance:
            raise ValueError("Workflow instance not found")

        from_state = instance.current_state
        workflow_def = self.db.query(WorkflowDefinition).filter(
            WorkflowDefinition.id == instance.workflow_definition_id
        ).first()
        state_machine = workflow_def.state_machine
        if isinstance(state_machine, str):
            import json
            state_machine = json.loads(state_machine)

        if to_state not in state_machine.get("states", {}):
            raise ValueError(f"Invalid state: {to_state}")

        trans = WorkflowTransition(
            instance_id=instance_id,
            from_state=from_state,
            to_state=to_state,
            triggered_by=f"user:{user_id}" if user_id else "system",
        )
        self.db.add(trans)

        instance.current_state = to_state
        app = self.db.query(Application).filter(
            Application.id == instance.application_id
        ).first()
        if app:
            app.current_status = to_state

        is_terminal = state_machine["states"][to_state].get("type") == "terminal"
        if is_terminal:
            instance.status = "completed"
            instance.completed_at = datetime.utcnow()
            if app:
                app.decision = to_state
                app.decision_at = datetime.utcnow()
                app.decision_by = user_id

        self.db.add(
            AuditLog(
                user_id=user_id,
                action="workflow_transition",
                resource_type="application",
                resource_id=instance.application_id,
            )
        )
        self.db.commit()

    def _process_automatic_transitions(
        self, instance: WorkflowInstance, state_machine: dict, context: dict
    ) -> None:
        current_config = state_machine["states"].get(instance.current_state, {})
        for transition in current_config.get("transitions", []):
            if transition.get("automatic"):
                condition = transition.get("condition")
                if evaluate_condition(condition, context):
                    self.transition(instance.id, transition["to"])
                    break

