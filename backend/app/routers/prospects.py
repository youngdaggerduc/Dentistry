from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.models import Prospect
from app.routers.auth import current_user, User

router = APIRouter(prefix="/api", tags=["prospects"])

STAGES = ['New lead', 'Contacted', 'Appointment booked', 'Converted']


class ProspectIn(BaseModel):
    name: str
    interest: str
    source: str
    stage: str = 'New lead'


def _fmt(p):
    return {'id': p.id, 'name': p.name, 'interest': p.interest, 'source': p.source, 'stage': p.stage}


@router.get('/prospects')
async def list_prospects(user: User = Depends(current_user)):
    prospects = await Prospect.filter(student_id=user.id).all()
    return [_fmt(p) for p in prospects]


@router.post('/prospects', status_code=201)
async def create_prospect(data: ProspectIn, user: User = Depends(current_user)):
    p = await Prospect.create(student_id=user.id, **data.model_dump())
    return _fmt(p)


@router.patch('/prospects/{prospect_id}/stage')
async def advance_stage(prospect_id: int, stage: str, user: User = Depends(current_user)):
    p = await Prospect.get_or_none(id=prospect_id, student_id=user.id)
    if not p:
        raise HTTPException(404)
    if stage not in STAGES:
        raise HTTPException(400, f"stage must be one of: {STAGES}")
    p.stage = stage
    await p.save()
    return _fmt(p)


@router.put('/prospects/{prospect_id}')
async def update_prospect(prospect_id: int, data: ProspectIn, user: User = Depends(current_user)):
    p = await Prospect.get_or_none(id=prospect_id, student_id=user.id)
    if not p:
        raise HTTPException(404)
    await p.update_from_dict(data.model_dump()).save()
    return _fmt(p)


@router.delete('/prospects/{prospect_id}', status_code=204)
async def delete_prospect(prospect_id: int, user: User = Depends(current_user)):
    p = await Prospect.get_or_none(id=prospect_id, student_id=user.id)
    if not p:
        raise HTTPException(404)
    await p.delete()
