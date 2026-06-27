from fastapi import APIRouter, Depends
from collections import Counter
from datetime import date
from app.models import Patient, Visit, FlaggedTooth, TreatmentPlan, TreatmentStep, CompetencyEntry
from app.routers.auth import current_user, User
from app.routers.competency import REQUIREMENTS

router = APIRouter(prefix="/api", tags=["analytics"])


def _parse(d):
    """Lenient ISO date parse — returns a date or None for garbage/empty."""
    if not d:
        return None
    try:
        return date.fromisoformat(d[:10])
    except (ValueError, TypeError):
        return None


@router.get('/analytics')
async def analytics(user: User = Depends(current_user)):
    patient_ids = await Patient.filter(student_id=user.id).values_list('id', flat=True)
    patient_ids = list(patient_ids)

    visits = await Visit.filter(patient_id__in=patient_ids).all()
    completed = [v for v in visits if v.status == 'completed']

    # ── Cases per month (last 12 months present in data) ──
    month_counts = Counter()
    for v in completed:
        d = _parse(v.date_str)
        if d:
            month_counts[f'{d.year:04d}-{d.month:02d}'] += 1
    cases_per_month = [
        {'month': m, 'count': month_counts[m]} for m in sorted(month_counts)
    ][-12:]

    # ── Most common procedures ──
    proc_counts = Counter(v.procedure for v in completed if v.procedure)
    common_procedures = [
        {'name': name, 'count': n} for name, n in proc_counts.most_common(6)
    ]

    # ── Most common charted conditions ──
    teeth = await FlaggedTooth.filter(patient_id__in=patient_ids).all()
    cond_counts = Counter(t.note for t in teeth if t.note)
    common_conditions = [
        {'condition': c, 'count': n} for c, n in cond_counts.most_common(6)
    ]

    # ── Competency completion timeline (date each category reached its requirement) ──
    visit_ids = [v.id for v in visits]
    entries = list(await CompetencyEntry.filter(visit_id__in=visit_ids).all())
    entries += list(await CompetencyEntry.filter(visit_id__isnull=True).all())
    by_cat = {}
    for e in entries:
        by_cat.setdefault(e.category, []).append(e.date_str)
    competency_timeline = []
    for cat, req in REQUIREMENTS.items():
        dates = sorted(d for d in (_parse(x) for x in by_cat.get(cat, [])) if d)
        completed_on = dates[req - 1].isoformat() if len(dates) >= req else None
        competency_timeline.append({
            'category': cat,
            'required': req,
            'completed': len(dates),
            'completed_on': completed_on,
        })

    # ── Time to close: first visit → last completed treatment-step, per completed plan ──
    first_visit = {}  # patient_id -> earliest visit date
    for v in completed:
        d = _parse(v.date_str)
        if d and (v.patient_id not in first_visit or d < first_visit[v.patient_id]):
            first_visit[v.patient_id] = d

    plans = await TreatmentPlan.filter(patient_id__in=patient_ids, status='completed').all()
    spans = []
    for p in plans:
        start = first_visit.get(p.patient_id)
        if not start:
            continue
        steps = await TreatmentStep.filter(plan_id=p.id).all()
        end_dates = sorted(d for d in (_parse(s.completed_at) for s in steps) if d)
        if end_dates and end_dates[-1] >= start:
            spans.append((end_dates[-1] - start).days)
    avg_time_to_close = round(sum(spans) / len(spans)) if spans else None

    # ── Clinical hours logged, by discipline (from visit durations) ──
    mins_by_cat = Counter()
    total_mins = 0
    for v in completed:
        if v.duration_mins:
            mins_by_cat[v.procedure_category or 'Uncategorised'] += v.duration_mins
            total_mins += v.duration_mins
    clinical_hours = [
        {'category': c, 'hours': round(m / 60, 1)}
        for c, m in sorted(mins_by_cat.items(), key=lambda kv: -kv[1])
    ]

    # ── Self-evaluation: average rating + recent reflections ──
    rated = [v for v in completed if v.self_eval_rating]
    avg_self_eval = round(sum(v.self_eval_rating for v in rated) / len(rated), 1) if rated else None

    return {
        'cases_per_month': cases_per_month,
        'common_procedures': common_procedures,
        'common_conditions': common_conditions,
        'competency_timeline': competency_timeline,
        'avg_time_to_close': avg_time_to_close,
        'closed_plans': len(spans),
        'total_procedures': len(completed),
        'total_patients': len(patient_ids),
        'clinical_hours': clinical_hours,
        'total_hours': round(total_mins / 60, 1),
        'avg_self_eval': avg_self_eval,
        'self_evals_logged': len(rated),
    }
