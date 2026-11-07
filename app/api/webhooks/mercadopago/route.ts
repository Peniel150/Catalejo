import { NextResponse } from "next/server";
import { asService, hasDatabase } from "@/lib/server/db.ts";
import { getSubscription, mapStatus, verifyWebhookSignature } from "@/lib/mercadopago.ts";

// Notificaciones de Mercado Pago. Se verifica la firma, se guarda el evento (idempotente)
// y el estado real se consulta a la API: nunca se confía en el cuerpo del webhook.
export async function POST(req: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || !hasDatabase()) return NextResponse.json({ error: "No configurado" }, { status: 503 });
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; data?: { id?: string }; id?: string | number };
  const dataId = url.searchParams.get("data.id") ?? body.data?.id ?? "";
  const ok = verifyWebhookSignature({
    signature: req.headers.get("x-signature"),
    requestId: req.headers.get("x-request-id"),
    dataId: String(dataId),
    secret,
    maxAgeSec: 15 * 60,
  });
  if (!ok) return NextResponse.json({ error: "Firma inválida" }, { status: 401 });

  const type = url.searchParams.get("type") ?? body.type ?? "";
  const eventId = `${type}:${dataId}:${req.headers.get("x-request-id") ?? body.id ?? ""}`;
  return asService(async (sql) => {
    const ins = await sql`insert into webhook_events (provider, event_id, payload) values ('mercadopago', ${eventId}, ${sql.json(body as never)})
      on conflict do nothing returning event_id`;
    if (!ins.length) return NextResponse.json({ ok: true, duplicate: true }); // ya procesado

    try {
      if (type === "subscription_preapproval" && dataId) {
        const sub = await getSubscription(String(dataId));
        const [userId, plan] = sub.external_reference.split(":");
        if (/^[0-9a-f-]{36}$/.test(userId) && (plan === "basic" || plan === "advanced")) {
          const status = mapStatus(sub.status);
          await sql`update subscriptions set provider = 'mercadopago', provider_subscription_id = ${sub.id}, status = ${status},
              plan = ${status === "cancelled" ? "free" : plan}, period = 'monthly',
              current_period_end = ${sub.next_payment_date ?? null}
            where user_id = ${userId}`;
        }
      }
      await sql`update webhook_events set processed_at = now() where provider = 'mercadopago' and event_id = ${eventId}`;
      return NextResponse.json({ ok: true });
    } catch (e) {
      // Se registra el fallo y se libera el evento para que el reintento de Mercado Pago lo procese.
      await sql`insert into job_failures (job, error, context) values ('webhook-mercadopago', ${String(e).slice(0, 1000)}, ${sql.json({ eventId } as never)})`;
      await sql`delete from webhook_events where provider = 'mercadopago' and event_id = ${eventId}`;
      return NextResponse.json({ error: "Error al procesar" }, { status: 500 });
    }
  });
}
