"use server";
import { revalidatePath } from "next/cache";
import { asUser, hasDatabase } from "@/lib/server/db.ts";
import { currentUser } from "@/lib/supabase/server.ts";

export async function toggleFollow(productId: string, on: boolean) {
  if (!hasDatabase()) return;
  const u = await currentUser();
  if (!u) throw new Error("Inicia sesión");
  if (!/^[0-9a-f-]{36}$/.test(productId)) throw new Error("Producto inválido");
  await asUser(u.id, (tx) =>
    on
      ? tx`insert into tracked_market_products (user_id, market_product_id) values (${u.id}, ${productId}) on conflict do nothing`
      : tx`delete from tracked_market_products where market_product_id = ${productId}`,
  );
  revalidatePath("/seguimiento");
}
