export { addDays } from "./score.ts";
export { metaAdLibrarySearch as metaAdLibrarySearchSafe } from "./adlinks.ts";

/** Hoy en America/Santiago, como YYYY-MM-DD. */
export function todaySantiago(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
