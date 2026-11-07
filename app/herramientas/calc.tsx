"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { codCalc, type CodInput } from "@/lib/cod.ts";
import { fmtCLP, fmtPct } from "@/lib/format.ts";

const fields: { key: keyof CodInput; label: string; hint?: string; pct?: boolean }[] = [
  { key: "salePrice", label: "Precio de venta al cliente" },
  { key: "productCost", label: "Costo del producto en Dropi" },
  { key: "freight", label: "Flete de ida por pedido" },
  { key: "returnFreight", label: "Flete de devolución", hint: "lo pagas cuando el pedido no se entrega" },
  { key: "otherCostPerOrder", label: "Otros costos por pedido", hint: "comisión de recaudo, empaque" },
  { key: "deliveryRate", label: "Tasa de entrega efectiva (%)", hint: "de cada 100 pedidos despachados, cuántos se cobran", pct: true },
  { key: "cpa", label: "Tu costo por pedido en anuncios (opcional)" },
];

export function CodCalculator() {
  const sp = useSearchParams();
  const num = (k: string, d: number) => {
    const v = Number(sp.get(k));
    return Number.isFinite(v) && v > 0 ? v : d;
  };
  const [v, setV] = useState<Record<string, string>>({
    salePrice: String(num("price", 19990)),
    productCost: String(num("cost", 7000)),
    freight: "3990",
    returnFreight: "3990",
    otherCostPerOrder: "500",
    deliveryRate: String(Math.round(num("delivery", 0.75) * 100)),
    cpa: "",
  });
  const n = (k: string) => Math.max(0, Number(v[k]) || 0);
  const input: CodInput = {
    salePrice: n("salePrice"),
    productCost: n("productCost"),
    freight: n("freight"),
    returnFreight: n("returnFreight"),
    otherCostPerOrder: n("otherCostPerOrder"),
    deliveryRate: Math.min(100, n("deliveryRate")) / 100,
    cpa: v.cpa === "" ? undefined : n("cpa"),
  };
  const r = codCalc(input);
  const at100 = codCalc({ ...input, deliveryRate: 1 });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="card grid gap-4 p-4" onSubmit={(e) => e.preventDefault()} aria-label="Datos del producto">
        {fields.map((f) => (
          <div key={f.key}>
            <label htmlFor={`c-${f.key}`} className="font-medium">{f.label}</label>
            {f.hint && <p id={`h-${f.key}`} className="text-xs text-text-muted">{f.hint}</p>}
            <div className="relative mt-1">
              {!f.pct && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>}
              <input
                id={`c-${f.key}`}
                inputMode="numeric"
                aria-describedby={f.hint ? `h-${f.key}` : undefined}
                className={`input num ${f.pct ? "" : "pl-6"}`}
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value.replace(/[^\d]/g, "") })}
              />
            </div>
          </div>
        ))}
      </form>
      <section className="grid content-start gap-4" aria-live="polite" aria-label="Resultado">
        <div className="card p-4">
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="label">Ganancia por pedido entregado</dt><dd className="num text-xl font-semibold">{fmtCLP(r.profitPerDelivered)}</dd></div>
            <div><dt className="label">Margen sobre venta</dt><dd className="num text-xl font-semibold">{fmtPct(r.marginOnSale)}</dd></div>
            <div><dt className="label">Ganancia esperada por pedido despachado</dt><dd className="num text-xl font-semibold">{fmtCLP(r.expectedProfitPerOrder)}</dd></div>
            <div><dt className="label">CPA máximo para no perder</dt><dd className="num text-xl font-semibold">{fmtCLP(r.breakevenCpa)}</dd></div>
            <div><dt className="label">ROAS mínimo</dt><dd className="num text-xl font-semibold">{Number.isFinite(r.breakevenRoas) ? r.breakevenRoas.toFixed(2) : "no rentable"}</dd></div>
            {r.netPerOrder !== null && (
              <div><dt className="label">Ganancia neta por pedido con tu CPA</dt><dd className={`num text-xl font-semibold ${r.netPerOrder < 0 ? "text-danger" : "text-success"}`}>{fmtCLP(r.netPerOrder)}</dd></div>
            )}
          </dl>
        </div>
        <div className="card p-4 text-xs text-text-muted">
          <p className="mb-1 font-semibold text-text">Lo que te cuestan las devoluciones</p>
          Si entregaras el 100%, podrías pagar hasta <b className="num text-text">{fmtCLP(at100.breakevenCpa)}</b> por pedido. Con {fmtPct(input.deliveryRate)} de entrega, el máximo baja a <b className="num text-text">{fmtCLP(r.breakevenCpa)}</b>.
        </div>
        {r.warnings.map((w) => <p key={w} className="rounded-md bg-score-low-bg px-3 py-2 text-xs text-score-low">{w}</p>)}
      </section>
    </div>
  );
}
