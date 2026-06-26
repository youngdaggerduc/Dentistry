from tortoise import fields, models


# ── Auth ──────────────────────────────────────────────────────────────────────

class User(models.Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    email = fields.CharField(max_length=255, unique=True)
    hashed_password = fields.CharField(max_length=255)
    year = fields.CharField(max_length=10, default='Y3')

    class Meta:
        table = "users"


# ── Patients ──────────────────────────────────────────────────────────────────

class Patient(models.Model):
    id = fields.IntField(pk=True)
    student = fields.ForeignKeyField('models.User', related_name='patients', on_delete=fields.CASCADE, null=True)
    name = fields.CharField(max_length=255)
    age = fields.CharField(max_length=20, null=True)
    phone = fields.CharField(max_length=50, null=True)
    email = fields.CharField(max_length=255, null=True)
    dob = fields.CharField(max_length=20, null=True)
    faculty = fields.CharField(max_length=255, null=True)
    status = fields.CharField(max_length=50, default='New')
    procedure = fields.CharField(max_length=500, null=True)
    allergies = fields.TextField(null=True)
    medications = fields.TextField(null=True)
    medical_conditions = fields.TextField(null=True)
    chief_complaint = fields.TextField(null=True)
    referred_by = fields.CharField(max_length=255, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "patients"


class FlaggedTooth(models.Model):
    id = fields.IntField(pk=True)
    patient = fields.ForeignKeyField('models.Patient', related_name='flagged_teeth', on_delete=fields.CASCADE)
    tooth_id = fields.CharField(max_length=10)
    note = fields.CharField(max_length=255, default='caries')
    severity = fields.CharField(max_length=50, default='moderate')  # mild | moderate | severe

    class Meta:
        table = "flagged_teeth"
        unique_together = (('patient_id', 'tooth_id'),)


# ── Appointments ──────────────────────────────────────────────────────────────

class Appointment(models.Model):
    id = fields.IntField(pk=True)
    patient = fields.ForeignKeyField('models.Patient', related_name='appointments', on_delete=fields.CASCADE)
    datetime_str = fields.CharField(max_length=50)   # ISO string, stored as text for SQLite simplicity
    room = fields.CharField(max_length=100, null=True)
    procedure = fields.CharField(max_length=500, null=True)
    faculty = fields.CharField(max_length=255, null=True)
    status = fields.CharField(max_length=30, default='scheduled')  # scheduled|confirmed|completed|no_show|cancelled
    notes = fields.TextField(null=True)

    class Meta:
        table = "appointments"


# ── Visits & Clinical Notes ───────────────────────────────────────────────────

class Visit(models.Model):
    id = fields.IntField(pk=True)
    patient = fields.ForeignKeyField('models.Patient', related_name='visits', on_delete=fields.CASCADE)
    appointment = fields.ForeignKeyField('models.Appointment', related_name='visit', on_delete=fields.SET_NULL, null=True)
    date_str = fields.CharField(max_length=30)
    procedure = fields.CharField(max_length=500, null=True)
    procedure_category = fields.CharField(max_length=100, null=True)  # Restorative | Periodontics | etc.
    duration_mins = fields.IntField(null=True)
    faculty_supervisor = fields.CharField(max_length=255, null=True)
    status = fields.CharField(max_length=30, default='completed')  # completed | no_show | cancelled

    class Meta:
        table = "visits"


class ClinicalNote(models.Model):
    id = fields.IntField(pk=True)
    visit = fields.ForeignKeyField('models.Visit', related_name='note', on_delete=fields.CASCADE, unique=True)
    subjective = fields.TextField(null=True)
    objective = fields.TextField(null=True)
    assessment = fields.TextField(null=True)
    plan = fields.TextField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "clinical_notes"


# ── Treatment Plans ───────────────────────────────────────────────────────────

class TreatmentPlan(models.Model):
    id = fields.IntField(pk=True)
    patient = fields.ForeignKeyField('models.Patient', related_name='treatment_plans', on_delete=fields.CASCADE)
    title = fields.CharField(max_length=255)
    status = fields.CharField(max_length=30, default='active')  # active | completed | on_hold

    class Meta:
        table = "treatment_plans"


class TreatmentStep(models.Model):
    id = fields.IntField(pk=True)
    plan = fields.ForeignKeyField('models.TreatmentPlan', related_name='steps', on_delete=fields.CASCADE)
    order = fields.IntField(default=0)
    description = fields.CharField(max_length=500)
    status = fields.CharField(max_length=30, default='pending')  # pending | in_progress | completed
    completed_at = fields.CharField(max_length=30, null=True)

    class Meta:
        table = "treatment_steps"


# ── Reminders ─────────────────────────────────────────────────────────────────

class Reminder(models.Model):
    id = fields.IntField(pk=True)
    patient = fields.ForeignKeyField('models.Patient', related_name='reminders', on_delete=fields.CASCADE)
    appointment = fields.ForeignKeyField('models.Appointment', related_name='reminders', on_delete=fields.SET_NULL, null=True)
    due_date_str = fields.CharField(max_length=30)
    message = fields.CharField(max_length=500)
    type = fields.CharField(max_length=50, default='custom')  # recall | followup | outreach | custom
    dismissed = fields.BooleanField(default=False)

    class Meta:
        table = "reminders"


# ── Competency ────────────────────────────────────────────────────────────────

class CompetencyEntry(models.Model):
    id = fields.IntField(pk=True)
    visit = fields.ForeignKeyField('models.Visit', related_name='competency_entry', on_delete=fields.CASCADE, null=True)
    category = fields.CharField(max_length=100)   # Restorative | Periodontics | Endodontics | Prosthodontics | Oral Surgery | Orthodontics
    procedure_name = fields.CharField(max_length=255)
    patient_name = fields.CharField(max_length=255)
    date_str = fields.CharField(max_length=30)
    faculty = fields.CharField(max_length=255, null=True)

    class Meta:
        table = "competency_entries"


# ── Prospects ─────────────────────────────────────────────────────────────────

class Prospect(models.Model):
    id = fields.IntField(pk=True)
    student = fields.ForeignKeyField('models.User', related_name='prospects', on_delete=fields.CASCADE, null=True)
    name = fields.CharField(max_length=255)
    interest = fields.CharField(max_length=500)
    source = fields.CharField(max_length=255)
    stage = fields.CharField(max_length=100, default='New lead')  # New lead | Contacted | Appointment booked | Converted

    class Meta:
        table = "prospects"
