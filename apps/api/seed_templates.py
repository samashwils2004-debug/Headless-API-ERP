"""Seed pre-built workflow templates into Orquestra."""
from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, init_db
from app.models import WorkflowTemplate

TEMPLATES = [
    {
        "name": "university_admissions",
        "slug": "university-admissions",
        "description": "End-to-end undergraduate admissions workflow with document verification, committee review, and financial aid integration.",
        "category": "higher-education",
        "compliance_tags": ["FERPA"],
        "definition": {
            "name": "university_admissions",
            "initial_state": "application_received",
            "states": {
                "application_received": {
                    "type": "initial",
                    "transitions": [
                        {"to": "document_review", "condition": None, "emit_event": "application.received"}
                    ],
                },
                "document_review": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "committee_review", "condition": "application_data.documents_verified == true", "emit_event": "documents.verified"},
                        {"to": "documents_incomplete", "condition": "application_data.documents_verified == false", "emit_event": "documents.incomplete"},
                    ],
                },
                "documents_incomplete": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "document_review", "condition": None, "emit_event": "documents.resubmitted"}
                    ],
                },
                "committee_review": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "accepted", "condition": "application_data.score >= 75", "emit_event": "application.accepted"},
                        {"to": "waitlisted", "condition": "application_data.score >= 60", "emit_event": "application.waitlisted"},
                        {"to": "rejected", "condition": "application_data.score < 60", "emit_event": "application.rejected"},
                    ],
                },
                "waitlisted": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "accepted", "condition": None, "emit_event": "application.accepted_from_waitlist"},
                        {"to": "rejected", "condition": None, "emit_event": "application.rejected_from_waitlist"},
                    ],
                },
                "accepted": {"type": "terminal", "transitions": []},
                "rejected": {"type": "terminal", "transitions": []},
            },
        },
    },
    {
        "name": "financial_aid_processing",
        "slug": "financial-aid",
        "description": "FERPA-compliant financial aid application processing with eligibility verification and disbursement tracking.",
        "category": "higher-education",
        "compliance_tags": ["FERPA"],
        "definition": {
            "name": "financial_aid_processing",
            "initial_state": "aid_application_received",
            "states": {
                "aid_application_received": {
                    "type": "initial",
                    "transitions": [
                        {"to": "eligibility_check", "condition": None, "emit_event": "aid.application_received"}
                    ],
                },
                "eligibility_check": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "aid_calculation", "condition": "application_data.eligible == true", "emit_event": "aid.eligible"},
                        {"to": "aid_denied", "condition": "application_data.eligible == false", "emit_event": "aid.ineligible"},
                    ],
                },
                "aid_calculation": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "pending_disbursement", "condition": None, "emit_event": "aid.calculated"}
                    ],
                },
                "pending_disbursement": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "disbursed", "condition": None, "emit_event": "aid.disbursed"}
                    ],
                },
                "disbursed": {"type": "terminal", "transitions": []},
                "aid_denied": {"type": "terminal", "transitions": []},
            },
        },
    },
    {
        "name": "student_course_registration",
        "slug": "course-registration",
        "description": "Academic course registration with prerequisite validation, enrollment capacity checks, and waitlist management.",
        "category": "higher-education",
        "compliance_tags": ["FERPA"],
        "definition": {
            "name": "student_course_registration",
            "initial_state": "registration_request",
            "states": {
                "registration_request": {
                    "type": "initial",
                    "transitions": [
                        {"to": "prerequisite_check", "condition": None, "emit_event": "registration.requested"}
                    ],
                },
                "prerequisite_check": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "capacity_check", "condition": "application_data.prerequisites_met == true", "emit_event": "prerequisites.cleared"},
                        {"to": "registration_denied", "condition": "application_data.prerequisites_met == false", "emit_event": "prerequisites.failed"},
                    ],
                },
                "capacity_check": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "enrolled", "condition": "application_data.seats_available == true", "emit_event": "enrollment.confirmed"},
                        {"to": "waitlisted", "condition": "application_data.seats_available == false", "emit_event": "enrollment.waitlisted"},
                    ],
                },
                "waitlisted": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "enrolled", "condition": None, "emit_event": "enrollment.confirmed_from_waitlist"}
                    ],
                },
                "enrolled": {"type": "terminal", "transitions": []},
                "registration_denied": {"type": "terminal", "transitions": []},
            },
        },
    },
    {
        "name": "faculty_hiring",
        "slug": "faculty-hiring",
        "description": "Faculty recruitment pipeline with application screening, departmental interviews, and onboarding.",
        "category": "hr",
        "compliance_tags": ["GDPR"],
        "definition": {
            "name": "faculty_hiring",
            "initial_state": "application_submitted",
            "states": {
                "application_submitted": {
                    "type": "initial",
                    "transitions": [
                        {"to": "initial_screening", "condition": None, "emit_event": "hiring.application_submitted"}
                    ],
                },
                "initial_screening": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "department_interview", "condition": "application_data.screening_passed == true", "emit_event": "hiring.screening_passed"},
                        {"to": "application_rejected", "condition": "application_data.screening_passed == false", "emit_event": "hiring.rejected"},
                    ],
                },
                "department_interview": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "offer_extended", "condition": "application_data.interview_score >= 80", "emit_event": "hiring.offer_extended"},
                        {"to": "application_rejected", "condition": "application_data.interview_score < 80", "emit_event": "hiring.rejected"},
                    ],
                },
                "offer_extended": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "onboarding", "condition": "application_data.offer_accepted == true", "emit_event": "hiring.offer_accepted"},
                        {"to": "offer_declined", "condition": "application_data.offer_accepted == false", "emit_event": "hiring.offer_declined"},
                    ],
                },
                "onboarding": {"type": "terminal", "transitions": []},
                "offer_declined": {"type": "terminal", "transitions": []},
                "application_rejected": {"type": "terminal", "transitions": []},
            },
        },
    },
    {
        "name": "edtech_user_onboarding",
        "slug": "edtech-onboarding",
        "description": "EdTech platform user onboarding with email verification, profile completion, and subscription activation.",
        "category": "edtech",
        "compliance_tags": ["GDPR", "DPDP"],
        "definition": {
            "name": "edtech_user_onboarding",
            "initial_state": "signup_initiated",
            "states": {
                "signup_initiated": {
                    "type": "initial",
                    "transitions": [
                        {"to": "email_verification", "condition": None, "emit_event": "onboarding.signup_initiated"}
                    ],
                },
                "email_verification": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "profile_setup", "condition": "application_data.email_verified == true", "emit_event": "onboarding.email_verified"},
                    ],
                },
                "profile_setup": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "subscription_selection", "condition": "application_data.profile_complete == true", "emit_event": "onboarding.profile_complete"},
                    ],
                },
                "subscription_selection": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "onboarded", "condition": None, "emit_event": "onboarding.subscription_activated"}
                    ],
                },
                "onboarded": {"type": "terminal", "transitions": []},
            },
        },
    },
]


def seed():
    init_db()
    db = SessionLocal()
    try:
        for t in TEMPLATES:
            existing = db.query(WorkflowTemplate).filter(WorkflowTemplate.slug == t["slug"]).first()
            if not existing:
                template = WorkflowTemplate(**t)
                db.add(template)
                print(f"  + Created template: {t['name']}")
            else:
                print(f"  ~ Template already exists: {t['name']}")
        db.commit()
        print("Templates seeded successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
