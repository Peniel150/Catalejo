"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FollowButton, readLocalFollows } from "@/components/follow.tsx";

export type FollowRow = { id: string; name: string; category: string; score: number; units7: number; growth: number | null; stock: number | null;
  restocked: boolean; delivery: number | null; spark: number[]; stockLow: boolean };

export function FollowList({ rows, demo, action }: { rows: FollowRow[]; demo: boolean; action?: (id: string, on: boolean) => Promise<void> }) {
  const [ids, setIds] = useState<string[] | null>(demo ? null : rows.map((r) => r.id));
  useEffect(() => { if (demo) setIds(readLocalFollows()); }, [demo]);
  if (ids === null) return <div className="skeleton h-24" aria-busy="true" />;
  const list = rows.filter((r) => ids.includes(r.id));
  if (!list.length) {
    return (
      <div className="grid place-items-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-base font-semibold">Aún no sigues productos</p>
        <p className="max-w-md text-text-muted">Toca “Seguir” en un producto del radar. Aquí verás si baja el stock, repone o cambia su tendencia.</p>
        <Link href="/radar" className="mt-2 inline-flex h-10 items-center rounded-md bg-accent px-4 font-semibold text-on-accent">Ir al radar</Link>
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {list.map((r) => {
        const notes = [
          r.stockLow && { t: "Stock para menos de una semana", c: "text-score-low bg-score-low-bg" },
          r.restocked && { t: "Repuso stock", c: "text-score-mid bg-score-mid-bg" },
          r.growth !== null && r.growth <= -0.25 && { t: `Ventas ${Math.round(r.growth * 100)}% vs semana anterior`, c: "text-score-low bg-score-low-bg" },
          r.growth !== null && r.growth >= 0.25 && { t: `Ventas +${Math.round(r.growth * 100)}%`, c: "text-score-high bg-score-high-bg" },
        ].filter(Boolean) as { t: string; c: string }[];
        return (
          <li key={r.id} className="card flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/radar/${r.id}`} className="font-semibold hover:text-accent">{r.name}</Link>
              <p className="text-xs text-text-muted">{r.category} · puntaje {r.score} · {r.units7} ventas est. 7d · stock {r.stock ?? "—"}</p>
              {notes.length > 0 && <ul className="mt-2 flex flex-wrap gap-2">{notes.map((n) => <li key={n.t} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${n.c}`}>{n.t}</li>)}</ul>}
            </div>
            <FollowButton productId={r.id} name={r.name} initial action={action} />
          </li>
        );
      })}
    </ul>
  );
}
