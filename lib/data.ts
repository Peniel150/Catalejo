// Capa de datos. Hoy usa los datos de ejemplo (lib/seed.ts).
// replica-backend la reemplaza por Supabase manteniendo estas mismas firmas,
// así ninguna pantalla cambia.

import { buildSeed, SUPPLIERS, SUPPLIER_SCORES } from "./seed.ts";
import { todaySantiago } from "./seed-helpers.ts";
import { dayDiff, scoreProduct } from "./score.ts";
import type { Ad, Competitor, RadarFilters, RadarRow, SavedAd, Supplier, SupplierScore } from "./types.ts";

function db() {
  const today = todaySantiago();
  const seed = buildSeed(today);
  return { today, ...seed };
}

export async function getToday() {
  return todaySantiago();
}

export async function getCategories(): Promise<string[]> {
  const { products } = db();
  return [...new Set(products.map((p) => p.category))].sort();
}

export async function getRadar(f: RadarFilters = {}): Promise<{ rows: RadarRow[]; total: number; today: string }> {
  const { products, ads, today } = db();
  let rows: RadarRow[] = products.map((product) => {
    const supplier = SUPPLIERS.find((s) => s.id === product.supplierId)!;
    const sScore = SUPPLIER_SCORES.find((s) => s.supplierId === product.supplierId) ?? null;
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
  const { ads } = db();
  const productAds = ads.filter((a) => a.productId === id).sort((a, b) => a.startedOn.localeCompare(b.startedOn));
  const supplierScore = SUPPLIER_SCORES.find((s) => s.supplierId === row.product.supplierId) ?? null;
  const similar = rows.filter((r) => r.product.category === row.product.category && r.product.id !== id).slice(0, 4);
  return { ...row, ads: productAds, supplierScore, similar, today };
}

export async function getSuppliers(): Promise<{ supplier: Supplier; score: SupplierScore; products: number }[]> {
  const { products } = db();
  return SUPPLIERS.map((supplier) => ({
    supplier,
    score: SUPPLIER_SCORES.find((s) => s.supplierId === supplier.id)!,
    products: products.filter((p) => p.supplierId === supplier.id).length,
  })).sort((a, b) => (b.score.ordersN >= 20 ? b.score.deliveryRate ?? 0 : -1) - (a.score.ordersN >= 20 ? a.score.deliveryRate ?? 0 : -1));
}

export async function getCompetitors(): Promise<(Competitor & { ads: Ad[] })[]> {
  const { competitors, ads } = db();
  return competitors.map((c) => ({ ...c, ads: ads.filter((a) => a.pageId === c.facebookPageId) }));
}

export async function getCompetitor(id: string) {
  const { today } = db();
  const all = await getCompetitors();
  const c = all.find((x) => x.id === id);
  if (!c) return null;
  const { products } = db();
  const productIds = [...new Set(c.ads.map((a) => a.productId).filter(Boolean))] as string[];
  return { ...c, products: products.filter((p) => productIds.includes(p.id)), today };
}

export async function getSavedAds(): Promise<(SavedAd & { ad: Ad; productName?: string; competitorName?: string })[]> {
  const { savedAds, ads, products, competitors } = db();
  return savedAds
    .map((s) => ({
      ...s,
      ad: ads.find((a) => a.id === s.adId)!,
      productName: products.find((p) => p.id === s.productId)?.name,
      competitorName: competitors.find((c) => c.id === s.competitorId)?.name,
    }))
    .filter((s) => s.ad);
}
