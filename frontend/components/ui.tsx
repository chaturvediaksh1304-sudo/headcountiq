"use client";

import { useEffect, useState } from "react";

/** Tiny data-loading hook: handles loading / error / data for one fetch fn. */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(String(e.message || e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </header>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-line bg-white p-5 ${className}`}>
      {title && <h3 className="mb-4 text-[13px] font-medium text-muted">{title}</h3>}
      {children}
    </div>
  );
}

/** Wraps chart/section content so loading + error states are consistent. */
export function Async<T>({
  state,
  children,
  height = 260,
}: {
  state: { data: T | null; error: string | null; loading: boolean };
  children: (data: T) => React.ReactNode;
  height?: number;
}) {
  if (state.loading)
    return (
      <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>
        Loading…
      </div>
    );
  if (state.error)
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 text-sm text-danger"
        style={{ height }}
      >
        <span>Couldn’t load data.</span>
        <span className="text-xs text-muted">{state.error}</span>
        <span className="text-xs text-muted">Is the API running at NEXT_PUBLIC_API_URL?</span>
      </div>
    );
  if (!state.data) return null;
  return <>{children(state.data)}</>;
}

export const ACCENT = "#CC0000";
export const INK = "#0A0A0A";
export const MUTED = "#6B6B6B";
export const LINE = "#E5E5E5";
// Categorical palette (Tesla red leads, then neutral-to-warm supporting tones).
export const PALETTE = ["#CC0000", "#0A0A0A", "#6B6B6B", "#D97706", "#16A34A", "#2563EB", "#9333EA", "#0891B2"];
