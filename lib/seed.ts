// Datos de EJEMPLO, generados de forma determinística. Todo es ficticio:
// productos genéricos, proveedores y anunciantes inventados.
// Se reemplazan por la capa real (Supabase) sin tocar las pantallas.

import { addDays, metaAdLibrarySearchSafe } from "./seed-helpers.ts";
import type { Ad, Competitor, MarketProduct, SavedAd, Supplier, SupplierScore } from "./types.ts";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export const SEED_NOTICE = "Datos de ejemplo: productos, proveedores y anunciantes ficticios.";

const CATALOG: [string, string, number, number][] = [
  ["Corrector de postura ajustable", "Salud", 6500, 19990],
  ["Mini proyector LED portátil", "Tecnología", 21000, 49990],
  ["Masajeador facial de rodillo", "Belleza", 3900, 12990],
  ["Organizador de cables magnético", "Hogar", 2500, 9990],
  ["Lámpara de luna 3D", "Hogar", 5200, 15990],
  ["Cepillo alisador eléctrico", "Belleza", 8900, 24990],
  ["Rodillera de compresión deportiva", "Deporte", 3100, 11990],
  ["Botella térmica con indicador de temperatura", "Hogar", 4200, 14990],
  ["Soporte de celular para auto con carga", "Tecnología", 7600, 21990],
  ["Faja reductora térmica", "Salud", 5400, 17990],
  ["Set de bandas elásticas de resistencia", "Deporte", 2900, 10990],
  ["Humidificador difusor de aromas", "Hogar", 6100, 18990],
  ["Audífonos inalámbricos deportivos", "Tecnología", 9800, 26990],
  ["Removedor de pelusas recargable", "Hogar", 3300, 11990],
  ["Plantillas ortopédicas de gel", "Salud", 2600, 9990],
  ["Lentes con filtro de luz azul", "Salud", 3500, 12990],
  ["Mini aspiradora inalámbrica para auto", "Hogar", 8200, 22990],
  ["Cortador de verduras multifunción", "Cocina", 4700, 15990],
  ["Mascarilla LED facial", "Belleza", 14500, 39990],
  ["Pistola masajeadora muscular", "Deporte", 15800, 39990],
  ["Rizador de pestañas térmico", "Belleza", 3200, 11990],
  ["Freidora de aire compacta 2L", "Cocina", 24000, 54990],
  ["Cámara de seguridad wifi 360°", "Tecnología", 13500, 34990],
  ["Almohada cervical viscoelástica", "Salud", 7900, 21990],
];

export const SUPPLIERS: Supplier[] = Array.from({ length: 8 }, (_, i) => ({
  id: `prov-${i + 1}`,
  name: `Proveedor de ejemplo ${String.fromCharCode(65 + i)}`,
  platform: "dropi",
  country: "CL",
}));

const SUPPLIER_STATS: [number, number, number, number][] = [
  // pedidos, entrega, devolución, horas de despacho
  [640, 0.91, 0.05, 18],
  [410, 0.84, 0.09, 26],
  [220, 0.77, 0.13, 34],
  [180, 0.69, 0.18, 51],
  [95, 0.58, 0.27, 72],
  [530, 0.88, 0.07, 22],
  [12, 0.95, 0.0, 15], // muy pocos pedidos: no se usa
  [300, 0.81, 0.1, 30],
];

export const SUPPLIER_SCORES: SupplierScore[] = SUPPLIERS.map((s, i) => ({
  supplierId: s.id,
  ordersN: SUPPLIER_STATS[i][0],
  contributorsN: Math.max(1, Math.round(SUPPLIER_STATS[i][0] / 40)),
  deliveryRate: SUPPLIER_STATS[i][1],
  returnRate: SUPPLIER_STATS[i][2],
  avgDispatchHours: SUPPLIER_STATS[i][3],
}));

export function buildSeed(today: string) {
  const r = rng(20261107);
  const products: MarketProduct[] = CATALOG.map(([name, category, cost, price], i) => {
    const supplierId = SUPPLIERS[i % SUPPLIERS.length].id;
    const ageDays = 8 + Math.floor(r() * 120);
    const observedDays = Math.min(30, ageDays);
    const baseRate = [38, 17, 22, 9, 5, 14, 11, 7, 12, 19, 6, 8, 10, 4, 6, 3, 9, 7, 13, 15, 5, 4, 8, 6][i];
    const trend = (r() - 0.35) * 0.06; // crecimiento diario
    let stock = 300 + Math.floor(r() * 1500);
    const observations = [];
    for (let d = observedDays; d >= 0; d--) {
      // algunos días sin observación (el usuario no pasó por ese producto)
      if (d !== 0 && d !== observedDays && r() < 0.25) {
        stock -= Math.max(0, Math.round(baseRate * (1 + trend * (observedDays - d)) * (0.6 + r() * 0.8)));
        continue;
      }
      const sold = Math.max(0, Math.round(baseRate * (1 + trend * (observedDays - d)) * (0.6 + r() * 0.8)));
      stock = Math.max(0, stock - sold);
      if (stock < baseRate * 4 && r() < 0.6) stock += 400 + Math.floor(r() * 600); // reposición
      observations.push({ day: addDays(today, -d), stock });
    }
    return {
      id: `p-${i + 1}`,
      name,
      category,
      supplierId,
      supplierCost: cost,
      suggestedPrice: price,
      listedOn: addDays(today, -ageDays),
      observations,
    };
  });

  const ads: Ad[] = [];
  products.forEach((p, i) => {
    const n = [14, 31, 9, 48, 57, 22, 6, 11, 18, 26, 3, 8, 35, 5, 2, 4, 13, 7, 20, 28, 3, 9, 16, 6][i];
    for (let k = 0; k < Math.min(n, 12); k++) {
      const started = 1 + Math.floor(r() * 120);
      ads.push({
        id: `ad-${i + 1}-${k + 1}`,
        platform: r() < 0.8 ? "meta" : "tiktok",
        libraryId: `ejemplo-${i + 1}-${k + 1}`,
        libraryUrl: metaAdLibrarySearchSafe(p.name),
        pageName: `Anunciante de ejemplo ${(i * 7 + k) % 40 + 1}`,
        pageId: `pg-${(i * 7 + k) % 40 + 1}`,
        domain: `tienda-${(i * 7 + k) % 40 + 1}.ejemplo`,
        startedOn: addDays(today, -started),
        lastSeenActiveOn: addDays(today, -Math.floor(r() * 2)),
        isActive: true,
        mediaType: (["video", "image", "carousel"] as const)[Math.floor(r() * 3)],
        productId: p.id,
      });
    }
    // Para el conteo de anunciantes se usa n completo aunque solo guardemos 12 anuncios de muestra.
    for (let k = 12; k < n; k++) {
      ads.push({
        id: `ad-${i + 1}-${k + 1}`, platform: "meta", libraryId: `ejemplo-${i + 1}-${k + 1}`, libraryUrl: metaAdLibrarySearchSafe(p.name),
        pageName: `Anunciante de ejemplo ${(i * 7 + k) % 40 + 1}`, pageId: `pg-x-${i}-${k}`, domain: `tienda-x-${i}-${k}.ejemplo`,
        startedOn: addDays(today, -(1 + Math.floor(r() * 60))), lastSeenActiveOn: today, isActive: true, mediaType: "image", productId: p.id,
      });
    }
  });

  const competitors: Competitor[] = Array.from({ length: 6 }, (_, i) => {
    const base = 4 + Math.floor(r() * 20);
    const snapshots = [];
    let active = base;
    for (let d = 29; d >= 0; d--) {
      if (r() < 0.3) continue; // días sin datos
      const delta = Math.round((r() - 0.4) * 4);
      const newAds = Math.max(0, delta);
      active = Math.max(0, active + delta);
      snapshots.push({ day: addDays(today, -d), activeAds: active, newAds });
    }
    const n = (i * 7) % 40 + 1;
    return {
      id: `comp-${i + 1}`,
      name: `Competidor de ejemplo ${i + 1}`,
      facebookPageId: `pg-${n}`,
      facebookPageName: `Anunciante de ejemplo ${n}`,
      domain: `tienda-${n}.ejemplo`,
      snapshots,
    };
  });

  const savedAds: SavedAd[] = [
    { adId: "ad-1-1", productId: "p-1", note: "Gancho de 3 segundos con antes/después.", savedAt: addDays(today, -2) },
    { adId: "ad-3-2", productId: "p-3", note: "Testimonio en formato vertical.", savedAt: addDays(today, -5) },
    { adId: "ad-6-1", competitorId: "comp-2", savedAt: addDays(today, -1) },
  ];

  return { products, ads, competitors, savedAds };
}
