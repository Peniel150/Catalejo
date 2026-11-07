const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const int = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

export const fmtCLP = (n: number) => clp.format(Math.round(n));
export const fmtInt = (n: number) => int.format(Math.round(n));
export const fmtPct = (r: number | null, digits = 0) => (r === null ? "—" : `${(r * 100).toFixed(digits)}%`);
export const fmtGrowth = (g: number | null) => (g === null ? "nuevo" : `${g >= 0 ? "+" : "−"}${Math.abs(Math.round(g * 100))}%`);

export function scoreLevel(s: number): "high" | "mid" | "low" {
  return s >= 70 ? "high" : s >= 40 ? "mid" : "low";
}
export function deliveryLevel(r: number | null): "high" | "mid" | "low" | "none" {
  if (r === null) return "none";
  return r >= 0.85 ? "high" : r >= 0.7 ? "mid" : "low";
}
