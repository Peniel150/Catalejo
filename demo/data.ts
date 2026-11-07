// Capa de datos de la DEMO publicada: misma lógica que lib/data.ts, pero síncrona y solo con datos de ejemplo.
import { buildSeed, SUPPLIERS as SEED_SUPPLIERS, SUPPLIER_SCORES as SEED_SCORES } from "@/lib/seed.ts";
import { todaySantiago } from "@/lib/seed-helpers.ts";
import { dayDiff, scoreProduct } from "@/lib/score.ts";
import { rankSimilar } from "@/lib/similar.ts";
import type { Ad, Competitor, RadarFilters, RadarRow, SavedAd, Supplier, SupplierScore } from "@/lib/types.ts";

let _src: any = null;
function load() {
  if (!_src) {
    const today = todaySantiago();
    _src = { demo: true, today, ...buildSeed(today), suppliers: SEED_SUPPLIERS, supplierScores: SEED_SCORES };
  }
  return _src as { demo: boolean; today: string; products: import("@/lib/types.ts").MarketProduct[]; ads: Ad[]; competitors: Competitor[]; savedAds: SavedAd[]; suppliers: Supplier[]; supplierScores: SupplierScore[] };
}

export function isDemo() {
  return (load()).demo;
}

export function getToday() {
  return (load()).today;
}

export function getCategories(): string[] {
  const { products } = load();
  return [...new Set(products.map((p) => p.category))].sort();
}

export function getRadar(f: RadarFilters = {}): { rows: RadarRow[]; total: number; today: string } {
  const { products, ads, today, suppliers, supplierScores } = load();
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

export function getProduct(id: string) {
  const { rows, today } = getRadar();
  const row = rows.find((r) => r.product.id === id);
  if (!row) return null;
  const { ads, supplierScores } = load();
  const productAds = ads.filter((a) => a.productId === id).sort((a, b) => a.startedOn.localeCompare(b.startedOn));
  const supplierScore = supplierScores.find((s) => s.supplierId === row.product.supplierId) ?? null;
  const similar = rankSimilar(
    { id, name: row.product.name, category: row.product.category },
    rows.map((r) => ({ id: r.product.id, name: r.product.name, category: r.product.category })),
  ).map(({ item, score }) => ({ ...rows.find((r) => r.product.id === item.id)!, nameMatch: score }));
  return { ...row, ads: productAds, supplierScore, similar, today };
}

export function getSuppliers(): { supplier: Supplier; score: SupplierScore; products: number }[] {
  const { products, suppliers, supplierScores } = load();
  return suppliers.map((supplier) => ({
    supplier,
    score: supplierScores.find((s) => s.supplierId === supplier.id) ?? { supplierId: supplier.id, ordersN: 0, contributorsN: 0, deliveryRate: null, returnRate: null, avgDispatchHours: null },
    products: products.filter((p) => p.supplierId === supplier.id).length,
  })).sort((a, b) => (b.score.ordersN >= 20 ? b.score.deliveryRate ?? 0 : -1) - (a.score.ordersN >= 20 ? a.score.deliveryRate ?? 0 : -1));
}

export function getCompetitors(): (Competitor & { ads: Ad[] })[] {
  const { competitors, ads } = load();
  return competitors.map((c) => ({ ...c, ads: ads.filter((a) => a.pageId === c.facebookPageId) }));
}

export function getCompetitor(id: string) {
  const { today, products } = load();
  const all = getCompetitors();
  const c = all.find((x) => x.id === id);
  if (!c) return null;
  const productIds = [...new Set(c.ads.map((a) => a.productId).filter(Boolean))] as string[];
  return { ...c, products: products.filter((p) => productIds.includes(p.id)), today };
}

export function getSavedAds(): (SavedAd & { ad: Ad; productName?: string; competitorName?: string })[] {
  const { savedAds, ads, products, competitors } = load();
  return savedAds
    .map((s) => ({
      ...s,
      ad: ads.find((a) => a.id === s.adId)!,
      productName: products.find((p) => p.id === s.productId)?.name,
      competitorName: competitors.find((c) => c.id === s.competitorId)?.name,
    }))
    .filter((s) => s.ad);
}


export function getTrackedIds(): string[] { return []; }
export function getPlan() { return "advanced" as const; }
