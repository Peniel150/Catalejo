import Link from "next/link";
import type { Metadata } from "next";
import { getCompetitors } from "@/lib/data.ts";
import { DemoNotice, EmptyState, PageHeader } from "@/components/ui.tsx";
import { Sparkline } from "@/components/charts.tsx";
import { AddCompetitor } from "./add.tsx";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Competidores" };

export default async function CompetitorsPage() {
  const list = await getCompetitors();
  return (
    <>
      <PageHeader title="Competidores" sub="Sigue sus anuncios: cuántos tienen activos, cuándo lanzan nuevos y qué productos empujan." />
      <DemoNotice />
      <AddCompetitor />
      {list.length === 0 ? (
        <EmptyState title="Aún no sigues a ningún competidor" body="Agrega la página de Facebook, el dominio o la cuenta de TikTok de una tienda que te interese." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const last = c.snapshots.at(-1);
            const week = c.snapshots.slice(-7).reduce((s, x) => s + x.newAds, 0);
            return (
              <li key={c.id} className="card p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/competidores/${c.id}`} className="font-semibold hover:text-accent">{c.name}</Link>
                    <p className="truncate text-xs text-text-muted">{c.domain} · {c.facebookPageName}</p>
                  </div>
                  <Sparkline values={c.snapshots.slice(-14).map((s) => s.activeAds)} label={`Anuncios activos de ${c.name}, últimas 2 semanas`} />
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div><dt className="text-text-muted">Activos</dt><dd className="num text-lg font-semibold">{last?.activeAds ?? "—"}</dd></div>
                  <div><dt className="text-text-muted">Nuevos 7d</dt><dd className={`num text-lg font-semibold ${week > 0 ? "text-success" : ""}`}>{week}</dd></div>
                  <div><dt className="text-text-muted">Último dato</dt><dd className="num">{last?.day.slice(5) ?? "—"}</dd></div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
