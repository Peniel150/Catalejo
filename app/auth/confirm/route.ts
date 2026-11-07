import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server.ts";

// Enlace del correo con token_hash: funciona aunque se abra en otro navegador o dispositivo
// (a diferencia de /auth/callback, que necesita la cookie del navegador donde se pidió el acceso).
const TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "recovery", "invite", "email_change"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type && TYPES.includes(type)) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL("/radar", url.origin));
  }
  return NextResponse.redirect(new URL("/login?e=enlace", url.origin));
}
