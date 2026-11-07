// Suscripciones con Mercado Pago (API oficial de "preapproval"), con las credenciales del dueño de Catalejo.
// Las claves viven en variables de entorno; empezar con credenciales de PRUEBA.
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.mercadopago.com";

export type PlanId = "basic" | "advanced";
export type Period = "monthly" | "yearly";
export const MP_PLANS: Record<PlanId, { name: string; env: Record<Period, string> }> = {
  basic: { name: "Catalejo Básico", env: { monthly: "MP_PRICE_BASIC_CLP", yearly: "MP_PRICE_BASIC_YEARLY_CLP" } },
  advanced: { name: "Catalejo Pro", env: { monthly: "MP_PRICE_ADVANCED_CLP", yearly: "MP_PRICE_ADVANCED_YEARLY_CLP" } },
};

function token() {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("Falta MP_ACCESS_TOKEN");
  return t;
}

export async function createSubscription(opts: { plan: PlanId; period: Period; payerEmail: string; userId: string; backUrl: string }) {
  const envName = MP_PLANS[opts.plan].env[opts.period];
  const amount = Number(process.env[envName]);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Falta ${envName}`);
  const res = await fetch(`${API}/preapproval`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token()}` },
    body: JSON.stringify({
      reason: `${MP_PLANS[opts.plan].name} (${opts.period === "yearly" ? "anual" : "mensual"})`,
      external_reference: `${opts.userId}:${opts.plan}:${opts.period}`,
      payer_email: opts.payerEmail,
      back_url: opts.backUrl,
      auto_recurring: { frequency: opts.period === "yearly" ? 12 : 1, frequency_type: "months", transaction_amount: amount, currency_id: "CLP" },
      status: "pending",
    }),
  });
  if (!res.ok) throw new Error(`Mercado Pago respondió ${res.status}`);
  const data = (await res.json()) as { id: string; init_point: string };
  return { id: data.id, checkoutUrl: data.init_point };
}

export async function getSubscription(id: string) {
  const res = await fetch(`${API}/preapproval/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${token()}` } });
  if (!res.ok) throw new Error(`Mercado Pago respondió ${res.status}`);
  return (await res.json()) as { id: string; status: string; external_reference: string; next_payment_date?: string };
}

/** Cancelar en un clic: sin pasos extra ni retención forzada. */
export async function cancelSubscription(id: string) {
  const res = await fetch(`${API}/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: `Bearer ${token()}` },
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!res.ok) throw new Error(`Mercado Pago respondió ${res.status}`);
}

export function mapStatus(mp: string): "active" | "past_due" | "cancelled" | "trialing" {
  if (mp === "authorized") return "active";
  if (mp === "paused") return "past_due";
  if (mp === "cancelled") return "cancelled";
  return "trialing"; // pending
}

/**
 * Verifica la firma del webhook (cabecera x-signature: "ts=...,v1=...").
 * Plantilla firmada: "id:{data.id};request-id:{x-request-id};ts:{ts};" con HMAC-SHA256 y la clave secreta del webhook.
 */
export function verifyWebhookSignature(opts: { signature: string | null; requestId: string | null; dataId: string; secret: string; maxAgeSec?: number; now?: number }) {
  if (!opts.signature) return false;
  const parts = Object.fromEntries(opts.signature.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const ts = parts.ts, v1 = parts.v1;
  if (!ts || !v1) return false;
  const ageSec = ((opts.now ?? Date.now()) - Number(ts) * (ts.length > 10 ? 1 : 1000)) / 1000;
  if (opts.maxAgeSec !== undefined && (!Number.isFinite(ageSec) || ageSec > opts.maxAgeSec)) return false;
  let manifest = `id:${opts.dataId.toLowerCase()};`;
  if (opts.requestId) manifest += `request-id:${opts.requestId};`;
  manifest += `ts:${ts};`;
  const expected = createHmac("sha256", opts.secret).update(manifest).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
