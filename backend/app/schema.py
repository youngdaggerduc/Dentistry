"""Lightweight additive schema migration for the SQLite dev database.

`generate_schemas=True` (in main.py) creates *new tables* safely but never adds
*new columns* to tables that already exist — that's the classic Tortoise drift
gap. Until the app moves to Postgres + Aerich, this module closes that gap: on
startup it runs idempotent `ALTER TABLE … ADD COLUMN` statements so existing
databases pick up columns added to existing models without losing data.

Each entry is `(table, column, sql_type)`. Adding a column here is the migration.
New *tables* don't belong here — let `generate_schemas` handle those.
"""
from tortoise import Tortoise

# Columns added to pre-existing tables, in order. Safe to re-run; already-present
# columns are skipped.
ADDITIVE_COLUMNS = [
    # Phase 6 — CDT codes + fee estimates on treatment steps
    ("treatment_steps", "cdt_code", "VARCHAR(10)"),
    ("treatment_steps", "tooth",    "VARCHAR(10)"),
    ("treatment_steps", "fee",      "REAL"),
    # Phase 6 — ASA physical-status classification on patients
    ("patients", "asa_classification", "VARCHAR(10)"),
    # Phase 7 — per-visit self-evaluation
    ("visits", "self_eval_rating", "INT"),
    ("visits", "self_eval_note",   "TEXT"),
    # Phase 8 — soft-delete on clinical records
    ("clinical_notes",  "deleted_at", "VARCHAR(30)"),
    ("treatment_steps", "deleted_at", "VARCHAR(30)"),
    ("flagged_teeth",   "deleted_at", "VARCHAR(30)"),
]


async def ensure_schema():
    conn = Tortoise.get_connection("default")

    # Existing columns per table (SQLite pragma).
    for table, column, sql_type in ADDITIVE_COLUMNS:
        try:
            rows = await conn.execute_query_dict(f"PRAGMA table_info('{table}')")
        except Exception:
            # Table doesn't exist yet (fresh DB) — generate_schemas will build it
            # with the column already in the model definition.
            continue
        existing = {r["name"] for r in rows}
        if column in existing:
            continue
        try:
            await conn.execute_script(
                f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}"
            )
        except Exception:
            # Best-effort: a concurrent add or unsupported type shouldn't crash boot.
            pass
