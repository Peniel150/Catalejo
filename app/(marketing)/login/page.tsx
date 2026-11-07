import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { authEnabled, supabaseServer, supabaseMailer, currentUser } from "@/lib/supabase/server.ts";
import { rateLimit } from "@/lib/server/db.ts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar" };

// El correo que pidió el acceso se guarda unos minutos en una cookie (no en la URL),
// para poder verificar el código de 6 dígitos sin volver a escribirlo.
const EMAIL_COOKIE = "cat_login_email";

async function sendLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) redirect("/login?e=email");
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`login:${ip}`, 5, 10 * 60_000) || !rateLimit(`login:${email}`, 3, 10 * 60_000)) redirect("/login?e=limite");
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get("host")}`;
  const sb = supabaseMailer();
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/entrar`, shouldCreateUser: true } });
  if (error) redirect(error.status === 429 ? "/login?e=limite" : "/login?e=envio");
  (await cookies()).set(EMAIL_COOKIE, email, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 30, path: "/login" });
  redirect("/login?ok=1");
}

async function verifyCode(formData: FormData) {
  "use server";
  const store = await cookies();
  const email = store.get(EMAIL_COOKIE)?.value;
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!email) redirect("/login?e=sesion");
  if (token.length < 6 || token.length > 10) redirect("/login?ok=1&e=codigo");
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`otp:${ip}`, 10, 10 * 60_000) || !rateLimit(`otp:${email}`, 8, 10 * 60_000)) redirect("/login?ok=1&e=limite");
  const sb = await supabaseServer();
  const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (error) redirect("/login?ok=1&e=codigo");
  store.delete({ name: EMAIL_COOKIE, path: "/login" });
  redirect("/radar");
}

const msgs: Record<string, string> = {
  email: "Revisa el correo: no parece válido.",
  limite: "Pediste varios intentos seguidos. Espera unos minutos.",
  envio: "No pudimos enviar el correo. Intenta de nuevo en un minuto.",
  enlace: "Ese enlace ya no sirve (vence en una hora y se puede usar una sola vez). Pide uno nuevo.",
  codigo: "El código no es correcto o ya venció. Revisa el último correo que te llegó.",
  sesion: "Pide un correo nuevo para entrar.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string; ok?: string }> }) {
  if (!authEnabled()) redirect("/radar");
  if (await currentUser()) redirect("/radar");
  const { e, ok } = await searchParams;
  const pendingEmail = (await cookies()).get(EMAIL_COOKIE)?.value;
  const showCode = !!ok && !!pendingEmail;
  return (
    <div className="mx-auto grid max-w-sm gap-6 py-12">
      <div>
        <h1 className="text-xl font-bold">Crea tu cuenta y ve qué se vende en Dropi hoy</h1>
        <p className="mt-1 text-text-muted">Te enviamos un enlace para entrar. Sin contraseñas.</p>
      </div>
      {showCode ? (
        <form action={verifyCode} className="card grid gap-3 p-4">
          <p className="text-sm" role="status">
            Te enviamos un correo a <b>{pendingEmail}</b>. <b>Toca el enlace del correo</b> para entrar. Puedes abrirlo en cualquier navegador o en tu celular.
          </p>
          <p className="text-xs text-text-muted">El correo puede venir en inglés, con el asunto “Magic Link” o “Confirm your signup”. Si trae un código de números, también puedes escribirlo aquí:</p>
          <label htmlFor="code" className="font-medium">Código (opcional)</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" maxLength={12} required
            className="input num text-center text-lg tracking-[0.4em]" aria-describedby={e ? "login-err" : undefined} />
          {e && <p id="login-err" className="text-xs text-danger" role="alert">{msgs[e] ?? msgs.codigo}</p>}
          <button type="submit" className="h-10 rounded-md border border-border font-semibold">Entrar con el código</button>
          <p className="text-xs text-text-muted">¿No llegó? Revisa spam o promociones. Puede tardar un minuto. <a href="/login" className="underline">Usar otro correo</a></p>
        </form>
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
