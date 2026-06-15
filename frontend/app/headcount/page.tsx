"use client";

import BarChart from "@/components/BarChart";
import DataTable, { Column } from "@/components/DataTable";
import TableauEmbed from "@/components/TableauEmbed";
import { Async, Card, PageHeader, useApi } from "@/components/ui";
import { api, DeptHeadcount } from "@/lib/api";

const columns: Column<DeptHeadcount>[] = [
  { key: "department", label: "Department" },
  { key: "headcount", label: "Headcount", align: "right", mono: true },
  { key: "male", label: "Male", align: "right", mono: true },
  { key: "female", label: "Female", align: "right", mono: true },
  { key: "non_binary", label: "Non-binary", align: "right", mono: true },
];

export default function HeadcountPage() {
  const dept = useApi(api.headcountDept);

  return (
    <div>
      <PageHeader title="Headcount by Department" subtitle="Operational view for workforce planning." />

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Headcount by department">
          <Async state={dept}>
            {(d) => <BarChart data={d} categoryKey="department" valueKey="headcount" multicolor />}
          </Async>
        </Card>

        <Card title="Gender distribution by department">
          <Async state={dept}>
            {(d) => (
              <div className="space-y-2 py-2">
                {d.map((row) => {
                  const total = row.headcount || 1;
                  const seg = (n: number) => `${(n / total) * 100}%`;
                  return (
                    <div key={row.department} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-[12px] text-muted">{row.department}</span>
                      <div className="flex h-5 flex-1 overflow-hidden rounded">
                        <div style={{ width: seg(row.male) }} className="bg-[#0A0A0A]" title={`Male ${row.male}`} />
                        <div style={{ width: seg(row.female) }} className="bg-[#CC0000]" title={`Female ${row.female}`} />
                        <div style={{ width: seg(row.non_binary) }} className="bg-[#6B6B6B]" title={`Non-binary ${row.non_binary}`} />
                      </div>
                      <span className="metric w-8 shrink-0 text-right text-[12px] text-muted">{row.headcount}</span>
                    </div>
                  );
                })}
                <div className="flex gap-4 pt-2 text-[11px] text-muted">
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#0A0A0A]" />Male</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#CC0000]" />Female</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#6B6B6B]" />Non-binary</span>
                </div>
              </div>
            )}
          </Async>
        </Card>
      </section>

      <section className="mb-6">
        <Card title="Headcount table (sortable)">
          <Async state={dept} height={200}>
            {(d) => <DataTable rows={d} columns={columns} />}
          </Async>
        </Card>
      </section>

      <section>
        <Card title="Department breakdown (Tableau Public)">
          <TableauEmbed title="Department Breakdown" />
        </Card>
      </section>
    </div>
  );
}
