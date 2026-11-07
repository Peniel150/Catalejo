// Enrutador en memoria para la demo publicada: las vistas principales se reflejan en el hash (#radar),
// los detalles (producto, competidor) viven solo en la página.
const R = (window as any).React;
type Loc = { path: string; search: string };
const TOP: Record<string, string> = { radar: "/radar", proveedores: "/proveedores", competidores: "/competidores", anuncios: "/anuncios", seguimiento: "/seguimiento", calculadora: "/herramientas", importar: "/importar", ajustes: "/ajustes" };
const BACK: Record<string, string> = Object.fromEntries(Object.entries(TOP).map(([k, v]) => [v, k]));

function fromHash(): Loc {
  const h = location.hash.replace(/^#/, "");
  return { path: TOP[h] ?? "/radar", search: "" };
}
let loc: Loc = fromHash();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function navigate(href: string, opts: { scroll?: boolean } = {}) {
  const u = new URL(href, "https://demo.local");
  let path = u.pathname === "/" ? "/radar" : u.pathname;
  loc = { path, search: u.search };
  const name = BACK[path];
  if (name && location.hash !== "#" + name) {
    try { history.replaceState(null, "", "#" + name); } catch {}
  }
  if (opts.scroll !== false && !u.hash) window.scrollTo(0, 0);
  if (u.hash) setTimeout(() => document.getElementById(u.hash.slice(1))?.scrollIntoView(), 50);
  emit();
}
window.addEventListener("hashchange", () => { const n = fromHash(); if (n.path !== loc.path) { loc = n; emit(); } });

export function useLoc(): Loc {
  return R.useSyncExternalStore((cb: () => void) => { subs.add(cb); return () => subs.delete(cb); }, () => loc);
}
export function getLoc() { return loc; }
