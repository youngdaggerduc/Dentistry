# Enamel — Product Recommendations

**What it is:** A clinical workspace for dental students in training programs. Students manage their own patient panel, track treatment progress, log clinical procedures toward competency requirements, and stay on top of scheduling and follow-ups.

**What it is not:** A faculty management tool. Remove admin roles, approval queues, and student-oversight features — those belong in a separate faculty console if needed later.

---

## Cut These

| Item | Why |
|---|---|
| Admin / faculty view entirely | Wrong user. Student-only. |
| Role toggle on login screen | Unnecessary once single-role. |
| Approval queue | Faculty workflow, not student. |
| Student clinicians table | Faculty oversight, not self-tracking. |
| `StudentClinician` DB model | Same. |
| `Approval` DB model | Same. |
| `scheduleData` hardcoded to today's 4 slots | Replace with real appointment records. |

---

## Keep & Enhance

| Item | Enhancement |
|---|---|
| 3D tooth chart | Add per-tooth notes (not just flag — "caries", "fracture", "crown needed", "restored"). Show severity. |
| Patient cards | Show treatment plan status, last visit date, overdue indicator. |
| Competency bars | Link bars to real procedure log — auto-calculate from logged cases, not hardcoded `14/20`. |
| Prospect list | Add stage progression (New lead → Contacted → Appointment booked → Converted). |
| Theme switcher | Keep. |

---

## Add These

### 1. Clinical Notes (SOAP) — _highest priority_
Per-visit structured notes tied to a patient + appointment.

- **S** — Subjective (patient complaint)
- **O** — Objective (exam findings, vitals)
- **A** — Assessment (diagnosis)
- **P** — Plan (treatment decided)

Student writes notes during or after each visit. Notes are searchable and form the patient's clinical record. A patient's full note history is their timeline.

**New model:** `Visit { id, patient_id, date, procedure, duration_mins, faculty_supervisor, status: completed|no_show|cancelled }` + `ClinicalNote { id, visit_id, subjective, objective, assessment, plan, created_at }`

---

### 2. Treatment Plans
Each patient can have one active treatment plan with ordered steps.

Example: patient with decay on #14:
1. ✅ Initial exam & charting
2. ✅ Radiograph
3. 🔄 Composite restoration #14 ← _in progress_
4. ⬜ Polishing & review

Students mark steps complete. The plan drives the "next appointment" recommendation.

**New model:** `TreatmentPlan { id, patient_id, title, status: active|completed|on_hold }` + `TreatmentStep { id, plan_id, order, description, status: pending|in_progress|completed, completed_at }`

---

### 3. Appointment Scheduling
Currently appointments are read-only cards. Students need to create, reschedule, and cancel.

- Book a new appointment (patient → date/time → room → procedure)
- View day, week, month calendar
- Mark completed / no-show / cancelled
- Overdue appointments (scheduled in past, no status update) surface as alerts

**New model:** `Appointment { id, patient_id, datetime, room, procedure, status: scheduled|confirmed|completed|no_show|cancelled, notes }`

Replace the current hardcoded `ScheduleEntry` table.

---

### 4. Reminders & Follow-up Alerts
Proactive nudges so patients don't fall through the cracks.

- Recall due: patient hasn't been seen in 6 months → reminder
- Follow-up: "Check healing on #14 extraction" in 7 days
- Prospect outreach: lead hasn't been contacted in 2 weeks
- Upcoming appointment: 24h before
- Overdue treatment step: plan step was due last week

Surface these as a **Notifications panel** (bell icon) and on the Overview page as an "Action required" strip.

**New model:** `Reminder { id, patient_id, appointment_id, due_date, message, type: recall|followup|outreach|custom, dismissed_at }`

---

### 5. Patient Detail Page / Timeline
Clicking a patient currently opens only the tooth chart. It should open a full patient page:

- **Header**: name, age, status, faculty, contact info
- **Medical history tab**: allergies, medications, conditions, chief complaint (intake form)
- **Timeline tab**: every visit in chronological order with SOAP notes, expandable
- **Treatment plan tab**: current plan with step checklist
- **Tooth chart tab**: the existing 3D viewer (keep exactly as-is)
- **Appointments tab**: all past + upcoming appointments

**New model fields on `Patient`**: `phone`, `email`, `dob`, `allergies`, `medications`, `medical_conditions`, `chief_complaint`, `referred_by`

---

### 6. Procedure / Competency Log
Instead of static `14/20` bars, every completed visit auto-logs against the student's competency requirements.

- Student logs a visit → selects procedure category (Restorative, Periodontics, Endodontics, Prosthodontics, Oral Surgery, Ortho)
- Dashboard bars calculate live from the log
- Detailed log view: sortable table of every logged case with date, patient, procedure, faculty
- Export to PDF for competency portfolio submissions

**New model:** `CompetencyEntry { id, visit_id, category, procedure_name, patient_name, date, faculty }` — derived from visits but kept as an explicit record for export.

---

### 7. Patient Intake Form
Currently `AddPatientModal` only collects name, age, faculty, status, appointment, and procedure. Expand to:

- Contact info (phone, email)
- Date of birth
- Medical history (allergies, current medications, conditions: diabetes, hypertension, etc.)
- Chief complaint (why they're here)
- Referral source (links to the prospect pipeline)

This replaces the basic add-patient form with a proper intake flow.

---

### 8. Search & Filter
The patient list grows. Students need to find patients fast.

- Search by name
- Filter by status (Active / Recall / New)
- Filter by faculty supervisor
- Filter by procedure type
- Sort by: next appointment, last seen, name, flagged teeth count

---

### 9. Dashboard Overhaul (Overview section)
Replace static overview with live, action-oriented metrics:

| Metric | Source |
|---|---|
| Patients needing follow-up | Recalls overdue |
| Appointments this week | From `Appointment` table |
| Procedures logged this month | From `CompetencyEntry` |
| Requirements progress | Live from log, not hardcoded |
| Uncontacted leads | Prospects in "New lead" for 14+ days |
| Urgent alerts | Overdue appointments, unsigned notes |

Add an **"Action required"** section at the top — a prioritized list of things the student needs to do today (call a recall patient, update notes from yesterday's visit, follow up on a lead).

---

### 10. Real Auth (JWT)
Placeholder login currently. For real use:

- Username/password with bcrypt hashing
- JWT stored in httpOnly cookie (not localStorage)
- Student's own patients only (scoped queries by `student_id`)
- `/api/me` endpoint for profile

Multiple students → each student sees only their own patients. This is the key change that makes the per-student data scoping work.

---

## Revised Data Model

```
Student          → the logged-in user
Patient          → belongs to a student
  FlaggedTooth   → per patient, per tooth
  TreatmentPlan  → one active plan per patient
    TreatmentStep
  Appointment    → scheduled visits
    ClinicalNote → SOAP notes per appointment
  Reminder       → follow-up alerts
  CompetencyEntry→ logged procedures for requirements
Prospect         → potential future patients
```

---

## Navigation Structure (Revised)

Remove the dual student/admin nav. One nav for the student:

| # | Section | What's there |
|---|---|---|
| 01 | Overview | Action required strip, live stats, today's schedule |
| 02 | Patients | Full patient list with search/filter |
| 03 | Calendar | Week/month appointment calendar |
| 04 | Prospects | Lead pipeline with stage tracker |
| 05 | Competency | Procedure log + requirement bars |
| 06 | Reminders | Upcoming + overdue alerts |

---

## Phased Build Plan

### Phase 1 — Foundation (now → working app)
- [x] Backend models + API endpoints
- [x] Frontend wired to API
- [x] Patient list, tooth chart, prospects, schedule
- [ ] Remove admin view / role toggle
- [ ] Patient intake form (expanded fields)
- [ ] Search + filter on patient list

### Phase 2 — Clinical Core
- [ ] `Appointment` model replacing `ScheduleEntry`
- [ ] Create/edit/cancel appointments UI
- [ ] Calendar view (week layout)
- [ ] `Visit` + `ClinicalNote` models + SOAP note editor
- [ ] Patient timeline tab (visit history)

### Phase 3 — Intelligence Layer
- [ ] `TreatmentPlan` + `TreatmentStep` with checklist UI
- [ ] `Reminder` model + notification panel
- [ ] Recall detection (no appointment in 6 months → auto-reminder)
- [ ] Prospect stage progression (drag or click through pipeline)
- [ ] Overhaul overview stats to be 100% live

### Phase 4 — Competency & Auth
- [ ] `CompetencyEntry` auto-logged on visit completion
- [ ] Detailed competency log table + live bars
- [ ] PDF export of competency record
- [ ] Real JWT auth (`python-jose`, `passlib`)
- [ ] Per-student data scoping

---

## What This Becomes

A tool a dental student opens every clinic day to:
1. See what's on the schedule and any alerts needing attention
2. Pull up a patient, review their plan, open the tooth chart
3. Write visit notes before they leave the chair
4. Book the next appointment and set a recall reminder
5. Track where they stand on competency requirements at a glance

Scope: single-user, offline-capable eventually, mobile-responsive for tablet use chairside.
