import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Rutas que no requieren sesión.
const PUBLIC = [/^\/$/, /^\/login/, /^\/auth\//, /^\/api\//, /^\/herramientas/, /^\/privacidad/, /^\/terminos/];

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Modo demostración (sin Supabase configurado): todo abierto con datos de ejemplo.
  if (!url || !key) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  if (!data.user && !PUBLIC.some((r) => r.test(req.nextUrl.pathname))) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  // Archivos públicos (imágenes de la portada, íconos, imagen para compartir) no pasan por el login.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|zip)$).*)"],
};
