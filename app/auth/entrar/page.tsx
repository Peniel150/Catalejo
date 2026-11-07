"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

// Llega desde el enlace del correo con la sesión en el fragmento (#access_token=...&refresh_token=...).
// La guarda en cookies (las lee el servidor) y entra al radar. Funciona en cualquier navegador.
export default function Entrar() {
  const [msg, setMsg] = useState("Entrando a Catalejo…");
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const q = new URLSearchParams(window.location.search);
    // Se limpia la URL para que los tokens no queden en el historial.
    history.replaceState(null, "", window.location.pathname);
    const err = h.get("error_description") || q.get("error_description");
    if (err) {
      setMsg("Ese enlace ya no sirve (vence en una hora y se usa una sola vez). Pide uno nuevo.");
      setTimeout(() => window.location.replace("/login?e=enlace"), 2500);
      return;
    }
    const access_token = h.get("access_token");
    const refresh_token = h.get("refresh_token");
    const code = q.get("code");
    if (!access_token || !refresh_token) {
      // Enlace de otro tipo (con ?code): lo resuelve la ruta del servidor.
      window.location.replace(code ? `/auth/callback?code=${encodeURIComponent(code)}` : "/login?e=enlace");
      return;
    }
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) window.location.replace("/login?e=enlace");
      else window.location.replace("/radar");
    });
  }, []);
  return (
    <div className="mx-auto grid max-w-sm place-items-center gap-3 py-24 text-center" role="status" aria-live="polite">
      <div className="skeleton h-10 w-10 rounded-full" aria-hidden="true" />
      <p>{msg}</p>
    </div>
  );
}
