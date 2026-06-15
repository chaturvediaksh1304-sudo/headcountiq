-- HeadcountIQ SQL views (KPI transforms). Run AFTER schema.sql.

-- Attrition rate by department (trailing 12 months).
CREATE VIEW v_attrition_by_dept AS
SELECT
  department,
  COUNT(*) FILTER (
    WHERE status = 'terminated'
      AND exit_date >= (CURRENT_DATE - INTERVAL '12 months')
  ) AS exits_12m,
  COUNT(*) AS total_employees,
  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE status = 'terminated'
        AND exit_date >= (CURRENT_DATE - INTERVAL '12 months')
    ) / NULLIF(COUNT(*), 0), 2
  ) AS attrition_rate_pct
FROM employees
GROUP BY department
ORDER BY attrition_rate_pct DESC;

-- Attrition by tenure band (trailing 12 months).
CREATE VIEW v_attrition_by_tenure AS
SELECT
  tenure_band,
  COUNT(*) FILTER (
    WHERE status = 'terminated'
      AND exit_date >= (CURRENT_DATE - INTERVAL '12 months')
  ) AS exits_12m,
  COUNT(*) AS total_employees,
  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE status = 'terminated'
        AND exit_date >= (CURRENT_DATE - INTERVAL '12 months')
    ) / NULLIF(COUNT(*), 0), 2
  ) AS attrition_rate_pct
FROM employees
GROUP BY tenure_band;

-- Average time-to-hire by department (filled roles).
CREATE VIEW v_avg_time_to_hire AS
SELECT
  department,
  ROUND(AVG(time_to_hire)::numeric, 1) AS avg_days_to_hire,
  COUNT(*) FILTER (WHERE status = 'filled') AS roles_filled
FROM open_roles
WHERE status = 'filled'
GROUP BY department
ORDER BY avg_days_to_hire DESC;

-- Current headcount by department (active employees).
CREATE VIEW v_headcount_by_dept AS
SELECT
  department,
  COUNT(*) FILTER (WHERE status = 'active') AS headcount,
  COUNT(*) FILTER (WHERE status = 'active' AND gender = 'Male')   AS male,
  COUNT(*) FILTER (WHERE status = 'active' AND gender = 'Female') AS female,
  COUNT(*) FILTER (WHERE status = 'active' AND gender = 'Non-binary') AS non_binary
FROM employees
GROUP BY department
ORDER BY headcount DESC;

-- Monthly headcount trend (firm-wide, summed across departments).
CREATE VIEW v_headcount_trend AS
SELECT
  snapshot_month,
  SUM(headcount)  AS total_headcount,
  SUM(new_hires)  AS total_hires,
  SUM(exits)      AS total_exits,
  SUM(open_roles) AS total_open_roles,
  ROUND(
    100.0 * (1 - SUM(exits)::numeric / NULLIF(SUM(headcount), 0)), 2
  ) AS retention_rate_pct
FROM monthly_snapshots
GROUP BY snapshot_month
ORDER BY snapshot_month;
