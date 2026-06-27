from fastapi import APIRouter, Depends
from app.models import Reminder, Patient, Visit, Prospect
from app.routers.auth import current_user, User
from datetime import date, timedelta

router = APIRouter(prefix="/api", tags=["reminders"])


def _fmt(r, patient_name=None):
    return {
        'id': r.id,
        'patient_id': r.patient_id,
        'patient_name': patient_name,
        'appointment_id': r.appointment_id,
        'due_date_str': r.due_date_str,
        'message': r.message,
        'type': r.type,
        'dismissed': r.dismissed,
    }


@router.get('/reminders')
async def list_reminders(user: User = Depends(current_user)):
    reminders = await Reminder.filter(
        patient__student_id=user.id,
        dismissed=False,
    ).prefetch_related('patient').order_by('due_date_str')
    return [_fmt(r, r.patient.name) for r in reminders]


@router.post('/reminders', status_code=201)
async def create_reminder(data: dict, user: User = Depends(current_user)):
    r = await Reminder.create(
        patient_id=data['patient_id'],
        due_date_str=data.get('due_date_str', str(date.today())),
        message=data['message'],
        type=data.get('type', 'custom'),
        dismissed=False,
    )
    return _fmt(r)


@router.patch('/reminders/{reminder_id}/dismiss', status_code=204)
async def dismiss_reminder(reminder_id: int, user: User = Depends(current_user)):
    await Reminder.filter(id=reminder_id, patient__student_id=user.id).update(dismissed=True)


@router.delete('/reminders/{reminder_id}', status_code=204)
async def delete_reminder(reminder_id: int, user: User = Depends(current_user)):
    await Reminder.filter(id=reminder_id, patient__student_id=user.id).delete()


@router.post('/reminders/generate')
async def generate_reminders(user: User = Depends(current_user)):
    """Auto-detect recall and outreach situations, create undismissed reminders."""
    today = date.today()
    created = 0

    patients = await Patient.filter(student_id=user.id).prefetch_related(
        'visits', 'appointments', 'reminders'
    )

    for p in patients:
        upcoming = [a for a in p.appointments if a.status in ('scheduled', 'confirmed')]

        # ── Recall: no upcoming appointment and last visit > 6 months ago ──
        if not upcoming:
            completed_visits = [v for v in p.visits if v.status == 'completed']
            recent = None
            for v in completed_visits:
                try:
                    d = date.fromisoformat(v.date_str)
                    if recent is None or d > recent:
                        recent = d
                except Exception:
                    pass

            cutoff = today - timedelta(days=183)
            if recent is None or recent < cutoff:
                already = any(r.type == 'recall' and not r.dismissed for r in p.reminders)
                if not already:
                    last_txt = recent.isoformat() if recent else 'never'
                    await Reminder.create(
                        patient_id=p.id,
                        due_date_str=str(today),
                        message=f'{p.name} is due for a recall — last seen {last_txt}',
                        type='recall',
                        dismissed=False,
                    )
                    created += 1

    # ── Prospect outreach: stuck in early stages ──
    prospects = await Prospect.filter(student_id=user.id, stage__in=['New lead', 'Contacted']).all()
    anchor_patient = await Patient.filter(student_id=user.id).first()

    if anchor_patient:
        for pr in prospects:
            exists = await Reminder.filter(
                patient_id=anchor_patient.id,
                type='outreach',
                dismissed=False,
                message__icontains=pr.name,
            ).exists()
            if not exists:
                await Reminder.create(
                    patient_id=anchor_patient.id,
                    due_date_str=str(today),
                    message=f'Follow up with prospect {pr.name} ({pr.stage})',
                    type='outreach',
                    dismissed=False,
                )
                created += 1

    return {'created': created}
