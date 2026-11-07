import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Search } from "lucide-react";
import { getCompetitor } from "@/lib/data.ts";
import { metaAdLibraryDomain, metaAdLibrarySearch } from "@/lib/adlinks.ts";
import { DemoNotice, Stat, ButtonLink, EmptyState } from "@/components/ui.tsx";
import { StepChart } from "@/components/charts.tsx";
import { AdCard } from "@/components/ads.tsx";
import { dayDiff } from "@/lib/score.ts";

type P = Promise<{ id: string }>;
export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const c = await getCompetitor((await params).id);
  if (!c) notFound();
  return { title: c.name };
}

export default async function CompetitorPage({ params }: { params: P }) {
  const c = await getCompetitor((await params).id);
  if (!c) notFound();
  const last = c.snapshots.at(-1);
  const newWeek = c.snapshots.slice(-7).reduce((s, x) => s + x.newAds, 0);
  const oldest = c.ads.length ? Math.max(...c.ads.map((a) => dayDiff(a.startedOn, c.today))) : null;
  const stale = last ? dayDiff(last.day, c.today) >= 3 : true;
  return (
    <>
      <Link href="/competidores" className="mb-4 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"><ArrowLeft size={14} aria-hidden="true" />Competidores</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-xl font-bold">{c.name}</h1><p className="text-text-muted">{c.domain} · {c.facebookPageName}</p></div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={c.domain ? metaAdLibraryDomain(c.domain) : metaAdLibrarySearch(c.name)} external variant="primary" size="sm"><Search size={14} aria-hidden="true" />Abrir sus anuncios</ButtonLink>
        </div>
      </div>
      <DemoNotice />
      {stale && <p className="mb-4 rounded-md bg-score-mid-bg px-3 py-2 text-xs text-score-mid" role="status">Hace 3 días o más que no hay datos nuevos. Abre sus anuncios para actualizar.</p>}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Anuncios activos" value={last?.activeAds ?? "—"} hint={last ? `dato del ${last.day}` : undefined} />
        <Stat label="Anuncios nuevos 7d" value={newWeek} hintTone="up" hint={newWeek > 3 ? "está escalando" : undefined} />
        <Stat label="Anuncio más antiguo" value={oldest === null ? "—" : `${oldest} d`} hint="probablemente rentable" />
        <Stat label="Productos de Dropi" value={c.products.length} />
      </section>
      <section className="card mb-6 p-4"><h2 className="mb-3 text-lg font-semibold">Anuncios activos por día</h2><StepChart data={c.snapshots} /></section>
      {c.products.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Qué productos empuja</h2>
          <ul className="flex flex-wrap gap-2">{c.products.map((p) => <li key={p.id}><Link href={`/radar/${p.id}`} className="inline-block rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface">{p.name}</Link></li>)}</ul>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Sus anuncios</h2>
        {c.ads.length === 0 ? <EmptyState title="Sin anuncios registrados" body="Abre su biblioteca de anuncios con la extensión activa." /> :
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{c.ads.slice(0, 12).map((a) => <AdCard key={a.id} ad={a} today={c.today} />)}</div>}
      </section>
    </>
  );
}
