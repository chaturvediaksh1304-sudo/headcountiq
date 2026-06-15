"""
HeadcountIQ — synthetic HR data generator + loader.

Design note: `employees` is the source of truth. `monthly_snapshots` is DERIVED
from each employee's hire/exit dates, so headcount/hires/exits reconcile with the
roster instead of being independently random. This is what a real People Analytics
pipeline does (snapshots roll up from an event log).

Usage:
    python etl/generate_data.py --validate     # generate in-memory, print stats, NO database
    python etl/generate_data.py                # generate + run migrations + load into Postgres

Env:
    DATABASE_URL   Postgres connection string (read from backend/.env or process env).
"""
from __future__ import annotations

import argparse
import os
import random
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
from faker import Faker

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SEED = 42
N_EMPLOYEES = 500
N_ROLES = 70
ATTRITION_TARGET = 0.18          # ~18% of all employees have terminated
SNAPSHOT_MONTHS = 24
START_DATE = date(2020, 1, 1)

DEPARTMENTS = [
    "Engineering", "Manufacturing", "Sales & Marketing", "Energy",
    "Autopilot / AI", "Finance", "HR & People", "Legal & Compliance",
]
# Relative size weights — Manufacturing/Engineering are the big orgs.
DEPT_WEIGHTS = [0.22, 0.28, 0.14, 0.10, 0.09, 0.07, 0.06, 0.04]

LOCATIONS = ["Fremont, CA", "Austin, TX", "Reno, NV", "Palo Alto, CA",
             "Buffalo, NY", "Berlin, DE", "Shanghai, CN", "Remote"]
GENDERS = ["Male", "Female", "Non-binary"]
GENDER_WEIGHTS = [0.62, 0.35, 0.03]

TITLES = {
    "Engineering": ["Software Engineer", "Senior Software Engineer", "Staff Engineer", "Engineering Manager"],
    "Manufacturing": ["Production Associate", "Manufacturing Engineer", "Line Supervisor", "Plant Manager"],
    "Sales & Marketing": ["Account Executive", "Marketing Manager", "Growth Analyst", "Brand Designer"],
    "Energy": ["Energy Engineer", "Solar Technician", "Grid Analyst", "Project Manager"],
    "Autopilot / AI": ["ML Engineer", "Research Scientist", "Data Engineer", "AI Infrastructure Engineer"],
    "Finance": ["Financial Analyst", "Accountant", "FP&A Manager", "Controller"],
    "HR & People": ["Recruiter", "People Analytics Analyst", "HRBP", "People Ops Manager"],
    "Legal & Compliance": ["Counsel", "Compliance Analyst", "Paralegal", "Senior Counsel"],
}

FUNNEL_RATIOS = {  # conversion FROM previous stage
    "applied": 1.0, "screened": 0.40, "interviewed": 0.50,
    "offered": 0.50, "hired": 0.80,
}


# ---------------------------------------------------------------------------
# Generation (pure — no DB)
# ---------------------------------------------------------------------------
def _tenure_band(days: int) -> str:
    years = days / 365.25
    if years < 1:
        return "0-1yr"
    if years < 2:
        return "1-2yr"
    if years < 5:
        return "2-5yr"
    return "5yr+"


def generate_employees(today: date) -> pd.DataFrame:
    fake = Faker()
    Faker.seed(SEED)
    random.seed(SEED)

    total_days = (today - START_DATE).days
    rows = []
    n_terminated = int(N_EMPLOYEES * ATTRITION_TARGET)
    terminate_flags = [True] * n_terminated + [False] * (N_EMPLOYEES - n_terminated)
    random.shuffle(terminate_flags)

    for i in range(N_EMPLOYEES):
        dept = random.choices(DEPARTMENTS, weights=DEPT_WEIGHTS, k=1)[0]
        # Bias hire dates toward more recent years (company growth).
        frac = random.random() ** 0.6
        hire_offset = int(frac * total_days)
        hire_date = START_DATE + timedelta(days=hire_offset)

        terminated = terminate_flags[i]
        exit_date = None
        if terminated:
            # Exit between hire+90d and today.
            min_exit = hire_date + timedelta(days=90)
            if min_exit >= today:
                # Hired too recently to have a sensible exit — keep active.
                terminated = False
            else:
                span = (today - min_exit).days
                exit_date = min_exit + timedelta(days=random.randint(0, span))

        end = exit_date if exit_date else today
        tenure_days = (end - hire_date).days
        rows.append({
            "employee_id": f"E{i + 1:05d}",
            "name": fake.name(),
            "department": dept,
            "job_title": random.choice(TITLES[dept]),
            "hire_date": hire_date,
            "exit_date": exit_date,
            "status": "terminated" if terminated else "active",
            "tenure_band": _tenure_band(tenure_days),
            "gender": random.choices(GENDERS, weights=GENDER_WEIGHTS, k=1)[0],
            "location": random.choice(LOCATIONS),
        })
    return pd.DataFrame(rows)


def generate_open_roles(today: date) -> pd.DataFrame:
    random.seed(SEED + 1)
    rows = []
    for i in range(N_ROLES):
        dept = random.choices(DEPARTMENTS, weights=DEPT_WEIGHTS, k=1)[0]
        opened = today - timedelta(days=random.randint(0, 540))
        filled = random.random() < 0.70
        if filled:
            tth = random.randint(18, 95)
            filled_date = opened + timedelta(days=tth)
            if filled_date > today:        # still open if fill would be in the future
                filled, filled_date, tth = False, None, None
        else:
            filled_date, tth = None, None
        rows.append({
            "role_title": random.choice(TITLES[dept]),
            "department": dept,
            "opened_date": opened,
            "filled_date": filled_date,
            "time_to_hire": tth,
            "status": "filled" if filled else "open",
        })
    return pd.DataFrame(rows)


def derive_monthly_snapshots(emp: pd.DataFrame, roles: pd.DataFrame, today: date) -> pd.DataFrame:
    """Roll the employee roster up into per-dept monthly snapshots for the last N months."""
    months = []
    cursor = date(today.year, today.month, 1)
    for _ in range(SNAPSHOT_MONTHS):
        months.append(cursor)
        # step back one month
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    months.reverse()

    hire = pd.to_datetime(emp["hire_date"])
    exit_ = pd.to_datetime(emp["exit_date"])
    r_open = pd.to_datetime(roles["opened_date"])
    r_fill = pd.to_datetime(roles["filled_date"])

    rows = []
    for m_start in months:
        ms = pd.Timestamp(m_start)
        m_end = (ms + pd.offsets.MonthEnd(0)).normalize()
        for dept in DEPARTMENTS:
            d = emp["department"] == dept
            active = d & (hire <= m_end) & (exit_.isna() | (exit_ > m_end))
            new_hires = d & (hire >= ms) & (hire <= m_end)
            exits = d & exit_.notna() & (exit_ >= ms) & (exit_ <= m_end)
            rd = roles["department"] == dept
            open_roles = rd & (r_open <= m_end) & (r_fill.isna() | (r_fill > m_end))
            rows.append({
                "snapshot_month": m_start,
                "department": dept,
                "headcount": int(active.sum()),
                "new_hires": int(new_hires.sum()),
                "exits": int(exits.sum()),
                "open_roles": int(open_roles.sum()),
            })
    return pd.DataFrame(rows)


def derive_funnel(emp: pd.DataFrame, today: date) -> pd.DataFrame:
    """Trailing-12mo recruiting funnel, back-solved from actual hires."""
    cutoff = pd.Timestamp(today - timedelta(days=365))
    hired = int((pd.to_datetime(emp["hire_date"]) >= cutoff).sum())
    # Walk backward up the funnel from hires.
    offered = round(hired / FUNNEL_RATIOS["hired"])
    interviewed = round(offered / FUNNEL_RATIOS["offered"])
    screened = round(interviewed / FUNNEL_RATIOS["interviewed"])
    applied = round(screened / FUNNEL_RATIOS["screened"])
    stages = [
        ("applied", applied, 1), ("screened", screened, 2),
        ("interviewed", interviewed, 3), ("offered", offered, 4),
        ("hired", hired, 5),
    ]
    return pd.DataFrame(stages, columns=["stage", "candidates", "stage_order"])


def generate_all(today: date | None = None) -> dict[str, pd.DataFrame]:
    today = today or date.today()
    emp = generate_employees(today)
    roles = generate_open_roles(today)
    snaps = derive_monthly_snapshots(emp, roles, today)
    funnel = derive_funnel(emp, today)
    return {"employees": emp, "open_roles": roles,
            "monthly_snapshots": snaps, "hiring_funnel": funnel}


# ---------------------------------------------------------------------------
# Validation (no DB)
# ---------------------------------------------------------------------------
def print_validation(data: dict[str, pd.DataFrame], today: date) -> None:
    emp = data["employees"]
    roles = data["open_roles"]
    snaps = data["monthly_snapshots"]
    funnel = data["hiring_funnel"]

    print("=" * 60)
    print("HeadcountIQ ETL — validation (no DB)")
    print("=" * 60)
    print(f"as-of date           : {today}")
    print(f"employees            : {len(emp)}")
    active = (emp['status'] == 'active').sum()
    term = (emp['status'] == 'terminated').sum()
    print(f"  active / terminated: {active} / {term}  ({term / len(emp):.1%} attrition)")
    assert active + term == len(emp), "status counts must sum to total"
    assert emp['employee_id'].is_unique, "employee_id must be unique"
    assert emp['hire_date'].min() >= START_DATE, "hire before START_DATE"
    # exits must be after hire
    term_rows = emp[emp['exit_date'].notna()]
    assert (pd.to_datetime(term_rows['exit_date']) > pd.to_datetime(term_rows['hire_date'])).all(), \
        "every exit_date must be after hire_date"

    print(f"\ndepartments          : {emp['department'].nunique()}")
    print(emp['department'].value_counts().to_string())
    print("\ntenure bands         :")
    print(emp['tenure_band'].value_counts().to_string())

    filled = roles[roles['status'] == 'filled']
    print(f"\nopen_roles           : {len(roles)} ({len(filled)} filled, {len(roles) - len(filled)} open)")
    print(f"  avg time-to-hire   : {filled['time_to_hire'].mean():.1f} days")
    assert (filled['time_to_hire'] > 0).all(), "filled roles need positive TTH"

    print(f"\nmonthly_snapshots    : {len(snaps)} rows "
          f"({snaps['snapshot_month'].nunique()} months x {emp['department'].nunique()} depts)")
    latest = snaps['snapshot_month'].max()
    latest_hc = snaps[snaps['snapshot_month'] == latest]['headcount'].sum()
    print(f"  latest month {latest}: {latest_hc} active (roster active = {active})")
    # Latest snapshot headcount should match the current roster within a small rounding band.
    assert abs(latest_hc - active) <= active * 0.02 + 2, "latest snapshot must reconcile with roster"

    print("\nfunnel (trailing 12mo):")
    print(funnel.to_string(index=False))
    assert (funnel.sort_values('stage_order')['candidates'].is_monotonic_decreasing), \
        "funnel must narrow at each stage"

    print("\nALL VALIDATION CHECKS PASSED ✅")


# ---------------------------------------------------------------------------
# Loading (DB)
# ---------------------------------------------------------------------------
def _load_database_url() -> str:
    from dotenv import load_dotenv
    root = Path(__file__).resolve().parent.parent
    load_dotenv(root / "backend" / ".env")
    url = os.getenv("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL not set (put it in backend/.env or export it).")
    return url


def _run_sql_file(cur, path: Path) -> None:
    cur.execute(path.read_text())


def load_to_postgres(data: dict[str, pd.DataFrame]) -> None:
    import psycopg2
    from psycopg2.extras import execute_values

    url = _load_database_url()
    sql_dir = Path(__file__).resolve().parent.parent / "sql"
    conn = psycopg2.connect(url)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            print("Running migrations (schema.sql, views.sql)...")
            _run_sql_file(cur, sql_dir / "schema.sql")
            _run_sql_file(cur, sql_dir / "views.sql")

            print("Loading employees...")
            emp = data["employees"]
            execute_values(cur,
                "INSERT INTO employees (employee_id, name, department, job_title, hire_date, "
                "exit_date, status, tenure_band, gender, location) VALUES %s",
                [(r.employee_id, r.name, r.department, r.job_title, r.hire_date,
                  r.exit_date, r.status, r.tenure_band, r.gender, r.location)
                 for r in emp.itertuples()])

            print("Loading open_roles...")
            roles = data["open_roles"]
            execute_values(cur,
                "INSERT INTO open_roles (role_title, department, opened_date, filled_date, "
                "time_to_hire, status) VALUES %s",
                [(r.role_title, r.department, r.opened_date, r.filled_date,
                  None if pd.isna(r.time_to_hire) else int(r.time_to_hire), r.status)
                 for r in roles.itertuples()])

            print("Loading monthly_snapshots...")
            snaps = data["monthly_snapshots"]
            execute_values(cur,
                "INSERT INTO monthly_snapshots (snapshot_month, department, headcount, "
                "new_hires, exits, open_roles) VALUES %s",
                [(r.snapshot_month, r.department, r.headcount, r.new_hires, r.exits, r.open_roles)
                 for r in snaps.itertuples()])

            print("Loading hiring_funnel...")
            funnel = data["hiring_funnel"]
            execute_values(cur,
                "INSERT INTO hiring_funnel (stage, candidates, stage_order) VALUES %s",
                [(r.stage, int(r.candidates), int(r.stage_order)) for r in funnel.itertuples()])
        conn.commit()
        print("Load committed ✅")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="HeadcountIQ data generator")
    parser.add_argument("--validate", action="store_true",
                        help="generate + validate in memory, no database write")
    args = parser.parse_args()

    today = date.today()
    data = generate_all(today)

    if args.validate:
        print_validation(data, today)
    else:
        print_validation(data, today)
        load_to_postgres(data)


if __name__ == "__main__":
    main()
