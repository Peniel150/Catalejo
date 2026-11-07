"use client";
import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";
import { PLANS, type Period } from "@/lib/plans.ts";
import { fmtCLP } from "@/lib/format.ts";

export function Pricing() {
  const [period, setPeriod] = useState<Period>("monthly");
  return (
    <div className="grid gap-6">
      <div role="radiogroup" aria-label="Forma de pago" className="inline-flex w-fit rounded-full border border-border p-1">
        {(["monthly", "yearly"] as const).map((p) => (
          <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}
            className={`h-9 rounded-full px-4 text-sm font-medium ${period === p ? "bg-accent text-on-accent" : "text-text-muted"}`}>
            {p === "monthly" ? "Mensual" : "Anual · 2 meses gratis"}
          </button>
        ))}
      </div>
      <ul className="grid gap-4 lg:grid-cols-3">
        {Object.values(PLANS).map((plan) => {
          const price = period === "monthly" ? plan.monthly : plan.yearly;
          const featured = plan.id === "basic";
          return (
            <li key={plan.id} className={`grid content-start gap-4 rounded-lg border p-6 ${featured ? "border-accent shadow-pop" : "border-border"}`}>
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-xs text-text-muted">{plan.forWho}</p>
              </div>
              <p>
                <span className="num text-xl font-bold">{price === 0 ? "$0" : fmtCLP(price)}</span>
                <span className="text-text-muted">{price === 0 ? " para siempre" : period === "monthly" ? " al mes" : " al año"}</span>
                {period === "yearly" && price > 0 && <span className="block text-xs text-text-muted">equivale a {fmtCLP(price / 12)} al mes</span>}
              </p>
              <ul className="grid gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /><span>{f}</span></li>
                ))}
              </ul>
              <Link href={plan.id === "free" ? "/radar" : "/ajustes#plan"}
                className={`inline-flex h-10 items-center justify-center rounded-md px-4 font-semibold ${featured ? "bg-accent text-on-accent" : "border border-border"}`}>
                {plan.id === "free" ? "Empezar gratis" : `Elegir ${plan.name}`}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-text-muted">Precios en pesos chilenos. Reembolso dentro de 14 días si no te sirvió.</p>
    </div>
  );
}
