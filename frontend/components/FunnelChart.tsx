"use client";

// Lightweight CSS funnel: centered bars narrowing by stage, with conversion %.
import { FunnelStage } from "@/lib/api";

export default function FunnelChart({ data }: { data: FunnelStage[] }) {
  const stages = [...data].sort((a, b) => a.stage_order - b.stage_order);
  const max = Math.max(...stages.map((s) => s.candidates), 1);

  return (
    <div className="flex flex-col gap-2 py-2">
      {stages.map((s, i) => {
        const pct = (s.candidates / max) * 100;
        const conv = i === 0 ? null : Math.round((s.candidates / stages[i - 1].candidates) * 100);
        return (
          <div key={s.stage} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-right text-[12px] capitalize text-muted">{s.stage}</div>
            <div className="relative h-9 flex-1">
              <div
                className="absolute left-1/2 top-0 flex h-full -translate-x-1/2 items-center justify-center rounded bg-accent text-[12px] font-medium text-white"
                style={{ width: `${pct}%`, opacity: 1 - i * 0.13 }}
              >
                <span className="metric">{s.candidates.toLocaleString()}</span>
              </div>
            </div>
            <div className="w-12 shrink-0 text-[11px] text-muted">
              {conv != null ? <span className="metric">{conv}%</span> : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
