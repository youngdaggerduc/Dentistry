from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.models import Patient, FlaggedTooth, Appointment
from app.routers.auth import current_user, User

router = APIRouter(prefix="/api", tags=["patients"])


class PatientIn(BaseModel):
    name: str
    age: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[str] = None
    faculty: Optional[str] = None
    status: str = 'New'
    procedure: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    medical_conditions: Optional[str] = None
    chief_complaint: Optional[str] = None
    referred_by: Optional[str] = None


def _next_appt(appointments):
    from datetime import datetime
    upcoming = [a for a in appointments if a.status in ('scheduled', 'confirmed')]
    upcoming.sort(key=lambda a: a.datetime_str)
    if not upcoming:
        return None
    try:
        dt = datetime.fromisoformat(upcoming[0].datetime_str)
        return dt.strftime('%a · %-d %b · %-I:%M %p').replace('AM','am').replace('PM','pm')
    except Exception:
        return upcoming[0].datetime_str


def _fmt(p, teeth=None, appointments=None):
    return {
        'id': p.id,
        'name': p.name,
        'age': p.age or '—',
        'phone': p.phone,
        'email': p.email,
        'dob': p.dob,
        'faculty': p.faculty,
        'status': p.status,
        'procedure': p.procedure,
        'allergies': p.allergies,
        'medications': p.medications,
        'medical_conditions': p.medical_conditions,
        'chief_complaint': p.chief_complaint,
        'referred_by': p.referred_by,
        'badTeeth': [{'id': t.tooth_id, 'note': t.note, 'severity': t.severity} for t in (teeth or [])],
        'next': _next_appt(appointments or []) if appointments is not None else None,
    }


@router.get('/patients')
async def list_patients(user: User = Depends(current_user)):
    patients = await Patient.filter(student_id=user.id).prefetch_related('flagged_teeth', 'appointments')
    return [_fmt(p, p.flagged_teeth, p.appointments) for p in patients]


@router.get('/patients/{patient_id}')
async def get_patient(patient_id: int, user: User = Depends(current_user)):
    p = await Patient.get_or_none(id=patient_id, student_id=user.id)
    if not p:
        raise HTTPException(404)
    await p.fetch_related('flagged_teeth', 'appointments')
    return _fmt(p, p.flagged_teeth, p.appointments)


@router.post('/patients', status_code=201)
async def create_patient(data: PatientIn, user: User = Depends(current_user)):
    p = await Patient.create(
        student_id=user.id,
        name=data.name,
        age=data.age,
        phone=data.phone,
        email=data.email,
        dob=data.dob,
        faculty=data.faculty,
        status=data.status,
        procedure=data.procedure,
        allergies=data.allergies,
        medications=data.medications,
        medical_conditions=data.medical_conditions,
        chief_complaint=data.chief_complaint,
        referred_by=data.referred_by,
    )
    return _fmt(p, [], [])


@router.put('/patients/{patient_id}')
async def update_patient(patient_id: int, data: PatientIn, user: User = Depends(current_user)):
    p = await Patient.get_or_none(id=patient_id, student_id=user.id)
    if not p:
        raise HTTPException(404)
    await p.update_from_dict(data.model_dump(exclude_none=True)).save()
    await p.fetch_related('flagged_teeth', 'appointments')
    return _fmt(p, p.flagged_teeth, p.appointments)


@router.delete('/patients/{patient_id}', status_code=204)
async def delete_patient(patient_id: int, user: User = Depends(current_user)):
    p = await Patient.get_or_none(id=patient_id, student_id=user.id)
    if not p:
        raise HTTPException(404)
    await p.delete()


@router.get('/patients/{patient_id}/teeth')
async def get_teeth(patient_id: int, user: User = Depends(current_user)):
    if not await Patient.exists(id=patient_id, student_id=user.id):
        raise HTTPException(404)
    teeth = await FlaggedTooth.filter(patient_id=patient_id).all()
    return [{'tooth_id': t.tooth_id, 'note': t.note, 'severity': t.severity} for t in teeth]


@router.post('/patients/{patient_id}/teeth/{tooth_id}', status_code=201)
async def flag_tooth(patient_id: int, tooth_id: str, note: str = 'caries', severity: str = 'moderate', user: User = Depends(current_user)):
    if not await Patient.exists(id=patient_id, student_id=user.id):
        raise HTTPException(404)
    t, _ = await FlaggedTooth.get_or_create(
        patient_id=patient_id, tooth_id=tooth_id,
        defaults={'note': note, 'severity': severity},
    )
    return {'tooth_id': t.tooth_id, 'note': t.note, 'severity': t.severity}


@router.patch('/patients/{patient_id}/teeth/{tooth_id}')
async def update_tooth(patient_id: int, tooth_id: str, note: str = 'caries', severity: str = 'moderate', user: User = Depends(current_user)):
    t = await FlaggedTooth.get_or_none(patient_id=patient_id, tooth_id=tooth_id)
    if not t:
        raise HTTPException(404)
    t.note = note
    t.severity = severity
    await t.save()
    return {'tooth_id': t.tooth_id, 'note': t.note, 'severity': t.severity}


@router.delete('/patients/{patient_id}/teeth/{tooth_id}', status_code=204)
async def unflag_tooth(patient_id: int, tooth_id: str, user: User = Depends(current_user)):
    deleted = await FlaggedTooth.filter(patient_id=patient_id, tooth_id=tooth_id).delete()
    if not deleted:
        raise HTTPException(404)
