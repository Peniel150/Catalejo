import { NextResponse } from "next/server";
import { supabaseServer, authEnabled } from "@/lib/supabase/server.ts";

// Cerrar sesión en todos los dispositivos (scope global).
export async function POST(req: Request) {
  if (authEnabled()) {
    const sb = await supabaseServer();
    await sb.auth.signOut({ scope: "global" });
  }
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
