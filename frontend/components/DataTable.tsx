"use client";

import { useMemo, useState } from "react";

export type Column<T> = {
  key: keyof T;
  label: string;
  align?: "left" | "right";
  mono?: boolean;            // render value in monospaced metric font
  render?: (row: T) => React.ReactNode;
};

export default function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
}: {
  rows: T[];
  columns: Column<T>[];
}) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const x = a[sortKey];
      const y = b[sortKey];
      if (typeof x === "number" && typeof y === "number") return asc ? x - y : y - x;
      return asc ? String(x).localeCompare(String(y)) : String(y).localeCompare(String(x));
    });
  }, [rows, sortKey, asc]);

  function toggle(key: keyof T) {
    if (sortKey === key) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[12px] text-muted">
            {columns.map((c) => (
              <th
                key={String(c.key)}
                onClick={() => toggle(c.key)}
                className={`cursor-pointer select-none py-2 pr-4 font-medium hover:text-ink ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.label}
                {sortKey === c.key ? (asc ? " ↑" : " ↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-line/60 last:border-0 hover:bg-surface">
              {columns.map((c) => (
                <td
                  key={String(c.key)}
                  className={`py-2 pr-4 ${c.align === "right" ? "text-right" : "text-left"} ${
                    c.mono ? "metric" : ""
                  }`}
                >
                  {c.render ? c.render(row) : String(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
