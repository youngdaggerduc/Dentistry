"""Audit logging + soft-delete helpers (Phase 8).

Clinical records (notes, treatment steps, flagged teeth) should leave a trail
rather than vanishing. `log()` writes an AuditLog row; `_fmt_audit` shapes rows
for the API. Soft delete is a `deleted_at` timestamp on the model plus an audit
entry — callers filter `deleted_at__isnull=True` on read.
"""
from datetime import datetime
from app.models import AuditLog


async def log(user_id, entity: str, entity_id: int, action: str, summary: str = None):
    await AuditLog.create(
        user_id=user_id,
        entity=entity,
        entity_id=entity_id,
        action=action,
        summary=summary,
    )


def now_iso() -> str:
    return datetime.utcnow().isoformat()
