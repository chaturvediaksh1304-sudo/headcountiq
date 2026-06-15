// Signature stat card: thin Tesla-red left border, monospaced number.
export default function KPICard({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number; // optional MoM-style change; sign drives color + arrow
}) {
  const deltaColor = delta == null ? "" : delta > 0 ? "text-ok" : delta < 0 ? "text-danger" : "text-muted";
  const arrow = delta == null ? "" : delta > 0 ? "▲" : delta < 0 ? "▼" : "—";
  return (
    <div className="rounded-lg border border-line border-l-2 border-l-accent bg-white px-5 py-4">
      <p className="text-[12px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="metric text-[28px] font-medium leading-none">{value}</span>
        {unit && <span className="metric text-sm text-muted">{unit}</span>}
      </div>
      {delta != null && (
        <p className={`mt-2 text-[12px] ${deltaColor}`}>
          <span className="metric">{arrow} {Math.abs(delta)}</span>
          <span className="text-muted"> vs last month</span>
        </p>
      )}
    </div>
  );
}
