// Capa de datos. Con DATABASE_URL y sesión iniciada lee Postgres (con RLS, como el usuario);
// si no, usa los datos de ejemplo (lib/seed.ts). Las pantallas no notan la diferencia.
import "server-only";
import { cache } from "react";
import { buildSeed, SUPPLIERS as SEED_SUPPLIERS, SUPPLIER_SCORES as SEED_SCORES } from "./seed.ts";
import { todaySantiago } from "./seed-helpers.ts";
import { dayDiff, scoreProduct } from "./score.ts";
import { asUser, hasDatabase } from "./server/db.ts";
import { loadMarketFromDb } from "./server/market.ts";
import { currentUser } from "./supabase/server.ts";
import { rankSimilar } from "./similar.ts";
import type { Ad, Competitor, RadarFilters, RadarRow, SavedAd, Supplier, SupplierScore } from "./types.ts";

type Source = {
  demo: boolean;
  today: string;
  products: import("./types.ts").MarketProduct[];
  ads: Ad[];
  competitors: Competitor[];
  savedAds: SavedAd[];
  suppliers: Supplier[];
  supplierScores: SupplierScore[];
};

const load = cache(async (): Promise<Source> => {
  const user = hasDatabase() ? await currentUser() : null;
  if (user) {
    const m = await asUser(user.id, (tx) => loadMarketFromDb(tx, user.id));
    return { demo: false, ...m };
  }
  const today = todaySantiago();
  return { demo: true, today, ...buildSeed(today), suppliers: SEED_SUPPLIERS, supplierScores: SEED_SCORES };
});

export async function isDemo() {
  return (await load()).demo;
}

export async function getToday() {
  return (await load()).today;
}

export async function getCategories(): Promise<string[]> {
  const { products } = await load();
  return [...new Set(products.map((p) => p.category))].sort();
}

export async function getRadar(f: RadarFilters = {}): Promise<{ rows: RadarRow[]; total: number; today: string }> {
  const { products, ads, today, suppliers, supplierScores } = await load();
  let rows: RadarRow[] = products.map((product) => {
    const supplier = suppliers.find((s) => s.id === product.supplierId) ?? { id: product.supplierId, name: "Proveedor sin identificar", platform: "dropi" as const, country: "CL" as const };
    const sScore = supplierScores.find((s) => s.supplierId === product.supplierId) ?? null;
    const score = scoreProduct({ product, ads: ads.filter((a) => a.productId === product.id), supplier: sScore, today });
    return { product, supplier, score };
  });
  const total = rows.length;
  const q = f.q?.trim().toLowerCase();
  if (q) rows = rows.filter((r) => r.product.name.toLowerCase().includes(q) || r.product.category.toLowerCase().includes(q));
  if (f.category) rows = rows.filter((r) => r.product.category === f.category);
  if (f.minDelivery !== undefined) rows = rows.filter((r) => (r.score.supplierDeliveryRate ?? 0) >= f.minDelivery!);
  if (f.minStock !== undefined) rows = rows.filter((r) => (r.score.currentStock ?? 0) >= f.minStock!);
  if (f.saturation) rows = rows.filter((r) => r.score.saturation === f.saturation);
  if (f.withAds) rows = rows.filter((r) => r.score.advertisers > 0);
  if (f.restocked) rows = rows.filter((r) => r.score.restocked);
  if (f.newOnly) rows = rows.filter((r) => dayDiff(r.product.listedOn, today) <= 30);
  const sort = f.sort ?? "score";
  const key: Record<NonNullable<RadarFilters["sort"]>, (r: RadarRow) => number> = {
    score: (r) => r.score.score,
    effective: (r) => r.score.effectiveUnits7d ?? r.score.estUnits7d * 0.7,
    growth: (r) => r.score.growth7d ?? 99,
    newest: (r) => -dayDiff(r.product.listedOn, today),
    margin: (r) => r.product.suggestedPrice - r.product.supplierCost,
  };
  rows.sort((a, b) => key[sort](b) - key[sort](a));
  return { rows, total, today };
}

export async function getProduct(id: string) {
  const { rows, today } = await getRadar();
  const row = rows.find((r) => r.product.id === id);
  if (!row) return null;
  const { ads, supplierScores } = await load();
  const productAds = ads.filter((a) => a.productId === id).sort((a, b) => a.startedOn.localeCompare(b.startedOn));
  const supplierScore = supplierScores.find((s) => s.supplierId === row.product.supplierId) ?? null;
  const similar = rankSimilar(
    { id, name: row.product.name, category: row.product.category },
    rows.map((r) => ({ id: r.product.id, name: r.product.name, category: r.product.category })),
  ).map(({ item, score }) => ({ ...rows.find((r) => r.product.id === item.id)!, nameMatch: score }));
  return { ...row, ads: productAds, supplierScore, similar, today };
}

export async function getSuppliers(): Promise<{ supplier: Supplier; score: SupplierScore; products: number }[]> {
  const { products, suppliers, supplierScores } = await load();
  return suppliers.map((supplier) => ({
    supplier,
    score: supplierScores.find((s) => s.supplierId === supplier.id) ?? { supplierId: supplier.id, ordersN: 0, contributorsN: 0, deliveryRate: null, returnRate: null, avgDispatchHours: null },
    products: products.filter((p) => p.supplierId === supplier.id).length,
  })).sort((a, b) => (b.score.ordersN >= 20 ? b.score.deliveryRate ?? 0 : -1) - (a.score.ordersN >= 20 ? a.score.deliveryRate ?? 0 : -1));
}

export async function getCompetitors(): Promise<(Competitor & { ads: Ad[] })[]> {
  const { competitors, ads } = await load();
  return competitors.map((c) => ({ ...c, ads: ads.filter((a) => a.pageId === c.facebookPageId) }));
}

export async function getCompetitor(id: string) {
  const { today, products } = await load();
  const all = await getCompetitors();
  const c = all.find((x) => x.id === id);
  if (!c) return null;
  const productIds = [...new Set(c.ads.map((a) => a.productId).filter(Boolean))] as string[];
  return { ...c, products: products.filter((p) => productIds.includes(p.id)), today };
}

export async function getSavedAds(): Promise<(SavedAd & { ad: Ad; productName?: string; competitorName?: string })[]> {
  const { savedAds, ads, products, competitors } = await load();
  return savedAds
    .map((s) => ({
      ...s,
      ad: ads.find((a) => a.id === s.adId)!,
      productName: products.find((p) => p.id === s.productId)?.name,
      competitorName: competitors.find((c) => c.id === s.competitorId)?.name,
    }))
    .filter((s) => s.ad);
}

/** Ids de productos seguidos (modo real). En demostración se guardan en el navegador. */
export async function getTrackedIds(): Promise<string[]> {
  const user = hasDatabase() ? await currentUser() : null;
  if (!user) return [];
  const rows = await asUser(user.id, (tx) => tx`select market_product_id from tracked_market_products`);
  return rows.map((r) => r.market_product_id as string);
}
