"""
HeadcountIQ — incremental monthly refresh.

Recomputes the CURRENT month's snapshot per department directly from the live
`employees` + `open_roles` tables and upserts one row per department. Designed to
run on a schedule (GitHub Actions cron) so the trend charts gain a fresh data point
each month without regenerating the whole dataset.

Usage:
    python etl/refresh_data.py
"""
from __future__ import annotations

import os
from datetime import date
from pathlib import Path


def _database_url() -> str:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")
    url = os.getenv("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL not set (backend/.env or env var).")
    return url


DEPARTMENTS = [
    "Engineering", "Manufacturing", "Sales & Marketing", "Energy",
    "Autopilot / AI", "Finance", "HR & People", "Legal & Compliance",
]


def refresh() -> None:
    import psycopg2

    month_start = date.today().replace(day=1)
    conn = psycopg2.connect(_database_url())
    try:
        with conn.cursor() as cur:
            for dept in DEPARTMENTS:
                cur.execute(
                    """
                    SELECT
                      COUNT(*) FILTER (WHERE status = 'active') AS headcount,
                      COUNT(*) FILTER (WHERE hire_date >= %s)    AS new_hires,
                      COUNT(*) FILTER (WHERE exit_date >= %s)    AS exits
                    FROM employees WHERE department = %s
                    """,
                    (month_start, month_start, dept),
                )
                headcount, new_hires, exits = cur.fetchone()
                cur.execute(
                    "SELECT COUNT(*) FROM open_roles WHERE department = %s AND status = 'open'",
                    (dept,),
                )
                open_roles = cur.fetchone()[0]

                # Upsert: delete any existing row for (month, dept) then insert.
                cur.execute(
                    "DELETE FROM monthly_snapshots WHERE snapshot_month = %s AND department = %s",
                    (month_start, dept),
                )
                cur.execute(
                    "INSERT INTO monthly_snapshots "
                    "(snapshot_month, department, headcount, new_hires, exits, open_roles) "
                    "VALUES (%s, %s, %s, %s, %s, %s)",
                    (month_start, dept, headcount, new_hires, exits, open_roles),
                )
        conn.commit()
        print(f"Refreshed snapshots for {month_start} across {len(DEPARTMENTS)} departments ✅")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    refresh()
