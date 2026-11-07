import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/ui.tsx";
import { authEnabled, currentUser, supabaseAdmin } from "@/lib/supabase/server.ts";
import { asService, asUser, hasDatabase, hashToken, newApiToken } from "@/lib/server/db.ts";
import { CopyToken } from "./copy-token.tsx";

export const metadata: Metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

async function toggleShare(formData: FormData) {
  "use server";
  const u = await requireUser();
  const on = formData.get("share") === "on";
  await asUser(u.id, (tx) => tx`update profiles set share_market_signals = ${on}, share_consented_at = ${on ? new Date() : null} where id = ${u.id}`);
  revalidatePath("/ajustes");
}

async function createToken() {
  "use server";
  const u = await requireUser();
  const token = newApiToken();
  await asService((sql) => sql`insert into api_tokens (user_id, token_hash) values (${u.id}, ${hashToken(token)})`);
  // El token se muestra una sola vez, por la URL de esta respuesta no: se pasa en una cookie de un uso.
  const { cookies } = await import("next/headers");
  (await cookies()).set("cat_new_token", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 120, path: "/ajustes" });
  redirect("/ajustes#extension");
}

async function revokeToken(formData: FormData) {
  "use server";
  const u = await requireUser();
  const id = String(formData.get("id"));
  await asUser(u.id, (tx) => tx`update api_tokens set revoked_at = now() where id = ${id} and user_id = ${u.id}`);
  revalidatePath("/ajustes");
}

async function deleteAccount(formData: FormData) {
  "use server";
  const u = await requireUser();
  if (String(formData.get("confirm")).trim().toUpperCase() !== "ELIMINAR") redirect("/ajustes?e=confirmar#cuenta");
  // Borra el usuario de Auth; todas sus tablas caen en cascada (on delete cascade).
  await supabaseAdmin().auth.admin.deleteUser(u.id);
  redirect("/login");
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ pago?: string; cancelado?: string; e?: string }> }) {
  const sp = await searchParams;
  if (!authEnabled() || !hasDatabase()) {
    return (
      <>
        <PageHeader title="Ajustes" />
        <p className="card p-4 text-text-muted">Modo demostración: conecta Supabase (ver README) para activar cuenta, extensión y pagos.</p>
      </>
    );
  }
  const u = await requireUser();
  const data = await asUser(u.id, async (tx) => {
    const [profile] = await tx`select share_market_signals, share_consented_at from profiles where id = ${u.id}`;
    const [sub] = await tx`select plan, status, current_period_end from subscriptions where user_id = ${u.id}`;
    const tokens = await tx`select id, name, created_at, last_used_at from api_tokens where revoked_at is null order by created_at desc`;
    return { profile, sub, tokens };
  });
  const { cookies } = await import("next/headers");
  const newToken = (await cookies()).get("cat_new_token")?.value;
  const planName = { free: "Gratis", basic: "Básico", advanced: "Pro" }[data.sub?.plan as string] ?? "Gratis";

  return (
    <>
      <PageHeader title="Ajustes" sub={u.email} />
      <div className="grid max-w-2xl gap-6">
        {sp.pago === "1" && <p className="card p-3" role="status">Recibimos tu suscripción. Se activa en cuanto Mercado Pago la confirme.</p>}
        {sp.pago === "error" && <p className="card p-3 text-danger" role="alert">No pudimos conectar con Mercado Pago. Intenta de nuevo.</p>}
        {sp.cancelado && <p className="card p-3" role="status">Suscripción cancelada. No se harán más cobros.</p>}

        <section className="card grid gap-3 p-4" aria-labelledby="h-plan">
          <h2 id="h-plan" className="text-lg font-semibold">Tu plan: {planName}</h2>
          {data.sub?.status === "cancelled" && <p className="text-xs text-text-muted">Cancelada{data.sub.current_period_end ? `, activa hasta ${new Date(data.sub.current_period_end).toLocaleDateString("es-CL")}` : ""}.</p>}
          <div className="flex flex-wrap gap-2">
            {data.sub?.plan !== "advanced" && (
              <form action="/api/billing/checkout" method="post"><input type="hidden" name="plan" value="advanced" />
                <button className="h-10 rounded-md bg-accent px-4 font-semibold text-on-accent">Pasar a Pro</button></form>
            )}
            {data.sub?.plan === "free" && (
              <form action="/api/billing/checkout" method="post"><input type="hidden" name="plan" value="basic" />
                <button className="h-10 rounded-md border border-border px-4">Pasar a Básico</button></form>
            )}
            {data.sub?.plan !== "free" && data.sub?.status !== "cancelled" && (
              <form action="/api/billing/cancel" method="post"><button className="h-10 rounded-md border border-border px-4">Cancelar suscripción</button></form>
            )}
          </div>
          <p className="text-xs text-text-muted">Pagos con Mercado Pago. Cancelas en un clic, sin llamadas ni formularios.</p>
        </section>

        <section id="extension" className="card grid gap-3 p-4" aria-labelledby="h-ext">
          <h2 id="h-ext" className="text-lg font-semibold">Extensión de Chrome</h2>
          <p className="text-xs text-text-muted">Crea un código y pégalo en la extensión (ícono de Catalejo → Conectar cuenta). Lo mostramos una sola vez.</p>
          {newToken && <CopyToken token={newToken} />}
          <form action={createToken}><button className="h-10 rounded-md border border-border px-4">Crear código para la extensión</button></form>
          {data.tokens.length > 0 && (
            <ul className="grid gap-2">
              {data.tokens.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-md bg-surface px-3 py-2 text-xs">
                  <span>{t.name} · creado {new Date(t.created_at).toLocaleDateString("es-CL")}{t.last_used_at ? ` · último uso ${new Date(t.last_used_at).toLocaleString("es-CL")}` : " · sin uso"}</span>
                  <form action={revokeToken}><input type="hidden" name="id" value={t.id} /><button className="underline">Revocar</button></form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card grid gap-3 p-4" aria-labelledby="h-share">
          <h2 id="h-share" className="text-lg font-semibold">Compartir señales</h2>
          <form action={toggleShare} className="grid gap-3">
            <label className="flex items-start gap-2">
              <input type="checkbox" name="share" defaultChecked={!!data.profile?.share_market_signals} className="mt-1 accent-accent" />
              <span>Aportar al radar compartido el stock que veo en Dropi y el estado de mis pedidos (entregado, devuelto, región y proveedor). Nunca los datos de mis clientes.
                <span className="block text-xs text-text-muted">Opcional y reversible. Los puntajes de proveedor solo se muestran con 5 o más aportantes, para que nadie pueda identificarte.</span></span>
            </label>
            <button className="h-10 w-fit rounded-md border border-border px-4">Guardar</button>
          </form>
        </section>

        <section id="cuenta" className="card grid gap-3 p-4" aria-labelledby="h-cuenta">
          <h2 id="h-cuenta" className="text-lg font-semibold">Cuenta</h2>
          <form action="/auth/signout" method="post"><button className="h-10 rounded-md border border-border px-4">Cerrar sesión en todos los dispositivos</button></form>
          <form action={deleteAccount} className="grid gap-2 border-t border-border pt-3">
            <label htmlFor="confirm" className="text-xs text-text-muted">Eliminar la cuenta borra para siempre tus productos, pedidos, competidores y aportes. Escribe ELIMINAR para confirmar.</label>
            <input id="confirm" name="confirm" className="input max-w-xs" autoComplete="off" />
            {sp.e === "confirmar" && <p className="text-xs text-danger" role="alert">Escribe ELIMINAR para confirmar.</p>}
            <button className="h-10 w-fit rounded-md bg-danger px-4 font-semibold text-on-accent">Eliminar mi cuenta</button>
          </form>
        </section>
      </div>
    </>
  );
}
