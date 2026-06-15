-- HeadcountIQ schema
-- Run order: schema.sql first, then views.sql
-- Idempotent: safe to re-run (drops dependent views/tables).

DROP VIEW IF EXISTS v_attrition_by_dept     CASCADE;
DROP VIEW IF EXISTS v_avg_time_to_hire      CASCADE;
DROP VIEW IF EXISTS v_headcount_trend       CASCADE;
DROP VIEW IF EXISTS v_attrition_by_tenure   CASCADE;
DROP VIEW IF EXISTS v_headcount_by_dept     CASCADE;

DROP TABLE IF EXISTS employees        CASCADE;
DROP TABLE IF EXISTS open_roles       CASCADE;
DROP TABLE IF EXISTS monthly_snapshots CASCADE;
DROP TABLE IF EXISTS hiring_funnel    CASCADE;

CREATE TABLE employees (
  id          SERIAL PRIMARY KEY,
  employee_id VARCHAR(10) UNIQUE NOT NULL,
  name        VARCHAR(100),
  department  VARCHAR(50),
  job_title   VARCHAR(100),
  hire_date   DATE,
  exit_date   DATE,                 -- NULL if active
  status      VARCHAR(20),          -- 'active' | 'terminated'
  tenure_band VARCHAR(20),          -- 0-1yr | 1-2yr | 2-5yr | 5yr+ (tenure at exit, or current)
  gender      VARCHAR(20),
  location    VARCHAR(50),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE open_roles (
  id           SERIAL PRIMARY KEY,
  role_title   VARCHAR(100),
  department   VARCHAR(50),
  opened_date  DATE,
  filled_date  DATE,                -- NULL if still open
  time_to_hire INTEGER,             -- days; NULL while open
  status       VARCHAR(20)          -- 'open' | 'filled'
);

CREATE TABLE monthly_snapshots (
  id             SERIAL PRIMARY KEY,
  snapshot_month DATE,              -- first day of month
  department     VARCHAR(50),
  headcount      INTEGER,           -- active at month end
  new_hires      INTEGER,           -- hired during month
  exits          INTEGER,           -- exited during month
  open_roles     INTEGER            -- open at month end
);

-- Recruiting funnel (trailing-12mo aggregate). Not in original spec tables,
-- added to back GET /api/hiring/funnel. stage_order drives display sequence.
CREATE TABLE hiring_funnel (
  id          SERIAL PRIMARY KEY,
  stage       VARCHAR(30),          -- applied | screened | interviewed | offered | hired
  candidates  INTEGER,
  stage_order INTEGER
);

CREATE INDEX idx_emp_dept    ON employees (department);
CREATE INDEX idx_emp_status  ON employees (status);
CREATE INDEX idx_snap_month  ON monthly_snapshots (snapshot_month);
CREATE INDEX idx_roles_dept  ON open_roles (department);
