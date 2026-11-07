import { navigate } from "../store.ts";
const R = (window as any).React;
export default function Link({ href, children, scroll, onClick, ...rest }: any) {
  const h = String(href);
  const name = h.replace(/^\//, "").split(/[?#]/)[0];
  return R.createElement("a", {
    ...rest,
    href: "#" + (name === "herramientas" ? "calculadora" : name || "radar"),
    onClick: (e: any) => { onClick?.(e); if (e.defaultPrevented || e.metaKey || e.ctrlKey) return; e.preventDefault(); navigate(h, { scroll }); },
  }, children);
}
