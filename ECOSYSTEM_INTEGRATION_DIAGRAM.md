# Orquestra × Redrob — Ecosystem Integration Diagram Reference

> This document describes every integration surface, data flow, participant role, and compound flywheel effect between Orquestra Campus Runtime and the Redrob ecosystem. Use it to generate an ecosystem integration diagram in any diagramming tool (Eraser.io, draw.io, Figma, Lucidchart, Miro, etc.).

---

## Part 1 — Ecosystem Participants

Three distinct actors exist in the integrated ecosystem. The first two pre-exist in Redrob; the third is added by Orquestra.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     REDROB ECOSYSTEM                                │
│                                                                     │
│  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐  │
│  │   STUDENT    │        │  RECRUITER   │        │ INSTITUTION  │  │
│  │  (Candidate) │        │  (Company)   │        │    (TPO)     │  │
│  │              │        │              │        │              │  │
│  │ Pre-existing │        │ Pre-existing │        │  NEW via     │  │
│  │ participant  │        │ participant  │        │ Orquestra    │  │
│  └──────────────┘        └──────────────┘        └──────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

| Participant | Pre-Redrob | What they do in ecosystem | What Orquestra adds |
|-------------|-----------|--------------------------|---------------------|
| **Student** | Yes | Builds profile, takes assessments, applies to jobs | Becomes a workflow applicant — eligibility evaluated automatically against their own Redrob data |
| **Recruiter** | Yes | Posts JDs, reviews candidates, makes offers | Receives structured, pre-verified shortlists from institutional workflows instead of raw resumes |
| **Institution (TPO)** | No | Managed placement cycle outside Redrob on spreadsheets | Gets a structured AI-generated workflow runtime operating inside the Redrob data layer |

---

## Part 2 — The Four Integration Surfaces

Each surface has a direction, a Redrob capability, an Orquestra component, and a named data payload.

---

### Surface 1 — Candidate Profile + Employability Score → Condition Evaluator

**Direction:** Redrob → Orquestra  
**Type:** Real-time data enrichment at every eligibility gate

```
┌────────────────────────────────┐          ┌──────────────────────────────────────┐
│  REDROB                        │          │  ORQUESTRA                           │
│                                │          │                                      │
│  Candidate Profile             │          │  Workflow Condition Gate             │
│  ─────────────────             │  live    │  ────────────────────────            │
│  • employability_score: 72     │ ──────►  │  TPO-defined condition:              │
│  • cgpa: 8.1                   │  pull    │  "applicant.employability_score >= 65 │
│  • backlogs: 0                 │          │   AND applicant.cgpa >= 7.5          │
│  • skills: [Python, SQL]       │          │   AND applicant.backlogs == 0"       │
│  • placement_history: [...]    │          │                                      │
│                                │          │  Condition Parser evaluates:         │
│  Employability Score           │          │  72 >= 65 ✓  8.1 >= 7.5 ✓  0==0 ✓  │
│  ─────────────────             │          │  → SHORTLISTED                       │
│  Built on 6 years of Indian    │          │                                      │
│  professional data             │          │  or                                  │
│  (primary eligibility signal)  │          │  68 >= 65 ✓  7.1 >= 7.5 ✗           │
│                                │          │  → NOT SHORTLISTED                   │
└────────────────────────────────┘          └──────────────────────────────────────┘
```

**Data payload:**
```json
{
  "applicant_data": {
    "redrob_candidate_id": "rb_cand_uuid",
    "employability_score": 72,
    "cgpa": 8.1,
    "backlogs": 0,
    "skills": ["Python", "SQL", "Data Analysis"],
    "tenth_percent": 91.5,
    "twelfth_percent": 88.0,
    "placement_history": []
  }
}
```

**Orquestra component:** `apps/api/app/core/condition_parser.py` — flat-field safe evaluator (no `eval()`), operators: `==`, `!=`, `>`, `<`, `>=`, `<=`

**Without Redrob:** TPO manually enters each candidate's score → 3 days for 1,200 applicants  
**With Redrob:** Condition evaluated in real time → shortlist generated in 30 minutes

---

### Surface 2 — Assessment Platform → Workflow Stage Trigger

**Direction:** Bidirectional  
**Type:** Automated assessment dispatch + completion webhook

```
┌────────────────────────────────┐          ┌──────────────────────────────────────┐
│  REDROB                        │          │  ORQUESTRA                           │
│                                │          │                                      │
│  Assessment Platform           │          │  Workflow Engine                     │
│  3,500+ pre-made assessments   │          │                                      │
│  ─────────────────────────     │          │  ... → shortlisted → assessment_stage│
│  • Aptitude tests              │◄── (1) ──│      (candidate enters this state)   │
│  • Coding assessments          │  dispatch│                                      │
│  • Domain skill tests          │  trigger │  Assessment dispatched automatically  │
│  • Communication tests         │          │  to candidate via Redrob             │
│                                │──► (2) ──►                                     │
│  candidate completes           │ completion│  Event received:                    │
│  assessment                    │  webhook │  assessment.completed                │
│                                │          │  { candidate_id, score: 81,          │
│  assessment_score: 81/100      │          │    passed: true }                    │
│  passed: true                  │          │                                      │
│                                │          │  Workflow transitions:               │
│                                │          │  assessment_stage → interview_stage  │
│                                │          │  (condition: "assessment_score >= 70")│
└────────────────────────────────┘          └──────────────────────────────────────┘
```

**Flow (1) — Dispatch:** Orquestra workflow reaches `assessment_stage` state → calls Redrob Assessment API → dispatches assessment to candidate  
**Flow (2) — Completion:** Candidate submits assessment on Redrob → Redrob sends webhook to Orquestra → Orquestra WorkflowEngine evaluates `assessment_score` condition → transitions to next state

**Data payloads:**

Dispatch request (Orquestra → Redrob):
```json
{
  "candidate_id": "rb_cand_uuid",
  "assessment_id": "rb_assess_uuid",
  "workflow_application_id": "orq_app_uuid",
  "callback_url": "https://orquestra.inst.edu/api/v1/webhooks/assessment-complete"
}
```

Completion webhook (Redrob → Orquestra):
```json
{
  "event": "assessment.completed",
  "candidate_id": "rb_cand_uuid",
  "workflow_application_id": "orq_app_uuid",
  "assessment_score": 81,
  "max_score": 100,
  "passed": true,
  "completed_at": "2026-07-01T14:32:00Z"
}
```

---

### Surface 3 — Orquestra Event Engine → Redrob ATS

**Direction:** Orquestra → Redrob  
**Type:** Real-time bilateral status synchronisation

```
┌────────────────────────────────┐          ┌──────────────────────────────────────┐
│  REDROB                        │          │  ORQUESTRA                           │
│                                │          │                                      │
│  ATS (Applicant Tracking)      │          │  Event Engine (Triple-Write)         │
│  ──────────────────────        │          │  ─────────────────────────           │
│  Recruiter sees:               │          │  WorkflowEngine state transition     │
│                                │          │  → EventEngine.emit()                │
│  Alice Chen                    │          │                                      │
│  Status: Interview Scheduled   │◄── sync ─│  Write 1: PostgreSQL events table    │
│  Stage: Round 2 Technical      │          │  Write 2: Redis Stream               │
│  Updated: 2 min ago            │          │  Write 3: WebSocket + ATS push       │
│                                │          │                                      │
│  Bob Kumar                     │          │  Event payload:                      │
│  Status: Offer Extended        │          │  {                                   │
│  CTC: 12 LPA                   │          │    type: "application.state_changed",│
│  Updated: just now             │          │    candidate_id: "rb_cand_uuid",     │
│                                │          │    from_state: "round_1",            │
│  No manual updates required.   │          │    to_state: "round_2_technical",    │
│  Recruiter always sees live    │          │    workflow_id: "campus_placement_wf",│
│  placement status from college │          │    institution_id: "inst_uuid",      │
│                                │          │    offer_details: { ctc: 1200000 }   │
│                                │          │  }                                   │
└────────────────────────────────┘          └──────────────────────────────────────┘
```

**State events synced to Redrob ATS:**

| Orquestra State Change | ATS Status Update |
|----------------------|-------------------|
| `shortlisted` | Candidate marked Shortlisted for company |
| `assessment_dispatched` | Assessment Sent |
| `interview_scheduled` | Interview Scheduled — Round 1 |
| `round_2_technical` | Technical Round Scheduled |
| `offer_extended` | Offer Extended — CTC details attached |
| `offer_accepted` | Placement Confirmed |
| `rejected` | Not Selected |

---

### Surface 4 — Redrob Job Search API → AI Structural Compiler

**Direction:** Redrob → Orquestra  
**Type:** JD ingestion + automatic workflow generation

```
┌────────────────────────────────┐          ┌──────────────────────────────────────┐
│  REDROB                        │          │  ORQUESTRA                           │
│                                │          │                                      │
│  Job Search + Company Layer    │          │  AI Blueprint Generator (Mode A)     │
│  ──────────────────────────    │          │  ─────────────────────────────────   │
│  Job Description:              │ ──────►  │  JD Parser extracts:                │
│                                │  import  │  eligibility_criteria:              │
│  "Software Engineer – Google   │          │  { cgpa: ">= 7.5",                  │
│   Minimum 7.5 CGPA             │          │    backlogs: "== 0",                │
│   No active backlogs           │          │    branch: "CSE|IT|ECE",            │
│   Branches: CSE / IT / ECE     │          │    employability_score: ">= 70" }   │
│   Package: 18 LPA              │          │                                     │
│   Process: Online test →       │          │  workflow_stages:                   │
│   Technical Round →            │          │  [ "registration", "eligibility_    │
│   HR Round → Offer"            │          │    check", "online_test",           │
│                                │          │    "technical_round", "hr_round",   │
│  790M+ profile database        │          │    "offer" ]                        │
│  Company intelligence layer    │          │                                     │
│                                │          │  → Claude generates complete        │
│                                │          │    workflow blueprint automatically │
│                                │          │                                     │
│                                │          │  TPO reviews + deploys in 1 click  │
└────────────────────────────────┘          └──────────────────────────────────────┘
```

**AI generation flow from JD:**
1. Redrob Job API returns structured JD object
2. Orquestra's AI prompt: *"Generate a campus placement workflow for this JD: [JD text]. Extract eligibility criteria as workflow conditions. Extract hiring process stages as workflow states."*
3. Claude returns `BlueprintProposal` with conditions pre-populated from JD
4. TPO reviews the AI-generated workflow, adjusts if needed, deploys in one click
5. Every subsequent application evaluated against conditions extracted from the actual JD

---

## Part 3 — Complete Data Flow Map

```
                    ┌──────────────────────────────────────────────────────────┐
                    │                  REDROB PLATFORM                         │
                    │                                                          │
                    │  ┌──────────────┐  ┌────────────────┐  ┌─────────────┐ │
                    │  │  Candidate   │  │  Assessment    │  │  Job Search │ │
                    │  │  Profiles +  │  │  Platform      │  │  + Company  │ │
                    │  │  Employability│  │  3,500+ tests  │  │  Intel      │ │
                    │  │  Scores      │  │                │  │             │ │
                    │  └──────┬───────┘  └───────┬────────┘  └──────┬──────┘ │
                    │         │                   │                  │        │
                    │         │ [S1]              │ [S2b]            │ [S4]   │
                    │         │ Profile data      │ completion       │ JD     │
                    │         │ pull              │ webhook          │ import │
                    │         ▼                   ▼                  ▼        │
                    │  ┌──────────────────────────────────────────────────┐   │
                    │  │                  ORQUESTRA                        │   │
                    │  │                                                   │   │
                    │  │  ┌────────────────┐    ┌─────────────────────┐   │   │
                    │  │  │ AI Blueprint   │    │ Workflow Engine      │   │   │
                    │  │  │ Generator      │    │ (Condition Parser)   │   │   │
                    │  │  │ (Mode A)       │    │                     │   │   │
                    │  │  │                │    │ evaluates S1 data   │   │   │
                    │  │  │ JD → workflow  │    │ at every gate       │   │   │
                    │  │  │ blueprint      │    │                     │   │   │
                    │  │  └────────────────┘    └──────────┬──────────┘   │   │
                    │  │                                    │              │   │
                    │  │  ┌────────────────────────────────▼──────────┐   │   │
                    │  │  │ Event Engine (Triple-Write)                │   │   │
                    │  │  │ PostgreSQL + Redis + WebSocket             │   │   │
                    │  │  └───────────────────────┬───────────────────┘   │   │
                    │  │                           │ [S3]                  │   │
                    │  └───────────────────────────┼───────────────────────┘   │
                    │                              │ state change events        │
                    │  ┌───────────────────────────▼──────────────────────┐    │
                    │  │  ATS                                              │    │
                    │  │  Candidate status synced live                     │    │
                    │  └──────────────────────────────────────────────────┘    │
                    │                                                          │
                    │  ┌──────────────┐  [S2a] assessment dispatch            │
                    │  │  Assessment  │◄─────── from Orquestra workflow stage  │
                    │  │  Platform    │                                         │
                    │  └──────────────┘                                        │
                    └──────────────────────────────────────────────────────────┘
```

---

## Part 4 — Integration Surface Summary Table

| Surface | ID | From | To | Trigger | Data Crossing |
|---------|-----|------|-----|---------|--------------|
| Candidate data enrichment | S1 | Redrob Profiles | Orquestra Condition Parser | Application submitted to workflow | `{ employability_score, cgpa, backlogs, skills }` |
| Assessment dispatch | S2a | Orquestra Workflow Engine | Redrob Assessment Platform | Workflow reaches assessment state | `{ candidate_id, assessment_id, callback_url }` |
| Assessment completion | S2b | Redrob Assessment Platform | Orquestra Workflow Engine | Candidate completes assessment | `{ assessment_score, passed, completed_at }` |
| Status sync | S3 | Orquestra Event Engine | Redrob ATS | Every workflow state transition | `{ candidate_id, from_state, to_state, timestamp }` |
| JD ingestion | S4 | Redrob Job Search API | Orquestra AI Blueprint Generator | TPO imports a company JD | `{ jd_text, company, role, package, eligibility_criteria }` |

---

## Part 5 — The Three-Participant Flywheel

This is the compound value loop that makes Orquestra strategically important to Redrob's roadmap.

```
                        ┌─────────────────────────┐
                        │    MORE COLLEGES         │
                        │  run placement workflows │
                        │    on Orquestra          │
                        └────────────┬────────────┘
                                     │
                    generates        │
                                     ▼
                        ┌─────────────────────────┐
                        │  STRUCTURED PLACEMENT   │
                        │  DATA flows back into   │
                        │  Redrob                  │
                        │                          │
                        │  • Which company visited │
                        │  • Which students were   │
                        │    shortlisted vs actual │
                        │    differentiator        │
                        │  • Assessment score that │
                        │    predicted job fit     │
                        │  • Time per stage        │
                        └────────────┬────────────┘
                                     │
                    enriches         │
                                     ▼
                        ┌─────────────────────────┐
                        │  REDROB'S MATCHING &    │
                        │  RANKING MODELS         │
                        │  get smarter            │
                        │                          │
                        │  High-quality signal:    │
                        │  institutional decisions │
                        │  vs student self-report  │
                        └────────────┬────────────┘
                                     │
                    attracts         │
                                     ▼
                        ┌─────────────────────────┐
                        │  MORE RECRUITERS &      │
                        │  STUDENTS join Redrob   │
                        │  because match quality  │
                        │  improves                │
                        └────────────┬────────────┘
                                     │
                    enables          │
                                     ▼
                        ┌─────────────────────────┐
                        │    MORE COLLEGES         │◄─────── (loop repeats)
                        └─────────────────────────┘
```

**Why this is defensible:**
- LinkedIn and Naukri own student ↔ recruiter
- No platform has ever owned the institutional layer
- Orquestra's placement workflow data is generated automatically as a byproduct of TPOs doing their jobs — not as a separate data collection exercise
- Redrob's roadmap targets deepening contextual intelligence tailored to Indian users — this data is exactly that

---

## Part 6 — Before vs After Diagram

For visual contrast in the diagram, show two parallel tracks.

**Without Orquestra (current state):**
```
Redrob collects: student profiles, assessments, employability scores
                          │
                          ▼
       Redrob shows TPO a list of students
                          │
                          ▼
       TPO downloads to Excel
       TPO manually checks CGPA, backlogs, scores
       TPO emails students, tracks responses
       TPO maintains interview schedules in spreadsheet
       TPO sends offer letters via email
                          │
                          ▼
       3 days for 1,200 applicants per company visit
       Data never returns to Redrob (lost on spreadsheet)
```

**With Orquestra (integrated state):**
```
Redrob Job API → AI Structural Compiler → Workflow blueprint generated from JD
                                                        │
Redrob Profile API → Condition Parser ←─────────────────┘
  (live employability score, CGPA, backlogs)
        │
        ▼
Shortlist generated automatically when candidate data satisfies conditions
        │
        ▼
Redrob Assessment Platform → dispatched automatically at assessment stage
        │
        ▼
Assessment completion → workflow transitions automatically
        │
        ▼
Orquestra Event Engine → Redrob ATS (candidate status synced live)
        │
        ▼
Placement confirmed → structured data returns to Redrob as training signal
        │
        ▼
30 minutes for 1,200 applicants. Full audit trail. Zero manual entry.
```

---

## Part 7 — Diagram Layout Recommendation

For a clean ecosystem integration diagram, use this three-zone layout:

```
┌──────────────────────────────────────────────────────────────────────┐
│  ZONE 1 (left): REDROB PLATFORM                                      │
│                                                                      │
│  Four capability boxes (vertically stacked):                         │
│  [Candidate Profiles + Employability Score]                          │
│  [Assessment Platform — 3,500+ assessments]                          │
│  [ATS — Applicant Tracking]                                          │
│  [Job Search + Company Intelligence]                                 │
│                                                                      │
│  Three participant icons (bottom):                                   │
│  [Student icon]  [Recruiter icon]  [Institution icon — highlighted]  │
└──────────────────────────────────────────────────────────────────────┘
                │ S1 →          ← S2b      ← S3      │ S4 →
                │               S2a →                 │
┌──────────────────────────────────────────────────────────────────────┐
│  ZONE 2 (centre): INTEGRATION SURFACE (arrows with labels)           │
│                                                                      │
│  Each arrow labelled with:                                           │
│  S1: "Profile + score pull"  (direction: Redrob → Orquestra)        │
│  S2a: "Assessment dispatch"  (direction: Orquestra → Redrob)        │
│  S2b: "Completion webhook"   (direction: Redrob → Orquestra)        │
│  S3: "State change events"   (direction: Orquestra → Redrob)        │
│  S4: "JD ingestion"          (direction: Redrob → Orquestra)        │
└──────────────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────────────┐
│  ZONE 3 (right): ORQUESTRA CAMPUS RUNTIME                            │
│                                                                      │
│  Four component boxes:                                               │
│  [AI Blueprint Generator — receives JD, generates workflow]          │
│  [Workflow Engine + Condition Parser — evaluates Redrob signals]     │
│  [Event Engine — triple-write, feeds ATS]                            │
│  [TPO Dashboard — 30 min shortlist vs 3 days manual]                │
│                                                                      │
│  Workflow state bar (horizontal):                                    │
│  [registered] → [eligibility_check] → [assessment] → [interview]    │
│                → [offer] → [confirmed]                               │
└──────────────────────────────────────────────────────────────────────┘

                 ↓ (flywheel arrow looping back from Zone 3 to Zone 1)

┌──────────────────────────────────────────────────────────────────────┐
│  ZONE 4 (bottom, spanning full width): THE FLYWHEEL                 │
│                                                                      │
│  "Placement workflow data → Redrob matching models → better          │
│   matches → more colleges → more data"                               │
└──────────────────────────────────────────────────────────────────────┘
```

**Recommended colour coding:**
- Redrob brand colour for Zone 1 boxes
- Orquestra dark theme (`#1b1b24` bg, `#3b82f6` accent) for Zone 3 boxes
- Arrow S1 (blue — data in): enrichment signal
- Arrow S2a/S2b (purple — bidirectional): assessment loop
- Arrow S3 (green — sync): ATS events
- Arrow S4 (orange — AI trigger): JD → workflow
- Flywheel arrow: gold / gradient

---

## Part 8 — One-Line Pitch to Anchor the Diagram

> **Redrob connects students and recruiters. Orquestra connects the college.**  
> Every placement workflow running on Orquestra makes Redrob's data richer, its matching smarter, and its ecosystem more defensible — because the institutional layer is the one neither LinkedIn nor Naukri has ever owned.
