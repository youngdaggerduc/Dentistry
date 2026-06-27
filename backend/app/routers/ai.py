import os
from fastapi import APIRouter, HTTPException, Depends
from app.models import Visit, ClinicalNote, Patient, FlaggedTooth
from app.routers.auth import current_user, User
from app.routers.patients import compute_risk_flags

router = APIRouter(prefix="/api/ai", tags=["ai"])

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8")

# Education-context system prompt. The student always edits before saving — these
# are drafts, not final clinical documentation, and must read that way.
SOAP_SYSTEM = (
    "You are a dental clinical-education assistant helping a dental STUDENT draft "
    "SOAP note sections from charted findings. Produce concise, professional, "
    "clinically appropriate draft text the student will review and edit before "
    "saving. Use standard dental terminology. Never invent findings not supplied. "
    "If information is insufficient, say so briefly rather than fabricating. Output "
    "plain text only — no markdown headings."
)
DDX_SYSTEM = (
    "You are a dental clinical-education assistant. Given a chief complaint and "
    "available context, suggest a short differential diagnosis list a dental "
    "STUDENT can consider. For each, give a one-line rationale and a suggested "
    "next diagnostic step. Be educational and cautious; this is a study aid, not a "
    "diagnosis. Output plain text only."
)


def _client():
    """Lazily build the Anthropic client so the app still boots without a key."""
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(503, "AI features are not configured (missing ANTHROPIC_API_KEY).")
    try:
        from anthropic import AsyncAnthropic
    except ImportError:
        raise HTTPException(503, "AI features unavailable: anthropic SDK not installed.")
    return AsyncAnthropic()


async def _complete(system: str, prompt: str, max_tokens: int = 1200) -> str:
    client = _client()
    try:
        msg = await client.messages.create(
            model=MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
    except HTTPException:
        raise
    except Exception as e:  # network / auth / rate-limit — surface cleanly to the UI
        raise HTTPException(502, f"AI request failed: {e}")
    return "".join(b.text for b in msg.content if getattr(b, "type", None) == "text").strip()


@router.post('/visits/{visit_id}/soap')
async def draft_soap(visit_id: int, data: dict, user: User = Depends(current_user)):
    """Draft Objective/Assessment/Plan from the visit + charted findings.
    Body may include a `subjective` string the student already wrote."""
    v = await Visit.get_or_none(id=visit_id)
    if not v or not await Patient.exists(id=v.patient_id, student_id=user.id):
        raise HTTPException(404)
    patient = await Patient.get(id=v.patient_id)
    teeth = await FlaggedTooth.filter(patient_id=patient.id, deleted_at__isnull=True)

    tooth_lines = [f"- Tooth {t.tooth_id}: {t.note} ({t.severity})" for t in teeth]
    risk = compute_risk_flags(patient)
    risk_lines = [f"- {r['label']}: {r['detail']}" for r in risk]
    subjective = (data.get('subjective') or '').strip()

    prompt = (
        f"Patient: {patient.name}, age {patient.age or 'unknown'}.\n"
        f"Chief complaint: {patient.chief_complaint or 'not recorded'}.\n"
        f"Procedure this visit: {v.procedure or 'not recorded'} "
        f"({v.procedure_category or 'uncategorised'}).\n"
        f"Charted tooth findings:\n" + ("\n".join(tooth_lines) or "- none recorded") + "\n"
        f"Medical risk flags:\n" + ("\n".join(risk_lines) or "- none") + "\n"
        + (f"Student-written Subjective:\n{subjective}\n" if subjective else "")
        + "\nDraft the Objective, Assessment, and Plan sections of a SOAP note. "
        "Return them labelled exactly as:\nOBJECTIVE:\n...\nASSESSMENT:\n...\nPLAN:\n..."
    )
    text = await _complete(SOAP_SYSTEM, prompt)

    # Split the labelled sections back out for the editor.
    sections = {'objective': '', 'assessment': '', 'plan': ''}
    current = None
    for line in text.splitlines():
        upper = line.strip().upper()
        if upper.startswith('OBJECTIVE'):   current = 'objective'; continue
        if upper.startswith('ASSESSMENT'):  current = 'assessment'; continue
        if upper.startswith('PLAN'):         current = 'plan'; continue
        if current:
            sections[current] += (line + '\n')
    sections = {k: v.strip() for k, v in sections.items()}
    if not any(sections.values()):
        sections['assessment'] = text  # fallback: hand back the raw draft
    return sections


@router.post('/differential')
async def differential(data: dict, user: User = Depends(current_user)):
    """Suggest a differential from a chief complaint (+ optional context)."""
    complaint = (data.get('chief_complaint') or '').strip()
    if not complaint:
        raise HTTPException(400, "chief_complaint is required")
    context = (data.get('context') or '').strip()
    prompt = (
        f"Chief complaint: {complaint}\n"
        + (f"Additional context: {context}\n" if context else "")
        + "\nProvide a brief differential diagnosis list (3–5 items)."
    )
    text = await _complete(DDX_SYSTEM, prompt, max_tokens=900)
    return {'differential': text}
