"""Core Orquestra data model — deterministic, event-native, multi-tenant runtime."""
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base
from app.time_utils import utcnow_naive


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    domain = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=utcnow_naive, nullable=False)


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("institution_id", "slug", name="uq_project_slug_per_institution"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(120), nullable=False)
    environment = Column(String(32), nullable=False, default="test")
    created_at = Column(DateTime, default=utcnow_naive, nullable=False)

    institution = relationship("Institution", backref="projects")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("institution_id", "email", name="uq_user_email"),)

    id = Column(String, primary_key=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(64), nullable=False, default="owner")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow_naive, nullable=False)

    institution = relationship("Institution", backref="users")


class Workflow(Base):
    __tablename__ = "workflows"
    __table_args__ = (
        UniqueConstraint("institution_id", "project_id", "name", "version", name="uq_workflow_name_version"),
        Index("ix_workflows_definition_gin_like", "definition"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    version = Column(Integer, nullable=False)
    definition = Column(JSON, nullable=False)
    is_ai_generated = Column(Boolean, default=False, nullable=False)
    deployed = Column(Boolean, default=False, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow_naive, nullable=False)
    deployed_at = Column(DateTime)

    institution = relationship("Institution", backref="workflows")
    project = relationship("Project", backref="workflows")


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (Index("ix_applications_workflow", "workflow_id", "workflow_version"),)

    id = Column(String, primary_key=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    workflow_version = Column(Integer, nullable=False)
    current_state = Column(String(120), nullable=False)
    applicant_data = Column(JSON, nullable=False, default=dict)
    application_data = Column(JSON, nullable=False, default=dict)
    status = Column(String(64), nullable=False, default="active")
    created_at = Column(DateTime, default=utcnow_naive, nullable=False)
    updated_at = Column(DateTime, default=utcnow_naive, nullable=False, onupdate=utcnow_naive)


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (Index("ix_events_scope_time", "institution_id", "project_id", "timestamp"),)

    id = Column(String, primary_key=True, default=generate_uuid)
    type = Column(String(255), nullable=False)
    version = Column(String(32), nullable=False, default="1.0")
    timestamp = Column(DateTime, default=utcnow_naive, nullable=False)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    data = Column(JSON, nullable=False, default=dict)


class BlueprintProposal(Base):
    __tablename__ = "blueprint_proposals"

    id = Column(String, primary_key=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    status = Column(String(64), nullable=False, default="pending")
    blueprint = Column(JSON)
    validation_result = Column(JSON, nullable=False, default=dict)
    provider_used = Column(String(64), nullable=False, default="unknown")
    is_mock = Column(Boolean, default=False, nullable=False)
    compiled_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow_naive, nullable=False)
    deployed_at = Column(DateTime)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role", "permission", name="uq_role_permission"),)

    id = Column(String, primary_key=True, default=generate_uuid)
    role = Column(String(64), nullable=False)
    permission = Column(String(128), nullable=False)
    constraint_json = Column(JSON, nullable=False, default=dict)


class ProjectRoleBinding(Base):
    __tablename__ = "project_role_bindings"
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_user_project_binding"),)

    id = Column(String, primary_key=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(64), nullable=False)


class APIKey(Base):
    """Project-scoped API key for programmatic access."""
    __tablename__ = "api_keys"
    __table_args__ = (Index("ix_api_keys_institution", "institution_id"),)

    id = Column(String, primary_key=True, default=generate_uuid)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False, index=True)
    key_hash = Column(String(64), unique=True, nullable=False)  # SHA-256 of full key
    key_prefix = Column(String(16), nullable=False)  # first 12 chars for display
    name = Column(String(255), nullable=False)
    scopes = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow_naive, nullable=False)
    last_used_at = Column(DateTime)
    expires_at = Column(DateTime)

    institution = relationship("Institution", backref="api_keys")


class WorkflowTemplate(Base):
    """Pre-built workflow blueprint templates."""
    __tablename__ = "workflow_templates"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(120), unique=True, nullable=False)
    description = Column(Text, nullable=False, default="")
    category = Column(String(64), nullable=False, default="general")
    compliance_tags = Column(JSON, nullable=False, default=list)
    definition = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=utcnow_naive, nullable=False)
