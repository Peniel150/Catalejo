// Lectura segura de filtros desde la URL: los valores inválidos se ignoran, nunca vacían la lista.
import type { RadarFilters } from "./types.ts";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function num(v: string | undefined, min: number, max: number): number | undefined {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

export function parseRadarFilters(sp: SP): RadarFilters {
  const sat = one(sp.saturation);
  const sort = one(sp.sort);
  const q = one(sp.q)?.slice(0, 120);
  return {
    q: q || undefined,
    category: one(sp.category)?.slice(0, 60) || undefined,
    minDelivery: num(one(sp.minDelivery), 0, 1),
    minStock: num(one(sp.minStock), 0, 10_000_000),
    saturation: sat === "baja" || sat === "media" || sat === "alta" ? sat : undefined,
    withAds: one(sp.withAds) === "1",
    restocked: one(sp.restocked) === "1",
    newOnly: one(sp.newOnly) === "1",
    sort: (["score", "effective", "growth", "newest", "margin"] as const).find((s) => s === sort),
  };
}
