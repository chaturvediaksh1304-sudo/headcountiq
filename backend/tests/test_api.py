"""
Backend tests.

Two tiers:
  * Structural tests run anywhere (no DB) — app boots, all routes registered, /health ok.
  * Integration tests run only when DATABASE_URL is set (against a seeded Postgres) —
    they assert the real KPI shapes and invariants.
"""
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from main import app  # noqa: E402

client = TestClient(app)

HAS_DB = bool(os.getenv("DATABASE_URL"))
needs_db = pytest.mark.skipif(not HAS_DB, reason="DATABASE_URL not set")

EXPECTED_ROUTES = {
    "/health",
    "/api/overview",
    "/api/headcount/trend",
    "/api/headcount/dept",
    "/api/hiring/velocity",
    "/api/hiring/tth",
    "/api/hiring/funnel",
    "/api/attrition/dept",
    "/api/attrition/tenure",
    "/api/attrition/trend",
}


# ---- structural (no DB) ----
def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_all_routes_registered():
    paths = {r.path for r in app.routes}
    assert EXPECTED_ROUTES.issubset(paths), EXPECTED_ROUTES - paths


# ---- integration (need seeded DB) ----
@needs_db
def test_overview_shape():
    r = client.get("/api/overview")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {
        "total_headcount", "net_headcount_change_mom",
        "attrition_rate_pct", "avg_time_to_hire_days", "open_roles",
    }
    assert body["total_headcount"] > 0
    assert 0 <= body["attrition_rate_pct"] <= 100
    assert body["avg_time_to_hire_days"] > 0


@needs_db
def test_trend_returns_12_months():
    r = client.get("/api/headcount/trend")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 12
    months = [row["snapshot_month"] for row in data]
    assert months == sorted(months), "trend must be chronological"


@needs_db
def test_headcount_dept_gender_splits_sum():
    data = client.get("/api/headcount/dept").json()
    assert len(data) == 8
    for row in data:
        assert row["male"] + row["female"] + row["non_binary"] == row["headcount"]


@needs_db
def test_funnel_monotonic_decreasing():
    data = client.get("/api/hiring/funnel").json()
    counts = [row["candidates"] for row in sorted(data, key=lambda x: x["stage_order"])]
    assert counts == sorted(counts, reverse=True)
    assert len(counts) == 5


@needs_db
def test_attrition_rates_in_bounds():
    for path in ("/api/attrition/dept", "/api/attrition/tenure"):
        for row in client.get(path).json():
            assert 0 <= float(row["attrition_rate_pct"]) <= 100


@needs_db
def test_tth_endpoint():
    data = client.get("/api/hiring/tth").json()
    assert len(data) > 0
    for row in data:
        assert row["avg_days_to_hire"] > 0
