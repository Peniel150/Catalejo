// Pantallas de la demo publicada. Mismo contenido que las páginas de la app (app/(app)/...),
// pero renderizadas en el navegador con los datos de ejemplo.
import Link from "next/link";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import { getCategories, getCompetitor, getCompetitors, getProduct, getRadar, getSavedAds, getSuppliers } from "./data.ts";
import { parseRadarFilters } from "@/lib/params.ts";
import { codCalc } from "@/lib/cod.ts";
import { metaAdLibraryDomain, metaAdLibrarySearch, tiktokAdLibrarySearch } from "@/lib/adlinks.ts";
import { fmtCLP, fmtGrowth, fmtInt, fmtPct } from "@/lib/format.ts";
import { dayDiff } from "@/lib/score.ts";
import { ButtonLink, DeliveryBadge, EmptyState, Growth, PageHeader, SaturationText, ScoreBadge, Stat } from "@/components/ui.tsx";
import { BarLineChart, Sparkline, StepChart } from "@/components/charts.tsx";
import { AdCard } from "@/components/ads.tsx";
import { RadarFilters } from "@/components/filters.tsx";
import { FollowButton } from "@/components/follow.tsx";
import { CodCalculator } from "@/app/(app)/herramientas/calc.tsx";
import { AddCompetitor } from "@/app/(app)/competidores/add.tsx";
import { FollowList, type FollowRow } from "@/app/(app)/seguimiento/list.tsx";

export function DemoBanner() {
  return (
    <p className="mb-4 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted" role="note">
      <b className="text-text">Demo de Catalejo con datos de ejemplo.</b> Productos, proveedores y anunciantes son ficticios. Lo que sigues se guarda solo en este navegador.
    </p>
  );
}

export function RadarPage({ search }: { search: string }) {
  const sp = Object.fromEntries(new URLSearchParams(search));
  const { rows, total } = getRadar(parseRadarFilters(sp));
  const all = getRadar().rows;
  const strong = all.filter((r) => r.score.score >= 70).length;
  const rates = all.map((r) => r.score.supplierDeliveryRate).filter((x): x is number => x !== null);
  const avgDelivery = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  const ads = all.reduce((s, r) => s + r.score.advertisers, 0);
  return (
    <>
      <PageHeader title="Productos que están vendiendo en Dropi" sub="Últimos 7 días en Dropi Chile, ordenados por lo que realmente se entrega." />
      <DemoBanner />
      <section aria-label="Resumen" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Productos observados" value={fmtInt(total)} hint="en el catálogo de Dropi Chile" />
        <Stat label="Puntaje ≥ 70" value={strong} hint={strong === 1 ? "candidato fuerte" : "candidatos fuertes"} />
        <Stat label="Entrega promedio de proveedores" value={fmtPct(avgDelivery)} hint={<Link href="/proveedores" className="underline">ver ranking</Link>} />
        <Stat label="Anunciantes activos observados" value={fmtInt(ads)} hint="Facebook, Instagram y TikTok" />
      </section>
      <RadarFilters categories={getCategories()} />
      {rows.length === 0 ? (
        <EmptyState title="No hay productos con estos filtros" body="Prueba otra categoría, baja el stock mínimo o quita el filtro de entrega del proveedor." action={<ButtonLink href="/radar" variant="primary">Limpiar filtros</ButtonLink>} />
      ) : (
        <>
          <p className="mb-2 text-xs text-text-muted" aria-live="polite">{rows.length} de {total} productos</p>
          <div className="card hidden overflow-x-auto md:block" tabIndex={0} role="region" aria-label="Tabla de productos (desplázate a los lados)">
            <table className="w-full min-w-[1280px] border-collapse">
              <caption className="sr-only">Productos ordenados</caption>
              <thead>
                <tr className="bg-surface text-left text-xs text-text-muted">
                  {["Producto", "Puntaje", "Ventas est. 7d", "Efectivas 7d", "Tendencia", "Proveedor · entrega", "Stock", "Anunciantes CL", "Anuncio más antiguo", "Costo / precio sug.", "Seguir"].map((h) => (
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
                    <td className="px-3 py-2"><FollowButton productId={p.id} name={p.name} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <div className="mt-2"><FollowButton productId={p.id} name={p.name} /></div>
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

export function ProductPage({ id, search }: { id: string; search: string }) {
  const tab = new URLSearchParams(search).get("tab") ?? "resumen";
  const d = getProduct(id);
  if (!d) return <EmptyState title="No encontramos este producto" body="Puede que ya no esté en el catálogo." action={<ButtonLink href="/radar" variant="primary">Volver al radar</ButtonLink>} />;
  const { product: p, supplier, score: s, ads, supplierScore: ss, similar, today } = d;
  const cod = codCalc({ salePrice: p.suggestedPrice, productCost: p.supplierCost, freight: 3990, returnFreight: 3990, otherCostPerOrder: 500, deliveryRate: s.supplierDeliveryRate ?? 0.7 });
  const tabs = [{ key: "resumen", label: "Resumen" }, { key: "anuncios", label: `Anuncios (${s.advertisers})` }, { key: "proveedor", label: "Proveedor" }];
  return (
    <>
      <Link href="/radar" className="mb-4 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"><ArrowLeft size={14} aria-hidden="true" />Volver al radar</Link>
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <div className="h-20 w-20 shrink-0 rounded-md bg-surface-2" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{p.name}</h1>
          <p className="mt-1 text-text-muted">{p.category} · {supplier.name} · en catálogo desde {p.listedOn}</p>
          <p className="mt-1 text-xs text-text-muted">{s.daysObserved} días observados{s.restocked && " · repuso stock en las últimas 2 semanas"}</p>
        </div>
        <div className="flex items-center gap-3">
          <FollowButton productId={p.id} name={p.name} size="md" />
          <ScoreBadge score={s.score} size="lg" /><span className="text-xs text-text-muted">de 100</span>
        </div>
      </div>
      <DemoBanner />
      <nav aria-label="Secciones del producto" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <Link key={t.key} href={`/radar/${p.id}?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined} scroll={false}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 font-medium ${tab === t.key ? "border-accent text-text" : "border-transparent text-text-muted hover:text-text"}`}>{t.label}</Link>
        ))}
      </nav>

      {tab === "resumen" && (
        <div className="grid gap-6">
          <section aria-label="Métricas" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Ventas estimadas 7d" value={fmtInt(s.estUnits7d)} hint={`${fmtGrowth(s.growth7d)} vs semana anterior`} hintTone={s.growth7d === null || s.growth7d >= 0 ? "up" : "down"} />
            <Stat label="Ventas efectivas 7d" value={s.effectiveUnits7d === null ? "—" : fmtInt(s.effectiveUnits7d)} hint={s.supplierDeliveryRate === null ? "proveedor sin datos suficientes" : `entrega ${fmtPct(s.supplierDeliveryRate)}`} />
            <Stat label="Ventas estimadas 30d" value={fmtInt(s.estUnits30d)} />
            <Stat label="Stock actual" value={s.currentStock === null ? "—" : fmtInt(s.currentStock)} hint={s.currentStock !== null && s.estUnits7d > 0 ? `≈ ${Math.max(0, Math.round(s.currentStock / (s.estUnits7d / 7)))} días de venta` : undefined} />
          </section>
          <section className="card p-4" aria-labelledby="h-curva">
            <h2 id="h-curva" className="mb-3 text-lg font-semibold">Ventas y stock</h2>
            <BarLineChart data={s.daily.slice(-30)} />
            <p className="mt-2 text-xs text-text-muted">Estimado a partir de la caída de stock observada. No son ventas confirmadas.</p>
          </section>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-4" aria-labelledby="h-puntaje">
              <h2 id="h-puntaje" className="mb-3 text-lg font-semibold">Por qué tiene {s.score} puntos</h2>
              <ul className="grid gap-2">
                {s.components.map((c) => (
                  <li key={c.key} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
                    <div><div className="font-medium">{c.label}</div><div className="text-xs text-text-muted">{c.detail}</div></div>
                    <span className={`num font-semibold ${c.points > 0 ? "text-success" : c.points < 0 ? "text-danger" : "text-text-muted"}`}>{c.points > 0 ? "+" : ""}{c.points}</span>
                  </li>
                ))}
                <li className="flex justify-between text-xs text-text-muted"><span>Base</span><span className="num">+10</span></li>
              </ul>
            </section>
            <section className="card p-4" aria-labelledby="h-cod">
              <h2 id="h-cod" className="mb-1 text-lg font-semibold">¿Es rentable en contra entrega?</h2>
              <p className="mb-3 text-xs text-text-muted">Con precio sugerido {fmtCLP(p.suggestedPrice)}, flete {fmtCLP(3990)} ida y vuelta y entrega {fmtPct(s.supplierDeliveryRate ?? 0.7)}.</p>
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="label">Ganancia por pedido entregado</dt><dd className="num text-lg font-semibold">{fmtCLP(cod.profitPerDelivered)}</dd></div>
                <div><dt className="label">Ganancia esperada por pedido</dt><dd className="num text-lg font-semibold">{fmtCLP(cod.expectedProfitPerOrder)}</dd></div>
                <div><dt className="label">CPA máximo para no perder</dt><dd className="num text-lg font-semibold">{fmtCLP(cod.breakevenCpa)}</dd></div>
                <div><dt className="label">ROAS mínimo</dt><dd className="num text-lg font-semibold">{Number.isFinite(cod.breakevenRoas) ? cod.breakevenRoas.toFixed(2) : "no rentable"}</dd></div>
              </dl>
              {cod.warnings.map((w) => <p key={w} className="mt-3 rounded-md bg-score-low-bg px-3 py-2 text-xs text-score-low" role="status">{w}</p>)}
              <div className="mt-3"><ButtonLink href={`/herramientas?price=${p.suggestedPrice}&cost=${p.supplierCost}&delivery=${s.supplierDeliveryRate ?? 0.7}`} size="sm" variant="ghost">Ajustar en la calculadora</ButtonLink></div>
            </section>
          </div>
          {similar.length > 0 && (
            <section aria-labelledby="h-sim">
              <h2 id="h-sim" className="mb-1 text-lg font-semibold">Productos parecidos</h2>
              <p className="mb-3 text-xs text-text-muted">Mismo producto con otro nombre u otro proveedor, y otros de {p.category}. Compara su entrega antes de elegir proveedor.</p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {similar.map((r) => (
                  <li key={r.product.id} className="card flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <Link href={`/radar/${r.product.id}`} className="line-clamp-2 font-medium hover:text-accent">{r.product.name}</Link>
                      <p className="text-xs text-text-muted">{r.nameMatch >= 0.25 ? "mismo producto, probable · " : ""}entrega <DeliveryBadge rate={r.score.supplierDeliveryRate} /></p>
                    </div>
                    <ScoreBadge score={r.score.score} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {tab === "anuncios" && (
        <section aria-labelledby="h-ads">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="h-ads" className="text-lg font-semibold">Anuncios de la competencia</h2>
              <p className="text-xs text-text-muted">{s.advertisers} anunciantes activos en Chile · <SaturationText value={s.saturation} />{s.oldestAdDays !== null && ` · el más antiguo lleva ${s.oldestAdDays} días`}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={metaAdLibrarySearch(p.name)} external variant="primary" size="sm"><Search size={14} aria-hidden="true" />Buscar en Facebook e Instagram</ButtonLink>
              <ButtonLink href={tiktokAdLibrarySearch(p.name)} external variant="secondary" size="sm"><ExternalLink size={14} aria-hidden="true" />Buscar en TikTok</ButtonLink>
            </div>
          </div>
          <p className="mb-4 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted">
            Los botones abren la biblioteca pública de anuncios real, filtrada por Chile. Con la extensión de Catalejo activa, cada anuncio que veas allá se guarda aquí. En esta demo los anunciantes son ficticios.
          </p>
          {ads.length === 0 ? <EmptyState title="Todavía no hay anuncios registrados" body="Abre la búsqueda en la biblioteca con la extensión activa y vuelve aquí." /> :
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ads.slice(0, 12).map((a) => <AdCard key={a.id} ad={a} today={today} />)}</div>}
        </section>
      )}

      {tab === "proveedor" && (
        <section aria-labelledby="h-prov" className="card p-4">
          <h2 id="h-prov" className="mb-1 text-lg font-semibold">{supplier.name}</h2>
          {!ss || ss.ordersN < 20 ? (
            <p className="text-text-muted">Aún no hay suficientes pedidos de este proveedor para medir su entrega (mínimo 20).</p>
          ) : (
            <>
              <p className="mb-4 text-xs text-text-muted">Calculado con {fmtInt(ss.ordersN)} pedidos de {ss.contributorsN} dropshippers que comparten sus reportes.</p>
              <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div><dt className="label">Entrega efectiva</dt><dd className="mt-1"><DeliveryBadge rate={ss.deliveryRate} /></dd></div>
                <div><dt className="label">Devoluciones</dt><dd className="num mt-1 text-lg font-semibold">{fmtPct(ss.returnRate)}</dd></div>
                <div><dt className="label">Despacho promedio</dt><dd className="num mt-1 text-lg font-semibold">{ss.avgDispatchHours} h</dd></div>
                <div><dt className="label">Pedidos analizados</dt><dd className="num mt-1 text-lg font-semibold">{fmtInt(ss.ordersN)}</dd></div>
              </dl>
            </>
          )}
          <div className="mt-4"><ButtonLink href="/proveedores" size="sm" variant="ghost">Ver ranking de proveedores</ButtonLink></div>
        </section>
      )}
    </>
  );
}

export function SuppliersPage() {
  const list = getSuppliers();
  return (
    <>
      <PageHeader title="Proveedores que entregan" sub="Entrega efectiva, devoluciones y tiempo de despacho de cada proveedor de Dropi Chile." />
      <DemoBanner />
      <p className="mb-4 text-xs text-text-muted">Se calcula con los reportes de pedidos que los dropshippers suben desde su cuenta de Dropi, con su permiso. Un proveedor aparece medido desde 20 pedidos; antes, verás “s/d”.</p>
      <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de proveedores (desplázate a los lados)">
        <table className="w-full min-w-[720px] border-collapse">
          <caption className="sr-only">Ranking de proveedores por entrega efectiva</caption>
          <thead><tr className="bg-surface text-left text-xs text-text-muted">
            {["#", "Proveedor", "Entrega efectiva", "Devoluciones", "Despacho promedio", "Pedidos analizados", "Productos en radar"].map((h) => <th key={h} scope="col" className="border-b border-border px-3 py-2 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {list.map(({ supplier, score, products }, i) => {
              const ok = score.ordersN >= 20;
              return (
                <tr key={supplier.id} className="border-b border-border last:border-0">
                  <td className="num px-3 py-2 text-text-muted">{ok ? i + 1 : "—"}</td>
                  <td className="px-3 py-2 font-medium">{supplier.name}</td>
                  <td className="px-3 py-2"><DeliveryBadge rate={ok ? score.deliveryRate : null} /></td>
                  <td className="num px-3 py-2">{ok ? fmtPct(score.returnRate) : "—"}</td>
                  <td className="num px-3 py-2">{ok ? `${score.avgDispatchHours} h` : "—"}</td>
                  <td className="num px-3 py-2">{fmtInt(score.ordersN)}{!ok && <span className="ml-2 text-xs text-text-muted">(pocos datos)</span>}</td>
                  <td className="num px-3 py-2">{products}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function CompetitorsPage() {
  const list = getCompetitors();
  return (
    <>
      <PageHeader title="Competidores" sub="Sigue sus anuncios: cuántos tienen activos, cuándo lanzan nuevos y qué productos empujan." />
      <DemoBanner />
      <AddCompetitor />
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
    </>
  );
}

export function CompetitorPage({ id }: { id: string }) {
  const c = getCompetitor(id);
  if (!c) return <EmptyState title="No encontramos este competidor" body="Vuelve a la lista." action={<ButtonLink href="/competidores" variant="primary">Competidores</ButtonLink>} />;
  const last = c.snapshots.at(-1);
  const newWeek = c.snapshots.slice(-7).reduce((s, x) => s + x.newAds, 0);
  const oldest = c.ads.length ? Math.max(...c.ads.map((a) => dayDiff(a.startedOn, c.today))) : null;
  return (
    <>
      <Link href="/competidores" className="mb-4 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"><ArrowLeft size={14} aria-hidden="true" />Competidores</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-xl font-bold">{c.name}</h1><p className="text-text-muted">{c.domain} · {c.facebookPageName}</p></div>
        <ButtonLink href={c.domain ? metaAdLibraryDomain(c.domain) : metaAdLibrarySearch(c.name)} external variant="primary" size="sm"><Search size={14} aria-hidden="true" />Abrir sus anuncios</ButtonLink>
      </div>
      <DemoBanner />
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

export function SavedAdsPage() {
  const saved = getSavedAds();
  const today = getRadar().today;
  return (
    <>
      <PageHeader title="Anuncios guardados" sub="Tu tablero de referencias: anuncios que te sirvieron de inspiración, con tus notas." />
      <DemoBanner />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {saved.map((s) => (
          <div key={s.adId}>
            <AdCard ad={s.ad} today={today} note={s.note} />
            <p className="mt-1 px-1 text-xs text-text-muted">{s.productName ?? s.competitorName ?? ""} · guardado {s.savedAt}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-text-muted">Los creativos pertenecen a sus anunciantes. Úsalos como referencia, no los copies.</p>
    </>
  );
}

export function FollowPage() {
  const rows: FollowRow[] = getRadar().rows.map(({ product: p, score: s }) => ({
    id: p.id, name: p.name, category: p.category, score: s.score, units7: s.estUnits7d, growth: s.growth7d,
    stock: s.currentStock, restocked: s.restocked, delivery: s.supplierDeliveryRate, spark: s.daily.slice(-14).map((d) => d.units),
    stockLow: s.currentStock !== null && s.estUnits7d > 0 && s.currentStock < s.estUnits7d,
  }));
  return (
    <>
      <PageHeader title="Seguimiento" sub="Productos que sigues, con avisos de stock bajo, reposición y cambios de tendencia." />
      <FollowList rows={rows} demo />
    </>
  );
}

export function CalcPage() {
  return (
    <>
      <PageHeader title="Calculadora de contra entrega" sub="Cuánto ganas de verdad cuando una parte de los pedidos no se entrega." />
      <CodCalculator />
    </>
  );
}

export function NotInDemo({ title, body }: { title: string; body: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState title="Disponible con tu cuenta" body={body} action={<ButtonLink href="/radar" variant="primary">Volver al radar</ButtonLink>} />
    </>
  );
}
