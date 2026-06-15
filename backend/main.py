"""
HeadcountIQ — FastAPI backend.

Serves KPI JSON for the dashboard, querying the SQL views/tables in Postgres.
Connection string comes from DATABASE_URL (backend/.env locally, Railway env in prod).
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor

load_dotenv(Path(__file__).resolve().parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

# Allow the local dev frontend and any *.vercel.app deploy.
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
EXTRA_ORIGIN = os.getenv("FRONTEND_ORIGIN")
if EXTRA_ORIGIN:
    ALLOWED_ORIGINS.append(EXTRA_ORIGIN)

app = FastAPI(title="HeadcountIQ API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["GET"],
    allow_headers=["*"],
)


@contextmanager
def get_conn():
    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


def query(sql: str, params: tuple = ()) -> list[dict]:
    with get_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def query_one(sql: str, params: tuple = ()) -> dict:
    rows = query(sql, params)
    return rows[0] if rows else {}


# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/overview")
def overview():
    headcount = query_one(
        "SELECT COUNT(*) AS total FROM employees WHERE status = 'active'"
    )["total"]

    attrition = query_one(
        """
        SELECT ROUND(
          100.0 * COUNT(*) FILTER (
            WHERE status = 'terminated'
              AND exit_date >= (CURRENT_DATE - INTERVAL '12 months')
          ) / NULLIF(COUNT(*), 0), 2
        ) AS attrition_rate_pct
        FROM employees
        """
    )["attrition_rate_pct"]

    tth = query_one(
        "SELECT ROUND(AVG(time_to_hire)::numeric, 1) AS avg_days_to_hire "
        "FROM open_roles WHERE status = 'filled'"
    )["avg_days_to_hire"]

    open_roles = query_one(
        "SELECT COUNT(*) AS open_roles FROM open_roles WHERE status = 'open'"
    )["open_roles"]

    # Net headcount change month-over-month from the trend view.
    trend = query(
        "SELECT total_headcount FROM v_headcount_trend ORDER BY snapshot_month DESC LIMIT 2"
    )
    net_change = (trend[0]["total_headcount"] - trend[1]["total_headcount"]) if len(trend) == 2 else 0

    return {
        "total_headcount": headcount,
        "net_headcount_change_mom": net_change,
        "attrition_rate_pct": float(attrition) if attrition is not None else 0.0,
        "avg_time_to_hire_days": float(tth) if tth is not None else 0.0,
        "open_roles": open_roles,
    }


@app.get("/api/headcount/trend")
def headcount_trend():
    return query(
        "SELECT snapshot_month, total_headcount "
        "FROM v_headcount_trend ORDER BY snapshot_month DESC LIMIT 12"
    )[::-1]


@app.get("/api/headcount/dept")
def headcount_dept():
    return query(
        "SELECT department, headcount, male, female, non_binary FROM v_headcount_by_dept"
    )


@app.get("/api/hiring/velocity")
def hiring_velocity():
    return query(
        "SELECT snapshot_month, total_hires "
        "FROM v_headcount_trend ORDER BY snapshot_month DESC LIMIT 12"
    )[::-1]


@app.get("/api/hiring/tth")
def hiring_tth():
    return query(
        "SELECT department, avg_days_to_hire, roles_filled FROM v_avg_time_to_hire"
    )


@app.get("/api/hiring/funnel")
def hiring_funnel():
    return query(
        "SELECT stage, candidates, stage_order FROM hiring_funnel ORDER BY stage_order"
    )


@app.get("/api/attrition/dept")
def attrition_dept():
    return query(
        "SELECT department, exits_12m, total_employees, attrition_rate_pct "
        "FROM v_attrition_by_dept"
    )


@app.get("/api/attrition/tenure")
def attrition_tenure():
    return query(
        """
        SELECT tenure_band, exits_12m, total_employees, attrition_rate_pct
        FROM v_attrition_by_tenure
        ORDER BY CASE tenure_band
          WHEN '0-1yr' THEN 1 WHEN '1-2yr' THEN 2
          WHEN '2-5yr' THEN 3 WHEN '5yr+' THEN 4 ELSE 5 END
        """
    )


@app.get("/api/attrition/trend")
def attrition_trend():
    return query(
        "SELECT snapshot_month, total_exits, retention_rate_pct "
        "FROM v_headcount_trend ORDER BY snapshot_month DESC LIMIT 12"
    )[::-1]
