"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Bookmark, Calculator, Flag, Megaphone, Menu, Moon, Settings, Star, Sun, Truck, Upload, X } from "lucide-react";

const items = [
  { href: "/radar", label: "Radar", icon: BarChart3 },
  { href: "/proveedores", label: "Proveedores", icon: Truck },
  { href: "/competidores", label: "Competidores", icon: Flag },
  { href: "/anuncios", label: "Anuncios guardados", icon: Bookmark },
  { href: "/seguimiento", label: "Seguimiento", icon: Star },
  { href: "/importar", label: "Importar pedidos", icon: Upload },
  { href: "/herramientas", label: "Calculadora COD", icon: Calculator },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <ul className="grid gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const on = path === href || path.startsWith(href + "/");
        return (
          <li key={href}>
            <Link href={href} onClick={onNavigate} aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-sm px-3 py-2 font-medium ${on ? "bg-surface-2 text-text" : "text-text-muted hover:bg-surface-2 hover:text-text"}`}>
              <Icon size={16} aria-hidden="true" />{label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Logo() {
  return (
    <Link href="/radar" className="flex items-center gap-2 px-3 text-lg font-bold">
      <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M24.5 9.5 A11 11 0 1 0 24.5 22.5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <circle cx="16" cy="16" r="3.6" fill="var(--c-accent)" />
      </svg>
      catalejo
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-sidebar shrink-0 border-r border-border bg-surface py-4 lg:block">
      <div className="mb-6"><Logo /></div>
      <nav aria-label="Principal" className="px-3"><NavList /></nav>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" className="grid h-10 w-10 place-items-center rounded-md border border-border" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-text opacity-30" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-90 max-w-full bg-surface p-4 shadow-pop">
            <div className="mb-4 flex items-center justify-between"><Logo />
              <button type="button" className="grid h-10 w-10 place-items-center rounded-md" aria-label="Cerrar menú" onClick={() => setOpen(false)} autoFocus><X size={18} aria-hidden="true" /></button>
            </div>
            <nav aria-label="Principal"><NavList onNavigate={() => setOpen(false)} /></nav>
          </div>
        </div>
      )}
    </div>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    let t: string | null = null;
    try { t = localStorage.getItem("catalejo-theme"); } catch {}
    const isDark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("catalejo-theme", next ? "dark" : "light"); } catch {}
  }
  return (
    <button type="button" onClick={toggle} className="grid h-10 w-10 place-items-center rounded-md border border-border" aria-label={dark ? "Usar tema claro" : "Usar tema oscuro"}>
      {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}

export { Megaphone };
