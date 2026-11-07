"use server";
import { revalidatePath } from "next/cache";
import { asUser, hasDatabase } from "@/lib/server/db.ts";
import { currentUser } from "@/lib/supabase/server.ts";
import { getPlan } from "@/lib/data.ts";
import { PLANS, canAdd } from "@/lib/plans.ts";

export async function toggleFollow(productId: string, on: boolean) {
  if (!hasDatabase()) return;
  const u = await currentUser();
  if (!u) throw new Error("Inicia sesión");
  if (!/^[0-9a-f-]{36}$/.test(productId)) throw new Error("Producto inválido");
  if (on) {
    const limit = PLANS[await getPlan()].limits.follows;
    const [{ n }] = await asUser(u.id, (tx) => tx`select count(*)::int as n from tracked_market_products`);
    if (!canAdd(limit, n)) throw new Error(`Tu plan permite seguir ${limit} productos. Pásate a un plan mayor para seguir más.`);
  }
  await asUser(u.id, (tx) =>
    on
      ? tx`insert into tracked_market_products (user_id, market_product_id) values (${u.id}, ${productId}) on conflict do nothing`
      : tx`delete from tracked_market_products where market_product_id = ${productId}`,
  );
  revalidatePath("/seguimiento");
}
