"""Pydantic schemas for AdmitFlow control plane APIs."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    institution_id: str
    email: EmailStr
    password: str = Field(min_length=12)
    name: str = Field(min_length=1)
    role: str = "owner"


class UserResponse(BaseModel):
    id: str
    institution_id: str
    email: str
    name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1)
    slug: str = Field(min_length=1)
    environment: str = "test"


class ProjectResponse(BaseModel):
    id: str
    institution_id: str
    name: str
    slug: str
    environment: str

    model_config = ConfigDict(from_attributes=True)


class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1)
    definition: dict[str, Any]
    is_ai_generated: bool = False


class WorkflowResponse(BaseModel):
    id: str
    institution_id: str
    project_id: str
    name: str
    version: int
    definition: dict[str, Any]
    deployed: bool
    is_ai_generated: bool

    model_config = ConfigDict(from_attributes=True)


class ApplicationCreate(BaseModel):
    workflow_name: str
    applicant_data: dict[str, Any]
    application_data: dict[str, Any]


class ApplicationTransition(BaseModel):
    to_state: str


class ApplicationResponse(BaseModel):
    id: str
    institution_id: str
    project_id: str
    workflow_id: str
    workflow_version: int
    current_state: str
    status: str
    applicant_data: dict[str, Any]
    application_data: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class EventResponse(BaseModel):
    id: str
    type: str
    version: str
    timestamp: datetime
    institution_id: str
    project_id: str
    data: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class BlueprintCompileRequest(BaseModel):
    prompt: str = Field(min_length=1)
    institution_context: dict[str, Any] = Field(default_factory=dict)


class BlueprintProposalResponse(BaseModel):
    id: str
    status: str
    blueprint: dict[str, Any] | None
    validation_result: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)

