import "server-only";
import type postgres from "postgres";
import { todaySantiago } from "@/lib/seed-helpers.ts";
import type { Ad, Competitor, MarketProduct, SavedAd, Supplier, SupplierScore } from "@/lib/types.ts";

/**
 * Carga el mercado desde Postgres con la misma forma que lib/seed.ts, para que
 * lib/score.ts y las pantallas funcionen igual con datos reales o de ejemplo.
 * userId = null en jobs del sistema (sin datos privados).
 */
export async function loadMarketFromDb(sql: postgres.Sql | postgres.TransactionSql, userId: string | null) {
  const today = todaySantiago();
  const listings = await sql`
    select l.id as listing_id, l.market_product_id, l.title, l.price, l.supplier_id, l.first_seen_at, mp.category
    from market_listings l join market_products mp on mp.id = l.market_product_id
    where l.source = 'dropi_view' and l.last_seen_at > now() - interval '45 days'`;
  const ids = listings.map((l) => l.listing_id);
  const obs = ids.length
    ? await sql`select listing_id, observed_on::text as day, value from market_observations
                where metric = 'stock' and observed_on > current_date - 45 and listing_id = any(${ids})`
    : [];
  const byListing = new Map<string, { day: string; stock: number }[]>();
  for (const o of obs) {
    const arr = byListing.get(o.listing_id) ?? [];
    arr.push({ day: o.day, stock: Number(o.value) });
    byListing.set(o.listing_id, arr);
  }
  const products: MarketProduct[] = listings.map((l) => ({
    id: l.market_product_id,
    name: l.title,
    category: l.category ?? "Sin categoría",
    supplierId: l.supplier_id ?? "sin-proveedor",
    supplierCost: Number(l.price ?? 0),
    suggestedPrice: Number(l.price ?? 0),
    listedOn: new Date(l.first_seen_at).toISOString().slice(0, 10),
    observations: byListing.get(l.listing_id) ?? [],
  }));

  const adRows = await sql`select a.id, a.library_id, a.library_url, a.page_name, a.page_id, a.domain, a.started_on::text, a.last_seen_active_on::text,
      a.is_active, a.media_type, a.market_product_id from ads a where a.is_active and a.last_seen_active_on > current_date - 14`;
  const ads: Ad[] = adRows.map((a) => ({
    id: a.id, platform: "meta", libraryId: a.library_id, libraryUrl: a.library_url, pageName: a.page_name ?? "Anunciante",
    pageId: a.page_id ?? undefined, domain: a.domain ?? undefined, startedOn: a.started_on ?? today, lastSeenActiveOn: a.last_seen_active_on,
    isActive: a.is_active, mediaType: a.media_type ?? "image", productId: a.market_product_id ?? undefined,
  }));

  const supRows = await sql`select id, name from suppliers where platform = 'dropi' and country = 'CL'`;
  const suppliers: Supplier[] = supRows.map((s) => ({ id: s.id, name: s.name, platform: "dropi", country: "CL" }));
  const scoreRows = await sql`
    select distinct on (supplier_id) supplier_id, orders_n, contributors_n, delivery_rate, return_rate, avg_dispatch_hours
    from supplier_scores
    where (scope = 'shared' and contributors_n >= 5) ${userId ? sql`or (scope = 'user' and user_id = ${userId})` : sql``}
    order by supplier_id, computed_on desc, (scope = 'shared') desc`;
  const supplierScores: SupplierScore[] = scoreRows.map((s) => ({
    supplierId: s.supplier_id, ordersN: s.orders_n, contributorsN: s.contributors_n,
    deliveryRate: s.delivery_rate === null ? null : Number(s.delivery_rate),
    returnRate: s.return_rate === null ? null : Number(s.return_rate),
    avgDispatchHours: s.avg_dispatch_hours === null ? null : Math.round(Number(s.avg_dispatch_hours)),
  }));

  let competitors: Competitor[] = [];
  let savedAds: SavedAd[] = [];
  if (userId) {
    const comps = await sql`select id, name, facebook_page_id, facebook_page_name, domain, tiktok_handle from competitors order by created_at`;
    const snaps = await sql`select competitor_id, observed_on::text as day, active_ads, new_ads from competitor_snapshots where observed_on > current_date - 60 order by observed_on`;
    competitors = comps.map((c) => ({
      id: c.id, name: c.name, facebookPageId: c.facebook_page_id ?? undefined, facebookPageName: c.facebook_page_name ?? undefined,
      domain: c.domain ?? undefined, tiktokHandle: c.tiktok_handle ?? undefined,
      snapshots: snaps.filter((s) => s.competitor_id === c.id).map((s) => ({ day: s.day, activeAds: s.active_ads, newAds: s.new_ads })),
    }));
    const saved = await sql`select ad_id, note, product_id, competitor_id, created_at from saved_ads order by created_at desc`;
    savedAds = saved.map((s) => ({ adId: s.ad_id, note: s.note ?? undefined, productId: s.product_id ?? undefined, competitorId: s.competitor_id ?? undefined, savedAt: new Date(s.created_at).toISOString().slice(0, 10) }));
  }
  return { today, products, ads, suppliers, supplierScores, competitors, savedAds };
}
