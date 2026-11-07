import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getCategories, getRadar } from "@/lib/data.ts";
import { parseRadarFilters } from "@/lib/params.ts";
import { fmtCLP, fmtInt, fmtPct } from "@/lib/format.ts";
import { DeliveryBadge, DemoNotice, EmptyState, Growth, PageHeader, SaturationText, ScoreBadge, Stat, ButtonLink } from "@/components/ui.tsx";
import { Sparkline } from "@/components/charts.tsx";
import { RadarFilters } from "@/components/filters.tsx";

export const metadata: Metadata = { title: "Radar" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function RadarPage({ searchParams }: { searchParams: SP }) {
  const filters = parseRadarFilters(await searchParams);
  const [{ rows, total }, categories] = await Promise.all([getRadar(filters), getCategories()]);
  const all = (await getRadar()).rows;
  const strong = all.filter((r) => r.score.score >= 70).length;
  const rates = all.map((r) => r.score.supplierDeliveryRate).filter((x): x is number => x !== null);
  const avgDelivery = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  const ads = all.reduce((s, r) => s + r.score.advertisers, 0);

  return (
    <>
      <PageHeader title="Productos que están vendiendo en Dropi" sub="Últimos 7 días en Dropi Chile, ordenados por lo que realmente se entrega." />
      <DemoNotice />
      <section aria-label="Resumen" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Productos observados" value={fmtInt(total)} hint="en el catálogo de Dropi Chile" />
        <Stat label="Puntaje ≥ 70" value={strong} hint={strong === 1 ? "candidato fuerte" : "candidatos fuertes"} />
        <Stat label="Entrega promedio de proveedores" value={fmtPct(avgDelivery)} hint={<Link href="/proveedores" className="underline">ver ranking</Link>} />
        <Stat label="Anunciantes activos observados" value={fmtInt(ads)} hint="Facebook, Instagram y TikTok" />
      </section>
      <Suspense fallback={<div className="skeleton mb-4 h-10" />}><RadarFilters categories={categories} /></Suspense>

      {rows.length === 0 ? (
        <EmptyState title="No hay productos con estos filtros" body="Prueba otra categoría, baja el stock mínimo o quita el filtro de entrega del proveedor." action={<ButtonLink href="/radar" variant="primary">Limpiar filtros</ButtonLink>} />
      ) : (
        <>
          <p className="mb-2 text-xs text-text-muted" aria-live="polite">{rows.length} de {total} productos</p>
          {/* Escritorio: tabla */}
          <div className="card hidden overflow-x-auto md:block" tabIndex={0} role="region" aria-label="Tabla de productos (desplázate a los lados)">
            <table className="w-full min-w-[1180px] border-collapse">
              <caption className="sr-only">Productos ordenados</caption>
              <thead>
                <tr className="bg-surface text-left text-xs text-text-muted">
                  {["Producto", "Puntaje", "Ventas est. 7d", "Efectivas 7d", "Tendencia", "Proveedor · entrega", "Stock", "Anunciantes CL", "Anuncio más antiguo", "Costo / precio sug."].map((h) => (
                    <th key={h} scope="col" className="whitespace-nowrap border-b border-border px-3 py-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ product: p, supplier, score: s }) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="min-w-[17rem] px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-sm bg-surface-2" aria-hidden="true" />
                        <div className="min-w-0">
                          <Link href={`/radar/${p.id}`} className="line-clamp-2 max-w-[16rem] font-semibold hover:text-accent">{p.name}</Link>
                          <div className="text-xs text-text-muted">{p.category}{s.restocked && " · repuso stock"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2"><ScoreBadge score={s.score} /></td>
                    <td className="num px-3 py-2">{fmtInt(s.estUnits7d)}</td>
                    <td className="num px-3 py-2 font-semibold">{s.effectiveUnits7d === null ? <span className="text-text-muted" title="Sin datos suficientes del proveedor">—</span> : fmtInt(s.effectiveUnits7d)}</td>
                    <td className="px-3 py-2"><div className="flex items-center gap-2"><Sparkline values={s.daily.slice(-14).map((d) => d.units)} label={`Ventas de los últimos 14 días de ${p.name}`} /><Growth g={s.growth7d} /></div></td>
                    <td className="whitespace-nowrap px-3 py-2"><span className="mr-2 text-xs">{supplier.name.replace("Proveedor de ejemplo", "Prov.")}</span><DeliveryBadge rate={s.supplierDeliveryRate} /></td>
                    <td className="num px-3 py-2">{s.currentStock === null ? "—" : fmtInt(s.currentStock)}</td>
                    <td className="px-3 py-2"><span className="num mr-2">{s.advertisers}</span><SaturationText value={s.saturation} /></td>
                    <td className="num px-3 py-2">{s.oldestAdDays === null ? "—" : `${s.oldestAdDays} d`}</td>
                    <td className="num whitespace-nowrap px-3 py-2 text-xs">{fmtCLP(p.supplierCost)} / {fmtCLP(p.suggestedPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Móvil: tarjetas */}
          <ul className="grid gap-3 md:hidden">
            {rows.map(({ product: p, score: s }) => (
              <li key={p.id} className="card p-3">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 rounded-sm bg-surface-2" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/radar/${p.id}`} className="line-clamp-2 font-semibold">{p.name}</Link>
                    <div className="text-xs text-text-muted">{p.category}</div>
                  </div>
                  <ScoreBadge score={s.score} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><dt className="text-text-muted">Efectivas 7d</dt><dd className="num font-semibold">{s.effectiveUnits7d ?? "—"}</dd></div>
                  <div><dt className="text-text-muted">Entrega</dt><dd><DeliveryBadge rate={s.supplierDeliveryRate} /></dd></div>
                  <div><dt className="text-text-muted">Anunciantes</dt><dd><span className="num">{s.advertisers}</span> <SaturationText value={s.saturation} /></dd></div>
                </dl>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-text-muted">Ventas estimadas por caída de stock observada. Efectivas = estimadas × tasa de entrega del proveedor. No son ventas confirmadas.</p>
        </>
      )}
    </>
  );
}
