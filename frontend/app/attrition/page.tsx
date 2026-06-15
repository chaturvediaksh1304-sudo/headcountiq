"use client";

import BarChart from "@/components/BarChart";
import TrendLineChart from "@/components/TrendLineChart";
import { Async, Card, PageHeader, useApi } from "@/components/ui";
import { api, fmtMonth } from "@/lib/api";

export default function AttritionPage() {
  const byDept = useApi(api.attritionDept);
  const byTenure = useApi(api.attritionTenure);
  const trend = useApi(api.attritionTrend);

  return (
    <div>
      <PageHeader title="Attrition & Retention" subtitle="Retention-risk signals by department and tenure." />

      {/* Top-3 risk flags */}
      <section className="mb-6">
        <Async state={byDept} height={90}>
          {(d) => {
            const top = [...d].sort((a, b) => b.attrition_rate_pct - a.attrition_rate_pct).slice(0, 3);
            return (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {top.map((r) => (
                  <div key={r.department} className="rounded-lg border border-line border-l-2 border-l-danger bg-white px-5 py-4">
                    <p className="text-[12px] font-medium uppercase tracking-wide text-muted">Risk · {r.department}</p>
                    <p className="metric mt-2 text-[26px] font-medium leading-none text-danger">{r.attrition_rate_pct}%</p>
                    <p className="mt-1 text-[12px] text-muted metric">{r.exits_12m} exits / {r.total_employees}</p>
                  </div>
                ))}
              </div>
            );
          }}
        </Async>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Attrition rate by department (12mo)">
          <Async state={byDept}>
            {(d) => (
              <BarChart data={d} categoryKey="department" valueKey="attrition_rate_pct" layout="horizontal" color="#DC2626" />
            )}
          </Async>
        </Card>

        <Card title="Attrition rate by tenure band (12mo)">
          <Async state={byTenure}>
            {(d) => (
              <BarChart data={d} categoryKey="tenure_band" valueKey="attrition_rate_pct" color="#DC2626" />
            )}
          </Async>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Monthly exits — trailing 12 months">
          <Async state={trend}>
            {(d) => (
              <BarChart
                data={d.map((p) => ({ ...p, month: fmtMonth(p.snapshot_month) }))}
                categoryKey="month"
                valueKey="total_exits"
                color="#D97706"
              />
            )}
          </Async>
        </Card>

        <Card title="Retention rate trend">
          <Async state={trend}>
            {(d) => (
              <TrendLineChart
                data={d.map((p) => ({ ...p, month: fmtMonth(p.snapshot_month) }))}
                xKey="month"
                series={[{ key: "retention_rate_pct", label: "Retention %", color: "#16A34A" }]}
                yDomain={[80, 100]}
              />
            )}
          </Async>
        </Card>
      </section>
    </div>
  );
}
