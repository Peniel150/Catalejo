import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authEnabled, supabaseServer, currentUser } from "@/lib/supabase/server.ts";
import { rateLimit } from "@/lib/server/db.ts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar" };

async function sendLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) redirect("/login?e=email");
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`login:${ip}`, 5, 10 * 60_000) || !rateLimit(`login:${email}`, 3, 10 * 60_000)) redirect("/login?e=limite");
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get("host")}`;
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true } });
  redirect(error ? "/login?e=envio" : "/login?ok=1");
}

const msgs: Record<string, string> = {
  email: "Revisa el correo: no parece válido.",
  limite: "Pediste varios enlaces seguidos. Espera unos minutos.",
  envio: "No pudimos enviar el enlace. Intenta de nuevo en un minuto.",
  enlace: "El enlace expiró o ya se usó. Pide uno nuevo.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string; ok?: string }> }) {
  if (!authEnabled()) redirect("/radar");
  if (await currentUser()) redirect("/radar");
  const { e, ok } = await searchParams;
  return (
    <div className="mx-auto grid max-w-sm gap-6 py-12">
      <div>
        <h1 className="text-xl font-bold">Crea tu cuenta y ve qué se vende en Dropi hoy</h1>
        <p className="mt-1 text-text-muted">Te enviamos un enlace para entrar. Sin contraseñas.</p>
      </div>
      {ok ? (
        <p className="card p-4" role="status">Listo. Revisa tu correo y toca el enlace para entrar. Puede tardar un minuto.</p>
      ) : (
        <form action={sendLink} className="card grid gap-3 p-4">
          <label htmlFor="email" className="font-medium">Tu correo</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" aria-describedby={e ? "login-err" : undefined} />
          {e && <p id="login-err" className="text-xs text-danger" role="alert">{msgs[e] ?? msgs.envio}</p>}
          <button type="submit" className="h-10 rounded-md bg-accent font-semibold text-on-accent">Enviarme el enlace</button>
          <p className="text-xs text-text-muted">Al entrar aceptas los <a href="/terminos" className="underline">términos</a> y la <a href="/privacidad" className="underline">política de privacidad</a>.</p>
        </form>
      )}
    </div>
  );
}
