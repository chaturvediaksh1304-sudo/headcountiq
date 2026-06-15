"use client";

import KPICard from "@/components/KPICard";
import TrendLineChart from "@/components/TrendLineChart";
import TableauEmbed from "@/components/TableauEmbed";
import { Async, Card, PageHeader, useApi } from "@/components/ui";
import { api, fmtMonth } from "@/lib/api";

export default function OverviewPage() {
  const overview = useApi(api.overview);
  const trend = useApi(api.headcountTrend);
  const attrition = useApi(api.attritionTrend);

  return (
    <div>
      <PageHeader title="Overview" subtitle="Executive snapshot of the global workforce." />

      <section className="mb-6">
        <Async state={overview} height={120}>
          {(o) => (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              <KPICard label="Headcount" value={o.total_headcount.toLocaleString()} delta={o.net_headcount_change_mom} />
              <KPICard label="Attrition (12mo)" value={o.attrition_rate_pct} unit="%" />
              <KPICard label="Avg Time-to-Hire" value={o.avg_time_to_hire_days} unit="days" />
              <KPICard label="Open Roles" value={o.open_roles} />
              <KPICard label="Net Change MoM" value={o.net_headcount_change_mom} delta={o.net_headcount_change_mom} />
            </div>
          )}
        </Async>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Headcount trend — trailing 12 months">
          <Async state={trend}>
            {(d) => (
              <TrendLineChart
                data={d.map((p) => ({ ...p, month: fmtMonth(p.snapshot_month) }))}
                xKey="month"
                series={[{ key: "total_headcount", label: "Headcount" }]}
              />
            )}
          </Async>
        </Card>

        <Card title="Retention rate — trailing 12 months">
          <Async state={attrition}>
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

      <section>
        <Card title="Workforce composition (Tableau Public)">
          <TableauEmbed title="Workforce Overview" />
        </Card>
      </section>
    </div>
  );
}
