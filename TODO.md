# Enamel — Things To Do

## ✅ Completed (Phase 1–4)

### Backend
- [x] `User` model with JWT auth (python-jose, passlib sha256_crypt)
- [x] `Patient` model with full intake fields (phone, email, dob, allergies, medications, medical_conditions, chief_complaint, referred_by)
- [x] `FlaggedTooth` model (patient_id FK, tooth_id, note, severity)
- [x] `Appointment` model (patient_id, datetime_str, room, procedure, faculty, status, notes)
- [x] `Visit` + `ClinicalNote` models (SOAP: subjective, objective, assessment, plan)
- [x] `TreatmentPlan` + `TreatmentStep` models with status tracking
- [x] `Reminder` model (type: recall|followup|outreach|custom, dismissed)
- [x] `CompetencyEntry` model — auto-logged when a visit has procedure_category set
- [x] `Prospect` model (student-scoped, stage progression)
- [x] `POST /api/auth/login` — JWT token + user info
- [x] `GET /api/auth/me`
- [x] Full patient CRUD + tooth flag/unflag endpoints
- [x] Full appointment CRUD + status patch + today/week filters
- [x] Visit CRUD + SOAP note upsert (`PUT /visits/{id}/note`)
- [x] Treatment plan CRUD + step CRUD + step status patch
- [x] Reminder list (undismissed only), create, dismiss, delete
- [x] `GET /api/competency` — live summary bars + entry log
- [x] Prospect CRUD + stage patch
- [x] Seed endpoint with demo user, 6 patients, appointments, visits, SOAP notes, plans, reminders, competency entries, 4 prospects
- [x] Per-student data scoping on all queries (student_id FK)
- [x] `.env.example` documenting DATABASE_URL + JWT_SECRET

### Frontend
- [x] `api.js` — JWT-aware client, all endpoints, 401 → auth:expired event
- [x] `LoginScreen.jsx` — email/password only, no role toggle, demo credentials prefilled
- [x] `Sidebar.jsx` — notification bell with badge, active nav highlight, theme switcher, logout
- [x] `App.jsx` — full JWT auth state, data loading on login, optimistic tooth toggling
- [x] `AddPatientModal.jsx` — Basic info + Medical history tabs, all intake fields
- [x] `StudentView.jsx` — search bar + status filter chips, live stats, today's schedule, calendar table, prospect Kanban, competency bars + log, reminders list
- [x] `PatientDetail.jsx` — 6-tab panel: Overview, Tooth Chart (3D), Visits + SOAP editor, Treatment Plan checklist, Appointments, Intake
- [x] `NotificationPanel.jsx` — reminder overlay from bell icon, dismiss all
- [x] Optimistic UI for tooth toggle with rollback on failure
- [x] Toast notifications for all mutations
- [x] Loading + error states with retry

---

## Up Next

### Quick wins
- [ ] Per-tooth notes + severity in the tooth chart (currently just flagged/unflagged)
- [ ] Overdue indicator on patient cards (no appointment in 6+ months)
- [ ] Sort controls on patient list (by next appt, last seen, flagged count)
- [ ] Filter by faculty supervisor on patient list
- [ ] Mark appointment as completed / no-show from the calendar view
- [ ] Auto-dismiss old reminders (e.g. past-due recalls once appointment is booked)

### Features
- [ ] PDF export of competency record (see recommendations.md Phase 5)
- [ ] Recall detection — auto-create reminder when patient hasn't been seen in 6 months
- [ ] Patient search from the sidebar (global, not just within the patients section)
- [ ] Mobile / tablet layout (chairside use)
- [ ] Offline mode — service worker + IndexedDB cache for read-only chairside access

### Infrastructure
- [ ] Initialize Aerich migrations (currently using `generate_schemas=True`)
- [ ] Switch SQLite → Postgres for production
- [ ] Store JWT in httpOnly cookie instead of JS memory (survives page refresh)
- [ ] Environment-specific CORS config (dev vs. prod)
- [ ] Docker Compose for backend + DB
