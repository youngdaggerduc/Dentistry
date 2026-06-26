# Enamel — Product Recommendations

**What it is:** A clinical workspace for dental students in training programs. Students manage their own patient panel, track treatment progress, log clinical procedures toward competency requirements, and stay on top of scheduling and follow-ups.

**What it is not:** A faculty management tool. No admin roles, approval queues, or student-oversight features — those belong in a separate faculty console if needed later.

---

## ✅ Built (Phases 1–4)

All four phases from the original plan are complete.

| Phase | What shipped |
|---|---|
| **1 — Foundation** | Student-only JWT auth, expanded patient intake (Basic info + Medical history tabs), search + status filter on patient grid, removed admin/role toggle entirely |
| **2 — Clinical Core** | `Appointment` model + CRUD, week/upcoming calendar view, `Visit` + `ClinicalNote` models, SOAP note editor per visit, `PatientDetail` panel with 6 tabs (Overview, Tooth Chart, Visits, Treatment Plan, Appointments, Intake) |
| **3 — Intelligence Layer** | `TreatmentPlan` + `TreatmentStep` checklist UI, `Reminder` model + notification bell + panel, prospect Kanban with stage-advance buttons, live overview stats (all from API) |
| **4 — Competency & Auth** | `CompetencyEntry` auto-logged on visit save, competency progress bars + procedure log table, full JWT login flow, per-student data scoping on every query |

---

## Phase 5 — Polish & Export

### 1. PDF Competency Portfolio
Students need to submit procedure logs to their program director.

- Generate a formatted PDF of all `CompetencyEntry` records grouped by category
- Show requirement vs. completed per category, with dates and faculty names
- "Export portfolio" button on the Competency page
- Use `pdfmake` or `jsPDF` on the frontend (no server needed for this)

---

### 2. Per-Tooth Clinical Notes
The tooth chart currently flags teeth as "bad" with no detail. Real clinical charting needs more.

- Click a flagged tooth → open a small popover to set: **condition** (caries, fracture, crown, restoration, missing, root canal) + **severity** (mild, moderate, severe) + free-text **note**
- Show condition icons on the 3D chart (colour-coded by condition type, not just red/white)
- List view shows tooth number, condition, severity, note
- These feed into the SOAP note O (Objective) section automatically

**Model change:** `FlaggedTooth` already has `note` and `severity` fields — just need the UI.

---

### 3. Recall Detection & Smart Reminders
Auto-generate reminders instead of requiring manual creation.

- Nightly job (or on-load check): if a patient's last visit was 6+ months ago and no future appointment exists → create a recall reminder
- If a prospect has been in "New lead" for 14+ days → create outreach reminder
- If a treatment plan step is marked `in_progress` for 30+ days → create a follow-up reminder
- Surface count on the Overview "Action required" strip

**Backend:** Add a `POST /api/reminders/generate` endpoint that runs the detection logic. Call it on login.

---

### 4. Mobile / Tablet Layout
Students use tablets chairside. The current layout is desktop-only.

- Responsive breakpoints: sidebar collapses to bottom nav bar on < 768px
- PatientDetail becomes a full-screen sheet (swipe down to close)
- Tooth chart touch controls already exist — verify on actual tablet
- The SOAP note editor should auto-expand and push the keyboard up correctly

---

### 5. Offline / Chairside Mode
Clinic Wi-Fi is unreliable. A student shouldn't lose a SOAP note because the router dropped.

- Service worker caches the app shell and last-loaded patient data
- SOAP notes written offline are queued in IndexedDB and synced when back online
- Visual indicator when offline ("working offline — notes will sync")
- Read-only tooth chart and patient overview work fully offline

---

### 6. Global Search
As the patient list grows, students need to find records without scrolling.

- `Cmd/Ctrl + K` opens a command palette
- Searches patient names, procedures, visit notes (fuzzy match)
- Results show patient name + last procedure + next appointment
- Selecting a result opens PatientDetail directly

**Backend:** `GET /api/search?q=` — searches across patients, visits, notes.

---

### 7. Faculty Sign-Off Workflow (Optional / v2)
If the program requires faculty countersignature on notes:

- Add a `signed_by` + `signed_at` field to `ClinicalNote`
- Student marks a note "ready for review"
- Faculty get a separate read-only view (separate login, separate app) to countersign
- Signed notes are locked from editing
- This is explicitly out of scope for the student app — would be a separate faculty portal

---

### 8. Audit Log / Change History
For clinical records compliance:

- Every edit to a `ClinicalNote`, `TreatmentStep`, or `FlaggedTooth` writes a timestamped row to an `AuditLog` table
- Notes cannot be deleted — only superseded (soft delete with `deleted_at`)
- Visible to the student as "last edited" metadata on notes

---

### 9. Appointment Reminders (Patient-Facing)
Nice to have once the system is more mature:

- Student clicks "Send reminder" on an upcoming appointment
- Generates a pre-filled SMS or email text the student can copy-paste or send via their phone
- Does not require Twilio or SendGrid integration — just generates the text
- Later: actual SMS via Twilio with a verified sender number from the school

---

### 10. Analytics / Progress Dashboard
End-of-term view for the student to reflect on their clinical progress:

- Cases per month chart (bar)
- Competency requirements timeline — when each category hit 100%
- Most common procedures, most common conditions charted
- "Time to close" — average days from first visit to treatment plan complete
- Export as a summary PDF for portfolio or advisor meeting

---

## Revised Navigation (Post Phase 4)

| # | Section | Current state |
|---|---|---|
| 01 | Overview | ✅ Live stats, action required strip, today's schedule |
| 02 | Patients | ✅ Search, status filter, patient cards → PatientDetail |
| 03 | Calendar | ✅ Week view + upcoming list |
| 04 | Prospects | ✅ Kanban pipeline with stage advance |
| 05 | Competency | ✅ Live bars + procedure log table |
| 06 | Reminders | ✅ Dismiss-able list + bell icon panel |

**Candidates for Phase 5 nav additions:**

| # | Section | What goes there |
|---|---|---|
| 07 | Search | Global `Cmd+K` command palette (inline, not a page) |
| 07 | Analytics | End-of-term progress charts |

---

## Data Model (Current)

```
User (Student)
  id, name, email, hashed_password, year

Patient                        → belongs to User (student_id FK)
  id, name, age, phone, email, dob
  faculty, status, procedure
  allergies, medications, medical_conditions
  chief_complaint, referred_by

  FlaggedTooth                 → per patient
    id, tooth_id, note, severity

  Appointment                  → scheduled visits
    id, datetime_str, room, procedure, faculty, status, notes

  Visit                        → completed sessions
    id, date_str, procedure, procedure_category
    duration_mins, faculty_supervisor, status

    ClinicalNote               → SOAP note per visit (1:1)
      subjective, objective, assessment, plan

  TreatmentPlan
    id, title, status
    TreatmentStep[]            → ordered checklist items

  Reminder
    id, due_date_str, message, type, dismissed

  CompetencyEntry              → auto-created from Visit
    id, category, procedure_name, patient_name, date_str, faculty

Prospect                       → belongs to User (student_id FK)
  id, name, interest, source, stage
```

---

## What This Becomes (Long Term)

A tool a dental student opens every clinic day to:
1. See what's on the schedule and any alerts needing attention
2. Pull up a patient, review their treatment plan, open the tooth chart
3. Write SOAP notes before they leave the chair
4. Book the next appointment and set a recall reminder
5. Track where they stand on competency requirements at a glance
6. Export their procedure log at the end of the semester

**Longer term:** white-label for dental schools, multi-student cohort dashboards for program directors, integration with school scheduling systems (PMS like Dentrix or Eaglesoft).
