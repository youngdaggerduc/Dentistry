from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.models import Reminder, Patient
from app.routers.auth import current_user, User

router = APIRouter(prefix="/api", tags=["reminders"])


class ReminderIn(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    due_date_str: str
    message: str
    type: str = 'custom'


def _fmt(r):
    return {
        'id': r.id,
        'patient_id': r.patient_id,
        'appointment_id': r.appointment_id,
        'due_date_str': r.due_date_str,
        'message': r.message,
        'type': r.type,
        'dismissed': r.dismissed,
    }


@router.get('/reminders')
async def list_reminders(user: User = Depends(current_user)):
    from datetime import date
    patient_ids = await Patient.filter(student_id=user.id).values_list('id', flat=True)
    reminders = await Reminder.filter(patient_id__in=patient_ids, dismissed=False).prefetch_related('patient')
    reminders.sort(key=lambda r: r.due_date_str)
    return [{**_fmt(r), 'patient_name': r.patient.name} for r in reminders]


@router.post('/reminders', status_code=201)
async def create_reminder(data: ReminderIn, user: User = Depends(current_user)):
    if not await Patient.exists(id=data.patient_id, student_id=user.id):
        raise HTTPException(404)
    r = await Reminder.create(**data.model_dump())
    return _fmt(r)


@router.patch('/reminders/{reminder_id}/dismiss', status_code=200)
async def dismiss(reminder_id: int, user: User = Depends(current_user)):
    r = await Reminder.get_or_none(id=reminder_id)
    if not r or not await Patient.exists(id=r.patient_id, student_id=user.id):
        raise HTTPException(404)
    r.dismissed = True
    await r.save()
    return _fmt(r)


@router.delete('/reminders/{reminder_id}', status_code=204)
async def delete_reminder(reminder_id: int, user: User = Depends(current_user)):
    r = await Reminder.get_or_none(id=reminder_id)
    if not r or not await Patient.exists(id=r.patient_id, student_id=user.id):
        raise HTTPException(404)
    await r.delete()
