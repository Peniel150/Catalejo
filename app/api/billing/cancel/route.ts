import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server.ts";
import { asService } from "@/lib/server/db.ts";
import { cancelSubscription } from "@/lib/mercadopago.ts";

// Cancelar en un clic: se cancela en Mercado Pago y queda activo hasta el fin del período pagado.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  const [sub] = await asService((sql) => sql`select provider_subscription_id from subscriptions where user_id = ${user.id}`);
  try {
    if (sub?.provider_subscription_id) await cancelSubscription(sub.provider_subscription_id);
    await asService((sql) => sql`update subscriptions set status = 'cancelled' where user_id = ${user.id}`);
    return NextResponse.redirect(new URL("/ajustes?cancelado=1", req.url), { status: 303 });
  } catch {
    return NextResponse.redirect(new URL("/ajustes?pago=error", req.url), { status: 303 });
  }
}
