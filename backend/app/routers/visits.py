from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.models import Visit, ClinicalNote, Patient, CompetencyEntry
from app.routers.auth import current_user, User

router = APIRouter(prefix="/api", tags=["visits"])


class VisitIn(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    date_str: str
    procedure: Optional[str] = None
    procedure_category: Optional[str] = None
    duration_mins: Optional[int] = None
    faculty_supervisor: Optional[str] = None
    status: str = 'completed'


class NoteIn(BaseModel):
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None


def _visit_fmt(v, note=None):
    return {
        'id': v.id,
        'patient_id': v.patient_id,
        'appointment_id': v.appointment_id,
        'date_str': v.date_str,
        'procedure': v.procedure,
        'procedure_category': v.procedure_category,
        'duration_mins': v.duration_mins,
        'faculty_supervisor': v.faculty_supervisor,
        'status': v.status,
        'note': _note_fmt(note) if note else None,
    }


def _note_fmt(n):
    return {
        'id': n.id,
        'subjective': n.subjective,
        'objective': n.objective,
        'assessment': n.assessment,
        'plan': n.plan,
        'updated_at': n.updated_at.isoformat() if n.updated_at else None,
    }


@router.get('/patients/{patient_id}/visits')
async def list_visits(patient_id: int, user: User = Depends(current_user)):
    if not await Patient.exists(id=patient_id, student_id=user.id):
        raise HTTPException(404)
    visits = await Visit.filter(patient_id=patient_id).prefetch_related('note').order_by('-date_str')
    result = []
    for v in visits:
        note = None
        try:
            note = await v.note
        except Exception:
            pass
        result.append(_visit_fmt(v, note))
    return result


@router.post('/visits', status_code=201)
async def create_visit(data: VisitIn, user: User = Depends(current_user)):
    p = await Patient.get_or_none(id=data.patient_id, student_id=user.id)
    if not p:
        raise HTTPException(404)
    v = await Visit.create(**data.model_dump())
    # Auto-create a CompetencyEntry when category is set
    if data.procedure_category and data.procedure:
        await CompetencyEntry.create(
            visit=v,
            category=data.procedure_category,
            procedure_name=data.procedure,
            patient_name=p.name,
            date_str=data.date_str,
            faculty=data.faculty_supervisor,
        )
    return _visit_fmt(v)


@router.get('/visits/{visit_id}')
async def get_visit(visit_id: int, user: User = Depends(current_user)):
    v = await Visit.get_or_none(id=visit_id)
    if not v or not await Patient.exists(id=v.patient_id, student_id=user.id):
        raise HTTPException(404)
    note = None
    try:
        note = await ClinicalNote.get_or_none(visit_id=visit_id)
    except Exception:
        pass
    return _visit_fmt(v, note)


@router.put('/visits/{visit_id}/note')
async def upsert_note(visit_id: int, data: NoteIn, user: User = Depends(current_user)):
    v = await Visit.get_or_none(id=visit_id)
    if not v or not await Patient.exists(id=v.patient_id, student_id=user.id):
        raise HTTPException(404)
    note, _ = await ClinicalNote.get_or_create(visit_id=visit_id, defaults=data.model_dump())
    if not _:
        await note.update_from_dict(data.model_dump(exclude_none=True)).save()
    return _note_fmt(note)


@router.delete('/visits/{visit_id}', status_code=204)
async def delete_visit(visit_id: int, user: User = Depends(current_user)):
    v = await Visit.get_or_none(id=visit_id)
    if not v or not await Patient.exists(id=v.patient_id, student_id=user.id):
        raise HTTPException(404)
    await v.delete()
