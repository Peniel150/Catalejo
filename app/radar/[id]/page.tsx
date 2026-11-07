import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import { getProduct } from "@/lib/data.ts";
import { codCalc } from "@/lib/cod.ts";
import { metaAdLibrarySearch, tiktokAdLibrarySearch } from "@/lib/adlinks.ts";
import { fmtCLP, fmtGrowth, fmtInt, fmtPct } from "@/lib/format.ts";
import { DeliveryBadge, DemoNotice, EmptyState, ScoreBadge, Stat, ButtonLink, SaturationText } from "@/components/ui.tsx";
import { BarLineChart } from "@/components/charts.tsx";
import { AdCard } from "@/components/ads.tsx";

type P = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const d = await getProduct((await params).id);
  if (!d) notFound(); // antes de empezar a transmitir la página, para que responda 404
  return { title: d.product.name };
}

export default async function ProductPage({ params, searchParams }: { params: P; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab = "resumen" } = await searchParams;
  const d = await getProduct(id);
  if (!d) notFound();
  const { product: p, supplier, score: s, ads, supplierScore: ss, similar, today } = d;
  const cod = codCalc({ salePrice: p.suggestedPrice, productCost: p.supplierCost, freight: 3990, returnFreight: 3990, otherCostPerOrder: 500, deliveryRate: s.supplierDeliveryRate ?? 0.7 });
  const tabs = [
    { key: "resumen", label: "Resumen" },
    { key: "anuncios", label: `Anuncios (${s.advertisers})` },
    { key: "proveedor", label: "Proveedor" },
  ];

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
        <div className="flex items-center gap-3"><ScoreBadge score={s.score} size="lg" /><span className="text-xs text-text-muted">de 100</span></div>
      </div>
      <DemoNotice />

      <nav aria-label="Secciones del producto" className="mb-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <Link key={t.key} href={`/radar/${p.id}?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined} scroll={false}
            className={`-mb-px border-b-2 px-3 py-2 font-medium ${tab === t.key ? "border-accent text-text" : "border-transparent text-text-muted hover:text-text"}`}>{t.label}</Link>
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
              <h2 id="h-sim" className="mb-3 text-lg font-semibold">Otros productos de {p.category}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {similar.map((r) => (
                  <li key={r.product.id} className="card flex items-center justify-between gap-2 p-3">
                    <Link href={`/radar/${r.product.id}`} className="line-clamp-2 font-medium hover:text-accent">{r.product.name}</Link>
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
            Abre la búsqueda con la extensión de Catalejo activa: cada anuncio que veas en la biblioteca se guarda aquí con su anunciante, dominio y días activo. Catalejo guarda el link, no descarga el creativo.
          </p>
          {ads.length === 0 ? (
            <EmptyState title="Todavía no hay anuncios registrados" body="Abre la búsqueda en la biblioteca de Facebook e Instagram con la extensión activa y vuelve aquí." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ads.slice(0, 12).map((a) => <AdCard key={a.id} ad={a} today={today} />)}</div>
          )}
        </section>
      )}

      {tab === "proveedor" && (
        <section aria-labelledby="h-prov" className="card p-4">
          <h2 id="h-prov" className="mb-1 text-lg font-semibold">{supplier.name}</h2>
          {!ss || ss.ordersN < 20 ? (
            <p className="text-text-muted">Aún no hay suficientes pedidos de este proveedor para medir su entrega (mínimo 20). Sube tus reportes de pedidos de Dropi para aportar.</p>
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
