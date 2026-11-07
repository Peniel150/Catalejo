import { NextResponse } from "next/server";
import { z } from "zod";
import { asService, hasDatabase, hashToken, rateLimit } from "@/lib/server/db.ts";

// Recibe lotes de la extensión. Autenticación: token personal (Ajustes > Extensión), guardado como hash.
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Item = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("dropi_stock"),
    key: z.string().min(1).max(220),
    name: z.string().min(1).max(300),
    stock: z.number().int().min(0).max(10_000_000),
    prices: z.array(z.number().int().min(0).max(100_000_000)).max(10).optional(),
    warehouse: z.string().max(120).nullable().optional(),
    supplier: z.string().max(160).nullable().optional(),
    url: z.string().max(500).nullable().optional(),
    image: z.string().max(1000).nullable().optional(),
    day,
  }),
  z.object({
    kind: z.literal("meta_ad"),
    libraryId: z.string().regex(/^\d{6,25}$/),
    libraryUrl: z.string().url().max(300).refine((u) => u.startsWith("https://www.facebook.com/ads/library/"), "debe ser un link de la biblioteca"),
    startedOn: day.nullable().optional(),
    isActive: z.boolean().optional(),
    pageName: z.string().max(200).nullable().optional(),
    pageUrl: z.string().max(500).nullable().optional(),
    domain: z.string().max(253).nullable().optional(),
    mediaType: z.enum(["image", "video", "carousel"]).optional(),
    country: z.string().length(2).nullable().optional(),
    query: z.string().max(200).nullable().optional(),
    day,
  }),
  z.object({ kind: z.literal("competitor_snapshot"), pageId: z.string().max(40), activeAds: z.number().int().min(0).max(100_000), day }),
]);
const Body = z.object({ items: z.array(Item).min(1).max(500) });

const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "POST, OPTIONS" };
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(req: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: "La base de datos no está configurada." }, { status: 503, headers: cors });
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!/^cat_[A-Za-z0-9_-]{40,}$/.test(token)) return NextResponse.json({ error: "Token inválido." }, { status: 401, headers: cors });
  const hash = hashToken(token);
  if (!rateLimit(`ext:${hash}`, 30, 60_000)) return NextResponse.json({ error: "Demasiados envíos, espera un minuto." }, { status: 429, headers: cors });

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 1_000_000) return NextResponse.json({ error: "Lote demasiado grande." }, { status: 413, headers: cors });
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400, headers: cors });
  }
  if (!parsed.success) return NextResponse.json({ error: "Formato inválido.", issues: parsed.error.issues.slice(0, 5) }, { status: 400, headers: cors });

  return asService(async (sql) => {
    const [t] = await sql`select user_id from api_tokens where token_hash = ${hash} and revoked_at is null`;
    if (!t) return NextResponse.json({ error: "Token revocado o inexistente." }, { status: 401, headers: cors });
    const [r] = await sql`select ingest_extension(${t.user_id}, ${sql.json(parsed.data.items as never)}) as result`;
    await sql`update api_tokens set last_used_at = now() where token_hash = ${hash}`;
    return NextResponse.json({ ok: true, result: r.result }, { headers: cors });
  });
}
