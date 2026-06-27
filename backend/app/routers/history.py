from fastapi import APIRouter, HTTPException, Depends
from app.models import AuditLog, Appointment, Patient
from app.routers.auth import current_user, User

router = APIRouter(prefix="/api", tags=["history"])


@router.get('/audit')
async def list_audit(limit: int = 50, user: User = Depends(current_user)):
    rows = await AuditLog.filter(user_id=user.id).order_by('-created_at').limit(limit)
    return [{
        'id': r.id,
        'entity': r.entity,
        'entity_id': r.entity_id,
        'action': r.action,
        'summary': r.summary,
        'created_at': r.created_at.isoformat() if r.created_at else None,
    } for r in rows]


@router.get('/appointments/{appointment_id}/reminder-text')
async def reminder_text(appointment_id: int, channel: str = 'sms', user: User = Depends(current_user)):
    """Generate copy-paste reminder text for an upcoming appointment (no send)."""
    a = await Appointment.get_or_none(id=appointment_id).prefetch_related('patient')
    if not a or not await Patient.exists(id=a.patient_id, student_id=user.id):
        raise HTTPException(404)
    patient = a.patient

    when = a.datetime_str
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(a.datetime_str)
        when = dt.strftime('%A %b %-d at %-I:%M %p')
    except Exception:
        pass

    first = (patient.name or 'there').split()[0]
    proc = a.procedure or 'your appointment'
    room = f' in {a.room}' if a.room else ''

    if channel == 'email':
        subject = f'Reminder: your dental appointment on {when}'
        body = (
            f'Hi {first},\n\n'
            f'This is a reminder of your upcoming dental appointment for {proc} '
            f'on {when}{room}.\n\n'
            f'Please reply to confirm, or let us know if you need to reschedule.\n\n'
            f'Thank you,\nThe Clinic'
        )
        return {'channel': 'email', 'subject': subject, 'body': body}

    sms = (
        f'Hi {first}, reminder of your dental appointment for {proc} on {when}{room}. '
        f'Reply C to confirm or call us to reschedule.'
    )
    return {'channel': 'sms', 'body': sms}
