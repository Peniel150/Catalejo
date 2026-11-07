// Tipos de dominio de Catalejo. Mismos nombres que replica/schema.sql.

export type Saturation = "baja" | "media" | "alta";

export interface Supplier {
  id: string;
  name: string;
  platform: "dropi";
  country: "CL";
}

export interface SupplierScore {
  supplierId: string;
  ordersN: number;
  contributorsN: number;
  deliveryRate: number | null; // 0..1
  returnRate: number | null; // 0..1
  avgDispatchHours: number | null;
}

/** Una foto de stock de un producto en un día (America/Santiago). */
export interface StockObservation {
  day: string; // YYYY-MM-DD
  stock: number;
  warehouse?: string;
}

export interface MarketProduct {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  supplierId: string;
  supplierCost: number; // CLP
  suggestedPrice: number; // CLP
  listedOn: string; // YYYY-MM-DD
  dropiUrl?: string;
  observations: StockObservation[];
}

export interface Ad {
  id: string;
  platform: "meta" | "tiktok";
  libraryId: string;
  libraryUrl: string;
  pageName: string;
  pageId?: string;
  domain?: string;
  startedOn: string; // YYYY-MM-DD
  lastSeenActiveOn: string;
  isActive: boolean;
  mediaType: "image" | "video" | "carousel";
  productId?: string;
}

export interface Competitor {
  id: string;
  name: string;
  facebookPageId?: string;
  facebookPageName?: string;
  domain?: string;
  tiktokHandle?: string;
  snapshots: { day: string; activeAds: number; newAds: number }[];
}

export interface SavedAd {
  adId: string;
  note?: string;
  productId?: string;
  competitorId?: string;
  savedAt: string;
}

/** Resultado del cálculo diario por producto (market_scores). */
export interface ProductScore {
  productId: string;
  score: number; // 0..100
  estUnits7d: number;
  estUnitsPrev7d: number;
  estUnits30d: number;
  effectiveUnits7d: number | null;
  growth7d: number | null; // -1..∞ (fracción)
  restocked: boolean;
  currentStock: number | null;
  daysObserved: number;
  advertisers: number;
  oldestAdDays: number | null;
  saturation: Saturation;
  supplierDeliveryRate: number | null;
  components: ScoreComponent[];
  daily: { day: string; units: number; stock: number | null; restock: boolean }[];
}

export interface ScoreComponent {
  key: string;
  label: string;
  points: number; // puede ser negativo
  detail: string;
}

export interface RadarRow {
  product: MarketProduct;
  supplier: Supplier;
  score: ProductScore;
}

export interface RadarFilters {
  q?: string;
  category?: string;
  minDelivery?: number; // 0..1
  minStock?: number;
  saturation?: Saturation;
  withAds?: boolean;
  restocked?: boolean;
  newOnly?: boolean;
  sort?: "score" | "effective" | "growth" | "newest" | "margin";
}
