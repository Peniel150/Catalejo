import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import readXlsxFile from "read-excel-file/node";
import { asService, hasDatabase, rateLimit } from "@/lib/server/db.ts";
import { currentUser } from "@/lib/supabase/server.ts";
import { parseCsv, parseDropiReport } from "@/lib/dropi-report.ts";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: "La base de datos no está configurada." }, { status: 503 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!rateLimit(`import:${user.id}`, 10, 60 * 60_000)) return NextResponse.json({ error: "Muchas importaciones seguidas. Espera un rato." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "El archivo pesa más de 5 MB." }, { status: 413 });
  const name = file.name.toLowerCase();
  const isXlsx = name.endsWith(".xlsx");
  const isCsv = name.endsWith(".csv");
  if (!isXlsx && !isCsv) return NextResponse.json({ error: "Sube un archivo .xlsx o .csv." }, { status: 415 });

  const buf = Buffer.from(await file.arrayBuffer());
  const sha = createHash("sha256").update(buf).digest("hex");
  let rows: unknown[][];
  try {
    rows = isXlsx ? ((await readXlsxFile(buf)) as unknown[][]) : parseCsv(buf.toString("utf8").replace(/^﻿/, ""));
  } catch {
    return NextResponse.json({ error: "No pudimos leer el archivo. ¿Es el reporte de pedidos de Dropi?" }, { status: 422 });
  }
  const parsed = parseDropiReport(rows);
  if (!parsed.orders.length) return NextResponse.json({ error: parsed.errors[0]?.message ?? "No encontramos pedidos.", mapping: parsed.mapping }, { status: 422 });

  return asService(async (sql) => {
    // El archivo en sí no se guarda: solo su hash, para no importarlo dos veces.
    const dup = await sql`select id from imports where user_id = ${user.id} and file_sha256 = ${sha}`;
    if (dup.length) return NextResponse.json({ error: "Ya importaste este mismo archivo." }, { status: 409 });
    const [imp] = await sql`insert into imports (user_id, kind, file_path, file_sha256, status, rows_total)
      values (${user.id}, 'dropi_orders', ${"(no se guarda)"}, ${sha}, 'processing', ${rows.length - 1}) returning id`;
    let ok = 0;
    await sql.begin(async (tx) => {
      const supIds = new Map<string, string>();
      for (const s of new Set(parsed.orders.map((o) => o.supplierName).filter(Boolean) as string[])) {
        const [r] = await tx`insert into suppliers (platform, country, name) values ('dropi', 'CL', ${s.slice(0, 160)})
          on conflict (platform, country, name) do update set name = excluded.name returning id`;
        supIds.set(s, r.id);
      }
      for (const o of parsed.orders) {
        const [row] = await tx`insert into orders (user_id, source, external_id, import_id, placed_at, total, shipping_cost, status, region, supplier_id, dispatched_at, delivered_at,
            returned_at, freight_cost)
          values (${user.id}, 'dropi_report', ${o.externalId}, ${imp.id}, ${o.placedAt}, ${o.total}, ${o.freight}, ${o.status}, ${o.region},
            ${o.supplierName ? supIds.get(o.supplierName)! : null}, ${o.dispatchedAt}, ${o.deliveredAt}, ${o.status === "returned" ? o.deliveredAt : null}, ${o.freight})
          on conflict (user_id, source, external_id) do update set status = excluded.status, dispatched_at = coalesce(excluded.dispatched_at, orders.dispatched_at),
            delivered_at = coalesce(excluded.delivered_at, orders.delivered_at), supplier_id = coalesce(excluded.supplier_id, orders.supplier_id)
          returning id, (xmax = 0) as inserted`;
        if (row.inserted && o.productTitle) {
          await tx`insert into order_items (order_id, user_id, external_sku, title, quantity, unit_price)
            values (${row.id}, ${user.id}, ${o.sku}, ${o.productTitle}, ${o.quantity}, ${Math.round(o.total / o.quantity)})`;
        }
        ok++;
      }
    });
    await sql`update imports set status = 'done', rows_ok = ${ok}, rows_failed = ${parsed.errors.length} where id = ${imp.id}`;
    await sql`select compute_supplier_scores()`;
    return NextResponse.json({ ok: true, orders: ok, errors: parsed.errors.slice(0, 50), mapping: parsed.mapping, ignoredColumns: parsed.ignoredColumns });
  });
}
