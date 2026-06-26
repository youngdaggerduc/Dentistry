from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.models import CompetencyEntry, Patient
from app.routers.auth import current_user, User

router = APIRouter(prefix="/api", tags=["competency"])

REQUIREMENTS = {
    'Restorative':    20,
    'Periodontics':   15,
    'Endodontics':    10,
    'Prosthodontics': 8,
    'Oral Surgery':   6,
    'Orthodontics':   5,
}


class EntryIn(BaseModel):
    category: str
    procedure_name: str
    patient_name: str
    date_str: str
    faculty: Optional[str] = None


def _fmt(e):
    return {
        'id': e.id,
        'visit_id': e.visit_id,
        'category': e.category,
        'procedure_name': e.procedure_name,
        'patient_name': e.patient_name,
        'date_str': e.date_str,
        'faculty': e.faculty,
    }


@router.get('/competency')
async def get_competency(user: User = Depends(current_user)):
    patient_ids = await Patient.filter(student_id=user.id).values_list('id', flat=True)
    # Get all visits for this student's patients, then their competency entries
    from app.models import Visit
    visit_ids = await Visit.filter(patient_id__in=patient_ids).values_list('id', flat=True)
    entries = await CompetencyEntry.filter(visit_id__in=visit_ids).all()

    # Also include entries not linked to visits (manually added)
    manual = await CompetencyEntry.filter(visit_id__isnull=True).all()
    all_entries = list(entries) + list(manual)

    counts = {}
    for e in all_entries:
        counts[e.category] = counts.get(e.category, 0) + 1

    summary = []
    for cat, req in REQUIREMENTS.items():
        done = counts.get(cat, 0)
        summary.append({
            'category': cat,
            'required': req,
            'completed': done,
            'pct': min(100, round(done / req * 100)),
        })

    return {
        'summary': summary,
        'entries': [_fmt(e) for e in sorted(all_entries, key=lambda e: e.date_str, reverse=True)],
    }


@router.post('/competency', status_code=201)
async def add_entry(data: EntryIn, user: User = Depends(current_user)):
    e = await CompetencyEntry.create(**data.model_dump())
    return _fmt(e)


@router.delete('/competency/{entry_id}', status_code=204)
async def delete_entry(entry_id: int, user: User = Depends(current_user)):
    e = await CompetencyEntry.get_or_none(id=entry_id)
    if not e:
        raise HTTPException(404)
    await e.delete()
