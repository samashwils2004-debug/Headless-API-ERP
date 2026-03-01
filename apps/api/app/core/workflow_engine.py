"""Deterministic workflow executor using immutable workflow definitions."""
from __future__ import annotations

from time import perf_counter
from typing import Any

from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.condition_parser import evaluate_condition
from app.core.event_engine import EventEngine
from app.models import Application, Workflow
from app.observability import WORKFLOW_EXECUTION_TIME_MS
from app.time_utils import utcnow_naive


class WorkflowExecutionError(ValueError):
    pass


class WorkflowEngine:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _is_deadlock(exc: Exception) -> bool:
        return "deadlock" in str(exc).lower()

    def _validate_definition(self, definition: dict[str, Any]) -> None:
        if "initial_state" not in definition or "states" not in definition:
            raise WorkflowExecutionError("Workflow definition missing initial_state or states")
        if definition["initial_state"] not in definition["states"]:
            raise WorkflowExecutionError("initial_state not found in states")

        terminal_found = False
        for state_name, state_def in definition["states"].items():
            transitions = state_def.get("transitions", [])
            if not transitions:
                terminal_found = True
            for transition in transitions:
                to_state = transition.get("to")
                if to_state not in definition["states"]:
                    raise WorkflowExecutionError(f"Undefined transition target from {state_name} -> {to_state}")

        if not terminal_found:
            raise WorkflowExecutionError("Workflow must include at least one terminal state")

    async def execute_until_wait(self, application_id: str) -> Application:
        application = self.db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise WorkflowExecutionError("Application not found")

        workflow = (
            self.db.query(Workflow)
            .filter(
                Workflow.id == application.workflow_id,
                Workflow.version == application.workflow_version,
                Workflow.institution_id == application.institution_id,
                Workflow.project_id == application.project_id,
            )
            .first()
        )
        if not workflow:
            raise WorkflowExecutionError("Workflow version not found")

        definition = workflow.definition
        self._validate_definition(definition)

        started = perf_counter()
        current = application.current_state
        if not current:
            current = definition["initial_state"]
            application.current_state = current

        while True:
            state_def = definition["states"].get(current, {})
            transitions = state_def.get("transitions", [])
            if not transitions:
                application.status = "completed"
                break

            moved = False
            for transition in transitions:
                condition = transition.get("condition")
                if condition and not evaluate_condition(condition, application.application_data):
                    continue

                to_state = transition["to"]
                emit_event = transition.get("emit_event") or "workflow.transitioned"
                from_state = current
                current = to_state
                application.current_state = current
                application.updated_at = utcnow_naive()

                event_engine = EventEngine(self.db)
                await event_engine.emit(
                    emit_event,
                    institution_id=application.institution_id,
                    project_id=application.project_id,
                    data={
                        "application_id": application.id,
                        "workflow_id": application.workflow_id,
                        "workflow_version": application.workflow_version,
                        "from_state": from_state,
                        "to_state": to_state,
                    },
                )
                moved = True
                break

            if not moved:
                application.status = "waiting_manual_action"
                break

        duration_ms = (perf_counter() - started) * 1000
        WORKFLOW_EXECUTION_TIME_MS.observe(duration_ms)
        if duration_ms > 50:
            # Persist an internal metric event instead of failing execution.
            event_engine = EventEngine(self.db)
            await event_engine.emit(
                "workflow.execution.slow",
                institution_id=application.institution_id,
                project_id=application.project_id,
                data={"application_id": application.id, "execution_ms": round(duration_ms, 2)},
            )

        for _ in range(2):
            try:
                self.db.commit()
                self.db.refresh(application)
                return application
            except OperationalError as exc:
                self.db.rollback()
                if not self._is_deadlock(exc):
                    raise

        raise WorkflowExecutionError("Database deadlock retries exhausted")

