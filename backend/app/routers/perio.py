from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from app.models import PerioExam, PerioMeasurement, Patient
from app.routers.auth import current_user, User

router = APIRouter(prefix="/api", tags=["perio"])


class ExamIn(BaseModel):
    patient_id: int
    date_str: Optional[str] = None
    note: Optional[str] = None


class MeasurementIn(BaseModel):
    tooth_id: str
    pockets: Optional[List[int]] = None     # 6 sites in mm
    recession: Optional[List[int]] = None   # 6 sites in mm
    bleeding: Optional[List[int]] = None     # 6 sites 0/1
    mobility: Optional[int] = None
    furcation: Optional[int] = None
    plaque: bool = False


def _join(vals):
    return ','.join(str(v) for v in vals) if vals else None


def _split(s):
    return [int(x) for x in s.split(',')] if s else None


def _m_fmt(m):
    return {
        'id': m.id,
        'tooth_id': m.tooth_id,
        'pockets': _split(m.pockets),
        'recession': _split(m.recession),
        'bleeding': _split(m.bleeding),
        'mobility': m.mobility,
        'furcation': m.furcation,
        'plaque': m.plaque,
    }


def _exam_fmt(e, measurements=None):
    return {
        'id': e.id,
        'patient_id': e.patient_id,
        'date_str': e.date_str,
        'note': e.note,
        'measurements': [_m_fmt(m) for m in (measurements or [])],
    }


async def _own_patient(patient_id: int, user: User):
    if not await Patient.exists(id=patient_id, student_id=user.id):
        raise HTTPException(404)


async def _own_exam(exam_id: int, user: User) -> PerioExam:
    e = await PerioExam.get_or_none(id=exam_id)
    if not e or not await Patient.exists(id=e.patient_id, student_id=user.id):
        raise HTTPException(404)
    return e


@router.get('/patients/{patient_id}/perio')
async def list_exams(patient_id: int, user: User = Depends(current_user)):
    await _own_patient(patient_id, user)
    exams = await PerioExam.filter(patient_id=patient_id).prefetch_related('measurements').order_by('-date_str')
    return [_exam_fmt(e, list(e.measurements)) for e in exams]


@router.post('/perio', status_code=201)
async def create_exam(data: ExamIn, user: User = Depends(current_user)):
    await _own_patient(data.patient_id, user)
    e = await PerioExam.create(
        patient_id=data.patient_id,
        date_str=data.date_str or str(date.today()),
        note=data.note,
    )
    return _exam_fmt(e, [])


@router.put('/perio/{exam_id}/tooth')
async def upsert_measurement(exam_id: int, data: MeasurementIn, user: User = Depends(current_user)):
    await _own_exam(exam_id, user)
    payload = {
        'pockets': _join(data.pockets),
        'recession': _join(data.recession),
        'bleeding': _join(data.bleeding),
        'mobility': data.mobility,
        'furcation': data.furcation,
        'plaque': data.plaque,
    }
    m, created = await PerioMeasurement.get_or_create(
        exam_id=exam_id, tooth_id=data.tooth_id, defaults=payload
    )
    if not created:
        await m.update_from_dict(payload).save()
    return _m_fmt(m)


@router.delete('/perio/{exam_id}', status_code=204)
async def delete_exam(exam_id: int, user: User = Depends(current_user)):
    e = await _own_exam(exam_id, user)
    await e.delete()
