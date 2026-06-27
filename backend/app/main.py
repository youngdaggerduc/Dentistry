import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from tortoise.contrib.fastapi import register_tortoise

from app.config import TORTOISE_ORM
from app.schema import ensure_schema
from app.routers import (
    homepage, auth, patients, appointments, visits,
    treatment_plans, reminders, competency, prospects, seed, search, analytics,
    perio, imaging, ai, history,
)

app = FastAPI(title="Enamel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(homepage.router)
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(appointments.router)
app.include_router(visits.router)
app.include_router(treatment_plans.router)
app.include_router(reminders.router)
app.include_router(competency.router)
app.include_router(prospects.router)
app.include_router(seed.router)
app.include_router(search.router)
app.include_router(analytics.router)
app.include_router(perio.router)
app.include_router(imaging.router)
app.include_router(ai.router)
app.include_router(history.router)

# Serve uploaded radiographs / clinical photos.
_UPLOADS = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(_UPLOADS, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_UPLOADS), name="uploads")

register_tortoise(
    app,
    config=TORTOISE_ORM,
    generate_schemas=True,
    add_exception_handlers=True,
)


@app.on_event("startup")
async def _run_additive_migrations():
    # Runs after register_tortoise has initialised the connection + created any
    # new tables. Adds columns to pre-existing tables (see app/schema.py).
    await ensure_schema()


@app.get("/")
async def root():
    return {"status": "ok"}
