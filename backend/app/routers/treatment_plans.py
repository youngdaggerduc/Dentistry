from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.models import TreatmentPlan, TreatmentStep, Patient
from app.routers.auth import current_user, User

router = APIRouter(prefix="/api", tags=["treatment_plans"])


class PlanIn(BaseModel):
    patient_id: int
    title: str
    status: str = 'active'


class StepIn(BaseModel):
    description: str
    order: int = 0
    status: str = 'pending'
    cdt_code: Optional[str] = None
    tooth: Optional[str] = None
    fee: Optional[float] = None


class StepPatch(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None
    cdt_code: Optional[str] = None
    tooth: Optional[str] = None
    fee: Optional[float] = None


def _step_fmt(s):
    return {
        'id': s.id, 'order': s.order, 'description': s.description, 'status': s.status,
        'completed_at': s.completed_at, 'cdt_code': s.cdt_code, 'tooth': s.tooth, 'fee': s.fee,
    }


def _plan_fmt(p, steps=None):
    steps = steps or []
    estimate = round(sum(s.fee or 0 for s in steps), 2)
    return {
        'id': p.id, 'patient_id': p.patient_id, 'title': p.title, 'status': p.status,
        'estimate': estimate,
        'steps': [_step_fmt(s) for s in steps],
    }


@router.get('/patients/{patient_id}/plans')
async def list_plans(patient_id: int, user: User = Depends(current_user)):
    if not await Patient.exists(id=patient_id, student_id=user.id):
        raise HTTPException(404)
    plans = await TreatmentPlan.filter(patient_id=patient_id).prefetch_related('steps')
    return [_plan_fmt(p, sorted(p.steps, key=lambda s: s.order)) for p in plans]


@router.post('/plans', status_code=201)
async def create_plan(data: PlanIn, user: User = Depends(current_user)):
    if not await Patient.exists(id=data.patient_id, student_id=user.id):
        raise HTTPException(404)
    p = await TreatmentPlan.create(**data.model_dump())
    return _plan_fmt(p, [])


@router.put('/plans/{plan_id}')
async def update_plan(plan_id: int, data: PlanIn, user: User = Depends(current_user)):
    p = await TreatmentPlan.get_or_none(id=plan_id)
    if not p or not await Patient.exists(id=p.patient_id, student_id=user.id):
        raise HTTPException(404)
    p.title = data.title
    p.status = data.status
    await p.save()
    await p.fetch_related('steps')
    return _plan_fmt(p, sorted(p.steps, key=lambda s: s.order))


@router.delete('/plans/{plan_id}', status_code=204)
async def delete_plan(plan_id: int, user: User = Depends(current_user)):
    p = await TreatmentPlan.get_or_none(id=plan_id)
    if not p or not await Patient.exists(id=p.patient_id, student_id=user.id):
        raise HTTPException(404)
    await p.delete()


@router.post('/plans/{plan_id}/steps', status_code=201)
async def add_step(plan_id: int, data: StepIn, user: User = Depends(current_user)):
    p = await TreatmentPlan.get_or_none(id=plan_id)
    if not p or not await Patient.exists(id=p.patient_id, student_id=user.id):
        raise HTTPException(404)
    s = await TreatmentStep.create(plan_id=plan_id, **data.model_dump())
    return _step_fmt(s)


@router.patch('/plans/{plan_id}/steps/{step_id}')
async def update_step(plan_id: int, step_id: int, status: str, user: User = Depends(current_user)):
    from datetime import date
    s = await TreatmentStep.get_or_none(id=step_id, plan_id=plan_id)
    if not s:
        raise HTTPException(404)
    s.status = status
    if status == 'completed' and not s.completed_at:
        s.completed_at = date.today().isoformat()
    elif status != 'completed':
        s.completed_at = None
    await s.save()
    return _step_fmt(s)


@router.put('/plans/{plan_id}/steps/{step_id}')
async def edit_step(plan_id: int, step_id: int, data: StepPatch, user: User = Depends(current_user)):
    """Full-field step edit (description, CDT code, tooth, fee, status)."""
    from datetime import date
    p = await TreatmentPlan.get_or_none(id=plan_id)
    if not p or not await Patient.exists(id=p.patient_id, student_id=user.id):
        raise HTTPException(404)
    s = await TreatmentStep.get_or_none(id=step_id, plan_id=plan_id)
    if not s:
        raise HTTPException(404)
    patch = data.model_dump(exclude_unset=True)
    if 'status' in patch:
        if patch['status'] == 'completed' and not s.completed_at:
            s.completed_at = date.today().isoformat()
        elif patch['status'] != 'completed':
            s.completed_at = None
    await s.update_from_dict(patch).save()
    return _step_fmt(s)


@router.delete('/plans/{plan_id}/steps/{step_id}', status_code=204)
async def delete_step(plan_id: int, step_id: int, user: User = Depends(current_user)):
    s = await TreatmentStep.get_or_none(id=step_id, plan_id=plan_id)
    if not s:
        raise HTTPException(404)
    await s.delete()
