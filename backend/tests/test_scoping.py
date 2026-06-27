"""Per-student data-scoping tests — the critical regression surface.

Every query in the app is scoped by the authenticated student's id. These tests
exercise the router coroutines directly against a throwaway SQLite DB, asserting
that student A can never see or mutate student B's records.

Run: pytest tests/ (from backend/, venv active)
"""
import asyncio
import os
import tempfile
import uuid
import functools

import pytest
from fastapi import HTTPException
from tortoise import Tortoise

from app.schema import ensure_schema
from app.models import User, Patient
from app.routers.auth import pwd
from app.routers import patients as patients_router
from app.routers import visits as visits_router
from app.routers import perio as perio_router


def with_db(test):
    """Init a fresh Tortoise DB in one event loop, run the test coroutine, tear down."""
    @functools.wraps(test)
    def wrapper():
        db = os.path.join(tempfile.gettempdir(), f"enamel_pytest_{uuid.uuid4().hex}.sqlite3")

        async def run():
            await Tortoise.init(db_url=f"sqlite://{db}", modules={"models": ["app.models"]})
            await Tortoise.generate_schemas(safe=True)
            await ensure_schema()
            try:
                await test()
            finally:
                await Tortoise.close_connections()

        try:
            asyncio.run(run())
        finally:
            for ext in ("", "-wal", "-shm"):
                try:
                    os.remove(db + ext)
                except OSError:
                    pass
    return wrapper


async def _two_students():
    a = await User.create(name="A", email="a@x.com", hashed_password=pwd.hash("pw"))
    b = await User.create(name="B", email="b@x.com", hashed_password=pwd.hash("pw"))
    pa = await Patient.create(student_id=a.id, name="Amara (A's patient)")
    pb = await Patient.create(student_id=b.id, name="Bilal (B's patient)")
    return a, b, pa, pb


@with_db
async def test_patient_list_is_isolated():
    a, b, pa, pb = await _two_students()
    a_list = await patients_router.list_patients(user=a)
    b_list = await patients_router.list_patients(user=b)
    assert [p["name"] for p in a_list] == ["Amara (A's patient)"]
    assert [p["name"] for p in b_list] == ["Bilal (B's patient)"]


@with_db
async def test_cannot_read_other_students_patient():
    a, b, pa, pb = await _two_students()
    # A reading A's own patient works
    assert (await patients_router.get_patient(pa.id, user=a))["id"] == pa.id
    # A reading B's patient -> 404
    with pytest.raises(HTTPException) as exc:
        await patients_router.get_patient(pb.id, user=a)
    assert exc.value.status_code == 404


@with_db
async def test_cannot_delete_other_students_patient():
    a, b, pa, pb = await _two_students()
    with pytest.raises(HTTPException) as exc:
        await patients_router.delete_patient(pb.id, user=a)
    assert exc.value.status_code == 404
    assert await Patient.exists(id=pb.id)  # still there


@with_db
async def test_cannot_create_visit_for_other_students_patient():
    a, b, pa, pb = await _two_students()
    data = visits_router.VisitIn(patient_id=pb.id, date_str="2026-06-27", procedure="Exam")
    with pytest.raises(HTTPException) as exc:
        await visits_router.create_visit(data, user=a)
    assert exc.value.status_code == 404


@with_db
async def test_cannot_create_perio_for_other_students_patient():
    a, b, pa, pb = await _two_students()
    data = perio_router.ExamIn(patient_id=pb.id)
    with pytest.raises(HTTPException) as exc:
        await perio_router.create_exam(data, user=a)
    assert exc.value.status_code == 404


@with_db
async def test_risk_flags_detect_allergy_and_anticoagulant():
    a = await User.create(name="A", email="a@x.com", hashed_password=pwd.hash("pw"))
    p = await Patient.create(
        student_id=a.id, name="Risky", allergies="Penicillin",
        medications="warfarin 5mg", medical_conditions="Type 2 diabetes",
    )
    flags = patients_router.compute_risk_flags(p)
    labels = {f["label"] for f in flags}
    assert "Allergy" in labels
    assert "Anticoagulant" in labels
    assert "Diabetes" in labels
