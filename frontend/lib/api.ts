// Fetch wrappers for the HeadcountIQ FastAPI backend.
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Overview = {
  total_headcount: number;
  net_headcount_change_mom: number;
  attrition_rate_pct: number;
  avg_time_to_hire_days: number;
  open_roles: number;
};
export type TrendPoint = { snapshot_month: string; total_headcount: number };
export type HiresPoint = { snapshot_month: string; total_hires: number };
export type ExitsPoint = { snapshot_month: string; total_exits: number; retention_rate_pct: number };
export type DeptHeadcount = {
  department: string; headcount: number; male: number; female: number; non_binary: number;
};
export type DeptTTH = { department: string; avg_days_to_hire: number; roles_filled: number };
export type FunnelStage = { stage: string; candidates: number; stage_order: number };
export type DeptAttrition = {
  department: string; exits_12m: number; total_employees: number; attrition_rate_pct: number;
};
export type TenureAttrition = {
  tenure_band: string; exits_12m: number; total_employees: number; attrition_rate_pct: number;
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  overview: () => get<Overview>("/api/overview"),
  headcountTrend: () => get<TrendPoint[]>("/api/headcount/trend"),
  headcountDept: () => get<DeptHeadcount[]>("/api/headcount/dept"),
  hiringVelocity: () => get<HiresPoint[]>("/api/hiring/velocity"),
  hiringTTH: () => get<DeptTTH[]>("/api/hiring/tth"),
  hiringFunnel: () => get<FunnelStage[]>("/api/hiring/funnel"),
  attritionDept: () => get<DeptAttrition[]>("/api/attrition/dept"),
  attritionTenure: () => get<TenureAttrition[]>("/api/attrition/tenure"),
  attritionTrend: () => get<ExitsPoint[]>("/api/attrition/trend"),
};

// Format an ISO month (YYYY-MM-DD) as "Mon 'YY".
export function fmtMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
