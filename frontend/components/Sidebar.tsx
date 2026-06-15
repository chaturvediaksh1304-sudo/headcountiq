"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/hiring", label: "Hiring Velocity" },
  { href: "/attrition", label: "Attrition & Retention" },
  { href: "/headcount", label: "Headcount by Dept" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] border-r border-line bg-surface px-5 py-7 flex flex-col">
      <div className="mb-9">
        <div className="flex items-center gap-2">
          <span className="h-5 w-[3px] bg-accent" />
          <span className="text-[15px] font-medium tracking-tight">HeadcountIQ</span>
        </div>
        <p className="mt-1 pl-[11px] text-[11px] text-muted">People Systems &amp; Analytics</p>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = path === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-[13px] transition-colors ${
                active
                  ? "bg-white text-ink font-medium border-l-2 border-accent"
                  : "text-muted hover:text-ink hover:bg-white/60"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 text-[11px] text-muted">
        <p>Synthetic data · demo</p>
        <p className="metric">v1.0.0</p>
      </div>
    </aside>
  );
}
