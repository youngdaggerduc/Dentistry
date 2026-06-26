from fastapi import APIRouter
from passlib.context import CryptContext
from datetime import date, timedelta
from app.models import (
    User, Patient, FlaggedTooth, Appointment,
    Visit, ClinicalNote, TreatmentPlan, TreatmentStep,
    Reminder, CompetencyEntry, Prospect,
)

router = APIRouter(prefix="/api", tags=["seed"])
pwd = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

TODAY = date.today()


def _iso(delta_days=0, hour=9, minute=0):
    d = TODAY + timedelta(days=delta_days)
    return f"{d.isoformat()}T{hour:02d}:{minute:02d}:00"


def _date(delta_days=0):
    return (TODAY + timedelta(days=delta_days)).isoformat()


@router.post('/seed')
async def seed_db():
    # Wipe in dependency order
    await CompetencyEntry.all().delete()
    await ClinicalNote.all().delete()
    await TreatmentStep.all().delete()
    await TreatmentPlan.all().delete()
    await Visit.all().delete()
    await Reminder.all().delete()
    await Appointment.all().delete()
    await FlaggedTooth.all().delete()
    await Prospect.all().delete()
    await Patient.all().delete()
    await User.all().delete()

    # ── Demo user ──────────────────────────────────────────────────────────────
    user = await User.create(
        name='Sana Reyes',
        email='demo@enamel.app',
        hashed_password=pwd.hash('incisor'),
        year='Y3',
    )

    # ── Patients ───────────────────────────────────────────────────────────────
    p1 = await Patient.create(
        student=user, name='Amara Okafor', age='29',
        phone='(868) 555-0101', email='amara.okafor@email.com', dob='1995-03-14',
        faculty='Dr. Lin', status='Active',
        procedure='Composite restoration · #14',
        allergies='Penicillin', medications='None', medical_conditions='None',
        chief_complaint='Sensitivity on upper left molar when eating cold foods',
        referred_by='Campus flyer',
    )
    await FlaggedTooth.create(patient=p1, tooth_id='U6', note='caries', severity='moderate')
    await FlaggedTooth.create(patient=p1, tooth_id='L4', note='caries', severity='mild')

    p2 = await Patient.create(
        student=user, name='Theo Marsh', age='41',
        phone='(868) 555-0102', email='theo.marsh@email.com', dob='1983-07-22',
        faculty='Dr. Okada', status='Recall',
        procedure='Scaling & root planing',
        allergies='None', medications='Metformin (Type 2 Diabetes)', medical_conditions='Type 2 Diabetes',
        chief_complaint='Bleeding gums, has not seen a dentist in 3 years',
        referred_by='Faculty referral',
    )
    await FlaggedTooth.create(patient=p2, tooth_id='U3', note='calculus', severity='severe')
    await FlaggedTooth.create(patient=p2, tooth_id='U10', note='periodontal pocket', severity='moderate')
    await FlaggedTooth.create(patient=p2, tooth_id='L8', note='caries', severity='mild')

    p3 = await Patient.create(
        student=user, name='Priya Nair', age='23',
        phone='(868) 555-0103', email='priya.nair@email.com', dob='2001-11-05',
        faculty='Dr. Lin', status='Active',
        procedure='Orthodontic review',
        allergies='Latex', medications='None', medical_conditions='None',
        chief_complaint='Follow-up after braces removal, slight crowding returning',
        referred_by='Walk-in',
    )
    await FlaggedTooth.create(patient=p3, tooth_id='L1', note='crowding', severity='mild')

    p4 = await Patient.create(
        student=user, name='Diego Ramos', age='35',
        phone='(868) 555-0104', email='diego.ramos@email.com', dob='1989-05-30',
        faculty='Dr. Bell', status='New',
        procedure='Initial exam & charting',
        allergies='None', medications='None', medical_conditions='Hypertension',
        chief_complaint='General check-up, first dental visit in 5 years',
        referred_by='Community clinic',
    )

    p5 = await Patient.create(
        student=user, name='Hana Yusuf', age='52',
        phone='(868) 555-0105', email='hana.yusuf@email.com', dob='1972-01-18',
        faculty='Dr. Okada', status='Active',
        procedure='Crown prep · #19',
        allergies='Codeine', medications='Lisinopril, Aspirin', medical_conditions='Hypertension',
        chief_complaint='Broken cusp on lower right molar, pain when chewing',
        referred_by='Faculty referral',
    )
    await FlaggedTooth.create(patient=p5, tooth_id='L7', note='fracture', severity='severe')
    await FlaggedTooth.create(patient=p5, tooth_id='L6', note='caries', severity='moderate')
    await FlaggedTooth.create(patient=p5, tooth_id='U11', note='caries', severity='mild')

    p6 = await Patient.create(
        student=user, name='Leo Brandt', age='18',
        phone='(868) 555-0106', email='leo.brandt@email.com', dob='2006-08-12',
        faculty='Dr. Bell', status='Recall',
        procedure='Sealants & fluoride',
        allergies='None', medications='None', medical_conditions='None',
        chief_complaint='Routine check-up and preventive treatment',
        referred_by='Campus screening',
    )
    await FlaggedTooth.create(patient=p6, tooth_id='U7', note='early decay', severity='mild')

    # ── Appointments ───────────────────────────────────────────────────────────
    a1 = await Appointment.create(patient=p1, datetime_str=_iso(0, 14, 30), room='Bay 3', procedure='Composite restoration #14', faculty='Dr. Lin', status='confirmed')
    a2 = await Appointment.create(patient=p2, datetime_str=_iso(3, 13, 0),  room='Bay 4', procedure='Scaling & root planing',    faculty='Dr. Okada', status='scheduled')
    a3 = await Appointment.create(patient=p3, datetime_str=_iso(7, 11, 0),  room='Bay 2', procedure='Orthodontic review',        faculty='Dr. Lin', status='scheduled')
    a4 = await Appointment.create(patient=p4, datetime_str=_iso(4, 10, 0),  room='Bay 4', procedure='Initial exam & charting',   faculty='Dr. Bell', status='scheduled')
    a5 = await Appointment.create(patient=p5, datetime_str=_iso(0, 15, 15), room='Bay 3', procedure='Crown prep #19',            faculty='Dr. Okada', status='confirmed')
    a6 = await Appointment.create(patient=p6, datetime_str=_iso(2, 9, 30),  room='Bay 1', procedure='Sealants & fluoride',       faculty='Dr. Bell', status='scheduled')

    # Past completed appointments
    ap1 = await Appointment.create(patient=p1, datetime_str=_iso(-14, 10, 0), room='Bay 2', procedure='Initial exam', faculty='Dr. Lin', status='completed')
    ap2 = await Appointment.create(patient=p2, datetime_str=_iso(-30, 9, 0),  room='Bay 1', procedure='Periodontal exam', faculty='Dr. Okada', status='completed')
    ap3 = await Appointment.create(patient=p5, datetime_str=_iso(-7, 14, 0),  room='Bay 3', procedure='Radiograph', faculty='Dr. Okada', status='completed')

    # ── Visits ─────────────────────────────────────────────────────────────────
    v1 = await Visit.create(patient=p1, appointment=ap1, date_str=_date(-14), procedure='Initial exam & charting', procedure_category='Restorative', duration_mins=60, faculty_supervisor='Dr. Lin', status='completed')
    note1 = await ClinicalNote.create(visit=v1, subjective='Patient reports sensitivity on upper left quadrant when consuming cold beverages. No spontaneous pain.', objective='Caries noted on #14 (occlusal). Probing depths 2–3mm. No mobility. Moderate plaque accumulation.', assessment='Carious lesion #14 requiring composite restoration. Good periodontal health overall.', plan='Schedule composite restoration #14. Reinforce oral hygiene. 6-month recall.')
    await CompetencyEntry.create(visit=v1, category='Restorative', procedure_name='Initial exam & charting', patient_name=p1.name, date_str=_date(-14), faculty='Dr. Lin')

    v2 = await Visit.create(patient=p2, appointment=ap2, date_str=_date(-30), procedure='Periodontal exam', procedure_category='Periodontics', duration_mins=75, faculty_supervisor='Dr. Okada', status='completed')
    note2 = await ClinicalNote.create(visit=v2, subjective='Patient reports bleeding gums daily. Has not had professional cleaning in 3 years. Reports brushing once daily.', objective='Generalised BOP. Probing depths 4–6mm in posterior regions. Heavy calculus supragingival and subgingival. Furcation involvement #14.', assessment='Generalised moderate chronic periodontitis. SRP indicated for all 4 quadrants.', plan='Full mouth SRP over 2 visits. Oral hygiene instruction. Review in 6–8 weeks.')
    await CompetencyEntry.create(visit=v2, category='Periodontics', procedure_name='Periodontal exam', patient_name=p2.name, date_str=_date(-30), faculty='Dr. Okada')

    v3 = await Visit.create(patient=p5, appointment=ap3, date_str=_date(-7), procedure='Radiograph', procedure_category='Restorative', duration_mins=30, faculty_supervisor='Dr. Okada', status='completed')
    note3 = await ClinicalNote.create(visit=v3, subjective='Pain on biting, sharp pain from lower right molar. Started 2 weeks ago after eating hard candy.', objective='Fracture line visible on #19 lingual cusp. Periapical radiograph: no periapical pathology. Vitality test positive.', assessment='Cuspal fracture #19. Crown restoration indicated.', plan='Crown prep this visit. Temporise. Final crown 2 weeks.')
    await CompetencyEntry.create(visit=v3, category='Prosthodontics', procedure_name='Radiograph & crown assessment', patient_name=p5.name, date_str=_date(-7), faculty='Dr. Okada')

    # More competency entries for realistic bar data
    await CompetencyEntry.create(category='Restorative',    procedure_name='Composite #22',         patient_name='M. Webb',  date_str=_date(-45), faculty='Dr. Lin')
    await CompetencyEntry.create(category='Restorative',    procedure_name='Amalgam #30',           patient_name='A. Singh', date_str=_date(-60), faculty='Dr. Lin')
    await CompetencyEntry.create(category='Periodontics',   procedure_name='SRP quadrant 1',        patient_name='T. Marsh', date_str=_date(-20), faculty='Dr. Okada')
    await CompetencyEntry.create(category='Periodontics',   procedure_name='SRP quadrant 2',        patient_name='T. Marsh', date_str=_date(-15), faculty='Dr. Okada')
    await CompetencyEntry.create(category='Endodontics',    procedure_name='RCT #9',                patient_name='R. Costa', date_str=_date(-90), faculty='Dr. Bell')
    await CompetencyEntry.create(category='Endodontics',    procedure_name='Pulpotomy #20',         patient_name='K. James', date_str=_date(-70), faculty='Dr. Bell')
    await CompetencyEntry.create(category='Prosthodontics', procedure_name='Complete denture upper', patient_name='H. Yusuf', date_str=_date(-50), faculty='Dr. Okada')
    await CompetencyEntry.create(category='Oral Surgery',   procedure_name='Extraction #17',        patient_name='L. Brandt',date_str=_date(-35), faculty='Dr. Bell')

    # ── Treatment Plans ────────────────────────────────────────────────────────
    tp1 = await TreatmentPlan.create(patient=p1, title='Caries Management Plan', status='active')
    await TreatmentStep.create(plan=tp1, order=1, description='Initial exam & radiographs', status='completed', completed_at=_date(-14))
    await TreatmentStep.create(plan=tp1, order=2, description='Composite restoration #14', status='in_progress')
    await TreatmentStep.create(plan=tp1, order=3, description='Polish & occlusal check', status='pending')
    await TreatmentStep.create(plan=tp1, order=4, description='6-month recall appointment', status='pending')

    tp2 = await TreatmentPlan.create(patient=p2, title='Periodontal Treatment Plan', status='active')
    await TreatmentStep.create(plan=tp2, order=1, description='Periodontal exam & charting', status='completed', completed_at=_date(-30))
    await TreatmentStep.create(plan=tp2, order=2, description='Oral hygiene instruction', status='completed', completed_at=_date(-30))
    await TreatmentStep.create(plan=tp2, order=3, description='SRP quadrant 1 & 2', status='completed', completed_at=_date(-20))
    await TreatmentStep.create(plan=tp2, order=4, description='SRP quadrant 3 & 4', status='in_progress')
    await TreatmentStep.create(plan=tp2, order=5, description='Periodontal re-evaluation', status='pending')

    tp5 = await TreatmentPlan.create(patient=p5, title='Crown Restoration Plan', status='active')
    await TreatmentStep.create(plan=tp5, order=1, description='Radiograph & diagnosis', status='completed', completed_at=_date(-7))
    await TreatmentStep.create(plan=tp5, order=2, description='Crown preparation #19', status='in_progress')
    await TreatmentStep.create(plan=tp5, order=3, description='Temporisation', status='pending')
    await TreatmentStep.create(plan=tp5, order=4, description='Final crown cementation', status='pending')

    tp4 = await TreatmentPlan.create(patient=p4, title='New Patient Workup', status='active')
    await TreatmentStep.create(plan=tp4, order=1, description='Full mouth radiographs', status='pending')
    await TreatmentStep.create(plan=tp4, order=2, description='Comprehensive exam & charting', status='pending')
    await TreatmentStep.create(plan=tp4, order=3, description='Oral cancer screening', status='pending')
    await TreatmentStep.create(plan=tp4, order=4, description='Treatment planning', status='pending')

    # ── Reminders ──────────────────────────────────────────────────────────────
    await Reminder.create(patient=p2, due_date_str=_date(0),  message='Call Theo Marsh to confirm SRP appointment this week', type='followup')
    await Reminder.create(patient=p4, due_date_str=_date(1),  message='Send intake forms to Diego Ramos before Friday exam', type='custom')
    await Reminder.create(patient=p6, due_date_str=_date(-1), message='Leo Brandt recall — has not been seen in 6 months', type='recall', dismissed=False)

    # ── Prospects ──────────────────────────────────────────────────────────────
    await Prospect.create(student=user, name='Marcus Webb',  interest='Whitening consult',  source='Campus screening', stage='New lead')
    await Prospect.create(student=user, name='Ife Adeyemi',  interest='Wisdom tooth eval',  source='Faculty referral', stage='Contacted')
    await Prospect.create(student=user, name='Rosa Delgado', interest='Full charting',       source='Community clinic', stage='Appointment booked')
    await Prospect.create(student=user, name='Kenji Sato',   interest='Ortho assessment',    source='Walk-in',          stage='Converted')

    return {'seeded': True, 'user': {'email': 'demo@enamel.app', 'password': 'incisor'}}
