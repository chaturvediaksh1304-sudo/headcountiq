"use client";

import BarChart from "@/components/BarChart";
import DonutChart from "@/components/DonutChart";
import FunnelChart from "@/components/FunnelChart";
import { Async, Card, PageHeader, useApi } from "@/components/ui";
import { api, fmtMonth } from "@/lib/api";

export default function HiringPage() {
  const velocity = useApi(api.hiringVelocity);
  const tth = useApi(api.hiringTTH);
  const funnel = useApi(api.hiringFunnel);

  return (
    <div>
      <PageHeader title="Hiring Velocity" subtitle="Recruiting pipeline speed and volume." />

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Hires per month — trailing 12 months">
          <Async state={velocity}>
            {(d) => (
              <BarChart
                data={d.map((p) => ({ ...p, month: fmtMonth(p.snapshot_month) }))}
                categoryKey="month"
                valueKey="total_hires"
              />
            )}
          </Async>
        </Card>

        <Card title="Avg time-to-hire by department (days)">
          <Async state={tth}>
            {(d) => (
              <BarChart data={d} categoryKey="department" valueKey="avg_days_to_hire" layout="horizontal" />
            )}
          </Async>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Hiring funnel — trailing 12 months">
          <Async state={funnel} height={240}>
            {(d) => <FunnelChart data={d} />}
          </Async>
        </Card>

        <Card title="Roles filled by department">
          <Async state={tth}>
            {(d) => <DonutChart data={d} nameKey="department" valueKey="roles_filled" />}
          </Async>
        </Card>
      </section>
    </div>
  );
}
