# HeadcountIQ

**Workforce analytics platform for a People Systems & Analytics team** — ingests HR data through a Python ETL pipeline, stores it in PostgreSQL, serves KPIs through a FastAPI backend, and surfaces them in a Next.js dashboard with Recharts (and Tableau Public embeds).

> Live demo: _add Vercel URL after first deploy_

![Tech](https://img.shields.io/badge/Python-3.11-blue) ![Tech](https://img.shields.io/badge/FastAPI-backend-009688) ![Tech](https://img.shields.io/badge/PostgreSQL-Supabase-336791) ![Tech](https://img.shields.io/badge/Next.js-14-black) ![Tech](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF)

---

## What it does

Simulates the internal tooling a People Analytics team operates to track hiring velocity, attrition risk, and headcount planning across a large workforce — the kind of clean, real-time pipeline that replaces ad-hoc spreadsheet exports.

Four dashboard views:

| Route | View | Key metrics |
|---|---|---|
| `/` | Overview | Headcount, net MoM change, 12-mo attrition, avg time-to-hire, open roles |
| `/hiring` | Hiring Velocity | Monthly hires, time-to-hire by dept, hiring funnel, roles filled |
| `/attrition` | Attrition & Retention | Attrition by dept + tenure band, monthly exits, retention trend, risk flags |
| `/headcount` | Headcount by Dept | Headcount + gender distribution by dept, sortable table |

---

## Architecture

```
[Python ETL]  generate_data.py
     |        (employees = source of truth; snapshots derived from it)
     v
[PostgreSQL / Supabase] --- SQL views (attrition, time-to-hire, headcount trend)
     |
     v
[FastAPI backend]  9 JSON endpoints  --->  [GitHub Actions] ---> [Railway]
     |
     v
[Next.js 14 frontend]  Recharts + Tableau embed  --->  [GitHub Actions] ---> [Vercel]
```

**Design choice:** `monthly_snapshots` is *derived* from each employee's hire/exit dates rather than randomly generated, so the rolled-up headcount/hires/exits reconcile with the roster — the same way a real snapshot pipeline rolls up from an event log.

---

## Local setup

**Prerequisites:** Python 3.11+, Node 20+, a PostgreSQL connection string (e.g. a free Supabase project).

```bash
git clone <repo-url> && cd headcountiq

# 1. Backend env
cp backend/.env.example backend/.env      # paste your DATABASE_URL

# 2. Load data (runs migrations, then loads ~500 employees + snapshots)
pip install -r etl/requirements.txt
python etl/generate_data.py               # add --validate to dry-run without a DB

# 3. Backend
pip install -r backend/requirements.txt
cd backend && uvicorn main:app --reload   # http://localhost:8000/docs
cd ..

# 4. Frontend
cd frontend
cp .env.local.example .env.local          # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install && npm run dev                # http://localhost:3000
```

---

## ETL pipeline

`etl/generate_data.py` generates synthetic but coherent HR data with `faker` (seeded for reproducibility):

- **500 employees** across 8 departments, hire dates Jan 2020–present (biased recent to model growth)
- **~18% attrition** with exit dates always after hire date
- **70 open roles**, ~70% filled with realistic time-to-hire (18–95 days)
- **24 months of per-department snapshots**, derived from the roster so totals reconcile
- **Recruiting funnel** back-solved from actual trailing-12-month hires

`etl/refresh_data.py` is an incremental monthly job (GitHub Actions cron) that appends the current month's snapshot per department from the live tables.

Run a no-database dry run to inspect the generated dataset and invariants:

```bash
python etl/generate_data.py --validate
```

---

## API endpoints

All return JSON; CORS allows `localhost:3000` and any `*.vercel.app` origin.

| Method | Path | Returns |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/api/overview` | KPI summary (headcount, net change, attrition, TTH, open roles) |
| GET | `/api/headcount/trend` | Monthly headcount, trailing 12 months |
| GET | `/api/headcount/dept` | Current headcount + gender split by department |
| GET | `/api/hiring/velocity` | Monthly hires, trailing 12 months |
| GET | `/api/hiring/tth` | Avg time-to-hire by department |
| GET | `/api/hiring/funnel` | Hiring funnel stage counts |
| GET | `/api/attrition/dept` | Attrition rate by department (12 mo) |
| GET | `/api/attrition/tenure` | Attrition rate by tenure band (12 mo) |
| GET | `/api/attrition/trend` | Monthly exits + retention rate, trailing 12 months |

---

## Tests

```bash
pytest backend/tests -q
```

- **Structural tests** run anywhere (app boots, all routes registered, `/health`).
- **Integration tests** run when `DATABASE_URL` is set, asserting real KPI invariants (gender splits sum to headcount, funnel narrows monotonically, attrition rates within 0–100%, trend returns 12 chronological months).

---

## CI/CD

`.github/workflows/deploy.yml`, triggered on push/PR to `main`:

1. **lint-and-test** — flake8 (Python), pytest (backend), ESLint + `next build` (frontend)
2. **deploy-backend** — FastAPI → Railway (push to `main` only)
3. **deploy-frontend** — Next.js → Vercel (push to `main` only)

Required GitHub secrets: `SUPABASE_DATABASE_URL`, `RAILWAY_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

---

## Tableau Public

The `<TableauEmbed />` component renders a published Tableau Public viz when given its URL (placeholder until published). Two workbooks: **Workforce Overview** (composition by dept) and **Attrition Analysis** (heatmap by dept × tenure), built from a CSV export of `employees` + `monthly_snapshots`.

---

*Built by Aksh Chaturvedi · June 2026*
