from fastapi import APIRouter, Depends
from tortoise.expressions import Q
from app.models import Patient, Visit, ClinicalNote
from app.routers.auth import current_user, User
from datetime import date

router = APIRouter(prefix="/api", tags=["search"])


@router.get('/search')
async def search(q: str = '', user: User = Depends(current_user)):
    """Global search across the student's own patients, visits, and notes.

    Returns patient-centric hits: each result points at a patient and carries
    enough context (last procedure, next appointment, why it matched) for the
    command palette to render a useful line.
    """
    term = q.strip()
    if len(term) < 1:
        return []

    today = str(date.today())

    # Patient ids that match directly on patient fields …
    patient_hits = await Patient.filter(
        Q(student_id=user.id) & (
            Q(name__icontains=term) |
            Q(procedure__icontains=term) |
            Q(faculty__icontains=term) |
            Q(chief_complaint__icontains=term)
        )
    ).values_list('id', flat=True)

    # … or via a visit procedure/category …
    visit_patient_ids = await Visit.filter(
        Q(patient__student_id=user.id) & (
            Q(procedure__icontains=term) | Q(procedure_category__icontains=term)
        )
    ).values_list('patient_id', flat=True)

    # … or via clinical note text.
    note_patient_ids = await ClinicalNote.filter(
        Q(visit__patient__student_id=user.id) & (
            Q(subjective__icontains=term) | Q(objective__icontains=term) |
            Q(assessment__icontains=term) | Q(plan__icontains=term)
        )
    ).values_list('visit__patient_id', flat=True)

    matched_ids = set(patient_hits) | set(visit_patient_ids) | set(note_patient_ids)
    if not matched_ids:
        return []

    patients = await Patient.filter(id__in=matched_ids).prefetch_related('visits', 'appointments')

    results = []
    for p in patients:
        # Last completed procedure
        completed = [v for v in p.visits if v.status == 'completed' and v.date_str]
        completed.sort(key=lambda v: v.date_str, reverse=True)
        last_proc = completed[0].procedure if completed else (p.procedure or None)

        # Next upcoming appointment
        upcoming = [a for a in p.appointments
                    if a.status in ('scheduled', 'confirmed') and a.datetime_str >= today]
        upcoming.sort(key=lambda a: a.datetime_str)
        next_appt = upcoming[0].datetime_str if upcoming else None

        reasons = []
        if p.id in set(patient_hits):       reasons.append('patient')
        if p.id in set(visit_patient_ids):  reasons.append('procedure')
        if p.id in set(note_patient_ids):   reasons.append('note')

        results.append({
            'patient_id': p.id,
            'name': p.name,
            'status': p.status,
            'last_procedure': last_proc,
            'next_appointment': next_appt,
            'matched_on': reasons,
        })

    # Name matches first, then alphabetical
    results.sort(key=lambda r: (term.lower() not in r['name'].lower(), r['name'].lower()))
    return results
