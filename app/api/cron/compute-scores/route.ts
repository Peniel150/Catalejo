import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { asService, hasDatabase } from "@/lib/server/db.ts";
import { loadMarketFromDb } from "@/lib/server/market.ts";
import { scoreProduct } from "@/lib/score.ts";

// Vercel Cron llama a esta ruta cada día (vercel.json) con "Authorization: Bearer CRON_SECRET".
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(`Bearer ${secret}`), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "Sin base de datos" }, { status: 503 });
  return asService(async (sql) => {
    try {
      await sql`select compute_supplier_scores()`;
      const m = await loadMarketFromDb(sql, null);
      let n = 0;
      for (const p of m.products) {
        const s = scoreProduct({ product: p, ads: m.ads.filter((a) => a.productId === p.id), supplier: m.supplierScores.find((x) => x.supplierId === p.supplierId) ?? null, today: m.today });
        await sql`insert into market_scores (market_product_id, computed_on, score, est_units_7d, max_ad_days_active, active_ads, meta_ads, saturation, components,
            est_effective_units_7d, supplier_score)
          values (${p.id}, ${m.today}, ${s.score}, ${s.estUnits7d}, ${s.oldestAdDays}, ${s.advertisers}, ${s.advertisers}, ${s.saturation}, ${sql.json(s.components as never)},
            ${s.effectiveUnits7d}, ${s.supplierDeliveryRate === null ? null : Math.round(s.supplierDeliveryRate * 100)})
          on conflict (market_product_id, computed_on) do update set score = excluded.score, est_units_7d = excluded.est_units_7d,
            components = excluded.components, est_effective_units_7d = excluded.est_effective_units_7d`;
        n++;
      }
      return NextResponse.json({ ok: true, scored: n, day: m.today });
    } catch (e) {
      await sql`insert into job_failures (job, error) values ('compute-scores', ${String(e).slice(0, 2000)})`;
      return NextResponse.json({ error: "Falló el cálculo; quedó registrado." }, { status: 500 });
    }
  });
}
