from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.models import Appointment, Patient
from app.routers.auth import current_user, User

router = APIRouter(prefix="/api", tags=["appointments"])


class AppointmentIn(BaseModel):
    patient_id: int
    datetime_str: str
    room: Optional[str] = None
    procedure: Optional[str] = None
    faculty: Optional[str] = None
    status: str = 'scheduled'
    notes: Optional[str] = None


def _fmt(a):
    return {
        'id': a.id,
        'patient_id': a.patient_id,
        'datetime_str': a.datetime_str,
        'room': a.room,
        'procedure': a.procedure,
        'faculty': a.faculty,
        'status': a.status,
        'notes': a.notes,
    }


@router.get('/appointments')
async def list_appointments(user: User = Depends(current_user)):
    patient_ids = await Patient.filter(student_id=user.id).values_list('id', flat=True)
    appts = await Appointment.filter(patient_id__in=patient_ids).prefetch_related('patient')
    return [{**_fmt(a), 'patient_name': a.patient.name} for a in appts]


@router.get('/appointments/today')
async def today_appointments(user: User = Depends(current_user)):
    from datetime import date
    today = date.today().isoformat()
    patient_ids = await Patient.filter(student_id=user.id).values_list('id', flat=True)
    appts = await Appointment.filter(
        patient_id__in=patient_ids,
        datetime_str__startswith=today,
        status__in=['scheduled', 'confirmed'],
    ).prefetch_related('patient')
    appts.sort(key=lambda a: a.datetime_str)
    return [{**_fmt(a), 'patient_name': a.patient.name} for a in appts]


@router.get('/appointments/week')
async def week_appointments(user: User = Depends(current_user)):
    from datetime import date, timedelta
    today = date.today()
    week_start = today.isoformat()
    week_end = (today + timedelta(days=7)).isoformat()
    patient_ids = await Patient.filter(student_id=user.id).values_list('id', flat=True)
    appts = await Appointment.filter(
        patient_id__in=patient_ids,
        datetime_str__gte=week_start,
        datetime_str__lte=week_end,
        status__in=['scheduled', 'confirmed'],
    ).prefetch_related('patient')
    appts.sort(key=lambda a: a.datetime_str)
    return [{**_fmt(a), 'patient_name': a.patient.name} for a in appts]


@router.post('/appointments', status_code=201)
async def create_appointment(data: AppointmentIn, user: User = Depends(current_user)):
    if not await Patient.exists(id=data.patient_id, student_id=user.id):
        raise HTTPException(404, "Patient not found")
    a = await Appointment.create(**data.model_dump())
    await a.fetch_related('patient')
    return {**_fmt(a), 'patient_name': a.patient.name}


@router.put('/appointments/{appt_id}')
async def update_appointment(appt_id: int, data: AppointmentIn, user: User = Depends(current_user)):
    a = await Appointment.get_or_none(id=appt_id)
    if not a or not await Patient.exists(id=a.patient_id, student_id=user.id):
        raise HTTPException(404)
    await a.update_from_dict(data.model_dump(exclude_none=True)).save()
    await a.fetch_related('patient')
    return {**_fmt(a), 'patient_name': a.patient.name}


@router.patch('/appointments/{appt_id}/status')
async def set_status(appt_id: int, status: str, user: User = Depends(current_user)):
    a = await Appointment.get_or_none(id=appt_id)
    if not a or not await Patient.exists(id=a.patient_id, student_id=user.id):
        raise HTTPException(404)
    a.status = status
    await a.save()
    return _fmt(a)


@router.delete('/appointments/{appt_id}', status_code=204)
async def delete_appointment(appt_id: int, user: User = Depends(current_user)):
    a = await Appointment.get_or_none(id=appt_id)
    if not a or not await Patient.exists(id=a.patient_id, student_id=user.id):
        raise HTTPException(404)
    await a.delete()
