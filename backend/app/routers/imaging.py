import os
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
from app.models import ImageAsset, Patient, Visit
from app.routers.auth import current_user, User

router = APIRouter(prefix="/api", tags=["imaging"])

# Uploads live under backend/uploads and are served at /uploads (mounted in main.py)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")
UPLOAD_DIR = os.path.abspath(UPLOAD_DIR)
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def _fmt(a):
    return {
        'id': a.id,
        'patient_id': a.patient_id,
        'visit_id': a.visit_id,
        'tooth_id': a.tooth_id,
        'kind': a.kind,
        'filename': a.filename,
        'url': f'/uploads/{a.path}',
        'caption': a.caption,
        'created_at': a.created_at.isoformat() if a.created_at else None,
    }


@router.get('/patients/{patient_id}/images')
async def list_images(patient_id: int, user: User = Depends(current_user)):
    if not await Patient.exists(id=patient_id, student_id=user.id):
        raise HTTPException(404)
    images = await ImageAsset.filter(patient_id=patient_id).order_by('-created_at')
    return [_fmt(a) for a in images]


@router.post('/patients/{patient_id}/images', status_code=201)
async def upload_image(
    patient_id: int,
    file: UploadFile = File(...),
    kind: str = Form('radiograph'),
    tooth_id: Optional[str] = Form(None),
    visit_id: Optional[int] = Form(None),
    caption: Optional[str] = Form(None),
    user: User = Depends(current_user),
):
    if not await Patient.exists(id=patient_id, student_id=user.id):
        raise HTTPException(404)
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f'Unsupported file type {ext}')
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(400, 'File too large (max 10 MB)')

    stored = f'{uuid.uuid4().hex}{ext}'
    with open(os.path.join(UPLOAD_DIR, stored), 'wb') as fh:
        fh.write(data)

    asset = await ImageAsset.create(
        patient_id=patient_id,
        visit_id=visit_id,
        tooth_id=tooth_id,
        kind=kind,
        filename=file.filename or stored,
        path=stored,
        caption=caption,
    )
    return _fmt(asset)


@router.delete('/images/{image_id}', status_code=204)
async def delete_image(image_id: int, user: User = Depends(current_user)):
    a = await ImageAsset.get_or_none(id=image_id)
    if not a or not await Patient.exists(id=a.patient_id, student_id=user.id):
        raise HTTPException(404)
    try:
        os.remove(os.path.join(UPLOAD_DIR, a.path))
    except OSError:
        pass
    await a.delete()
