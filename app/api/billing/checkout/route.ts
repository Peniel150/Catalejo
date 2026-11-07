import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/supabase/server.ts";
import { asService, hasDatabase } from "@/lib/server/db.ts";
import { createSubscription } from "@/lib/mercadopago.ts";

const Body = z.object({ plan: z.enum(["basic", "advanced"]) });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.email) return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  const form = await req.formData();
  const parsed = Body.safeParse({ plan: form.get("plan") });
  if (!parsed.success) return NextResponse.json({ error: "Plan inválido." }, { status: 400 });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  try {
    const sub = await createSubscription({ plan: parsed.data.plan, payerEmail: user.email, userId: user.id, backUrl: `${site}/ajustes?pago=1` });
    if (hasDatabase()) {
      await asService((sql) => sql`update subscriptions set provider = 'mercadopago', provider_subscription_id = ${sub.id}, status = 'trialing' where user_id = ${user.id}`);
    }
    return NextResponse.redirect(sub.checkoutUrl, { status: 303 });
  } catch {
    return NextResponse.redirect(new URL("/ajustes?pago=error", req.url), { status: 303 });
  }
}
