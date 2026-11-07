// Estimación de ventas por caída de stock y puntaje de producto ganador.
// Lógica pura, sin dependencias, probada en tests/score.test.ts.

import type { Ad, MarketProduct, ProductScore, Saturation, ScoreComponent, StockObservation, SupplierScore } from "./types.ts";

const DAY_MS = 86_400_000;

export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DAY_MS);
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(day + "T00:00:00Z") + n * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Convierte fotos de stock en ventas diarias estimadas.
 * - Una baja de stock entre dos fotos = unidades vendidas, repartidas en los días del hueco.
 * - Una subida = reposición: no cuenta como venta y se marca.
 * - Si hay varias bodegas, se suman por día antes de comparar.
 */
export function estimateDailySales(observations: StockObservation[]) {
  const byDay = new Map<string, number>();
  for (const o of observations) byDay.set(o.day, (byDay.get(o.day) ?? 0) + Math.max(0, o.stock));
  const days = [...byDay.keys()].sort();
  const out: { day: string; units: number; stock: number | null; restock: boolean }[] = [];
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const stock = byDay.get(day)!;
    if (i === 0) {
      out.push({ day, units: 0, stock, restock: false });
      continue;
    }
    const prevDay = days[i - 1];
    const prev = byDay.get(prevDay)!;
    const gap = Math.max(1, dayDiff(prevDay, day));
    const drop = prev - stock;
    if (drop > 0) {
      // Repartir la caída en los días sin observación, para no inflar un solo día.
      const per = drop / gap;
      for (let g = 1; g < gap; g++) out.push({ day: addDays(prevDay, g), units: per, stock: null, restock: false });
      out.push({ day, units: per, stock, restock: false });
    } else {
      for (let g = 1; g < gap; g++) out.push({ day: addDays(prevDay, g), units: 0, stock: null, restock: false });
      out.push({ day, units: 0, stock, restock: drop < 0 });
    }
  }
  return out;
}

function sumWindow(daily: { day: string; units: number }[], from: string, to: string): number {
  // from exclusivo, to inclusivo
  return daily.filter((d) => d.day > from && d.day <= to).reduce((s, d) => s + d.units, 0);
}

export function saturationFor(advertisers: number): Saturation {
  if (advertisers >= 30) return "alta";
  if (advertisers >= 12) return "media";
  return "baja";
}

export interface ScoreInput {
  product: MarketProduct;
  ads: Ad[];
  supplier: SupplierScore | null;
  today: string; // YYYY-MM-DD
}

export function scoreProduct({ product, ads, supplier, today }: ScoreInput): ProductScore {
  const daily = estimateDailySales(product.observations);
  const d7 = addDays(today, -7);
  const d14 = addDays(today, -14);
  const d30 = addDays(today, -30);
  const estUnits7d = Math.round(sumWindow(daily, d7, today));
  const estUnitsPrev7d = Math.round(sumWindow(daily, d14, d7));
  const estUnits30d = Math.round(sumWindow(daily, d30, today));
  const recent = daily.filter((d) => d.day > d14);
  const restocked = recent.some((d) => d.restock);
  const lastWithStock = [...daily].reverse().find((d) => d.stock !== null);
  const currentStock = lastWithStock?.stock ?? null;
  const daysObserved = new Set(product.observations.map((o) => o.day)).size;

  const activeAds = ads.filter((a) => a.isActive);
  const advertisers = new Set(activeAds.map((a) => a.domain ?? a.pageId ?? a.pageName)).size;
  const oldestAdDays = activeAds.length ? Math.max(...activeAds.map((a) => dayDiff(a.startedOn, today))) : null;
  const saturation = saturationFor(advertisers);

  const deliveryRate = supplier && supplier.ordersN >= 20 ? supplier.deliveryRate : null;
  const effectiveUnits7d = deliveryRate === null ? null : Math.round(estUnits7d * deliveryRate);
  const growth7d = estUnitsPrev7d > 0 ? (estUnits7d - estUnitsPrev7d) / estUnitsPrev7d : estUnits7d > 0 ? null : 0;

  const components: ScoreComponent[] = [];
  const base = effectiveUnits7d ?? estUnits7d * 0.7; // sin dato de proveedor, se asume 70% de entrega
  // Ventas: hasta 40 pts, escala logarítmica (10/semana ≈ 13 pts, 100 ≈ 27, 1000 ≈ 40)
  const salesPts = Math.min(40, Math.round((Math.log10(1 + base) / 3) * 40));
  components.push({ key: "ventas", label: "Ventas efectivas 7d", points: salesPts, detail: `${Math.round(base)} unidades${effectiveUnits7d === null ? " (entrega supuesta 70%)" : ""}` });

  let growthPts = 0;
  if (growth7d === null) growthPts = estUnits7d > 0 ? 10 : 0;
  else growthPts = Math.max(-10, Math.min(20, Math.round(growth7d * 25)));
  components.push({ key: "tendencia", label: "Tendencia", points: growthPts, detail: growth7d === null ? "producto nuevo con ventas" : `${Math.round(growth7d * 100)}% vs semana anterior` });

  let supplierPts = 0;
  if (deliveryRate !== null) supplierPts = Math.round(Math.max(0, Math.min(1, (deliveryRate - 0.5) / 0.45)) * 20);
  components.push({ key: "proveedor", label: "Entrega del proveedor", points: supplierPts, detail: deliveryRate === null ? "sin datos suficientes (menos de 20 pedidos)" : `${Math.round(deliveryRate * 100)}% de pedidos entregados` });

  const adPts = oldestAdDays === null ? 0 : Math.min(10, Math.round(oldestAdDays / 6));
  components.push({ key: "anuncios", label: "Validación por anuncios", points: adPts, detail: oldestAdDays === null ? "sin anuncios observados" : `anuncio más antiguo: ${oldestAdDays} días` });

  const satPts = saturation === "alta" ? -15 : saturation === "media" ? -5 : 0;
  components.push({ key: "saturacion", label: "Saturación", points: satPts, detail: `${advertisers} anunciantes activos en Chile` });

  let stockPts = 0;
  if (currentStock !== null && estUnits7d > 0 && currentStock < estUnits7d) stockPts = -10;
  components.push({ key: "stock", label: "Stock disponible", points: stockPts, detail: currentStock === null ? "sin dato" : `${currentStock} unidades${stockPts ? " (menos de una semana de ventas)" : ""}` });

  if (daysObserved < 2) components.push({ key: "datos", label: "Pocos datos", points: -20, detail: `${daysObserved} día observado` });

  const score = Math.max(0, Math.min(100, components.reduce((s, c) => s + c.points, 0) + 10));

  return {
    productId: product.id,
    score,
    estUnits7d,
    estUnitsPrev7d,
    estUnits30d,
    effectiveUnits7d,
    growth7d,
    restocked,
    currentStock,
    daysObserved,
    advertisers,
    oldestAdDays,
    saturation,
    supplierDeliveryRate: deliveryRate,
    components,
    daily: daily.map((d) => ({ ...d, units: Math.round(d.units * 10) / 10 })),
  };
}
