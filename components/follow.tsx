"use client";
import { Star } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

const KEY = "catalejo-follow";
export function readLocalFollows(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function writeLocalFollows(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch {}
}

/** Botón Seguir. Con cuenta usa el servidor; en demostración guarda en este navegador. */
export function FollowButton({ productId, name, initial = false, action, size = "sm" }: {
  productId: string; name: string; initial?: boolean; action?: (id: string, on: boolean) => Promise<void>; size?: "sm" | "md";
}) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  useEffect(() => { if (!action) setOn(readLocalFollows().includes(productId)); }, [action, productId]);
  function toggle() {
    const next = !on;
    setOn(next);
    if (action) start(() => action(productId, next).catch(() => setOn(!next)));
    else {
      const ids = new Set(readLocalFollows());
      next ? ids.add(productId) : ids.delete(productId);
      writeLocalFollows([...ids]);
    }
  }
  return (
    <button type="button" onClick={toggle} disabled={pending} aria-pressed={on} aria-label={on ? `Dejar de seguir ${name}` : `Seguir ${name}`}
      className={`inline-flex items-center gap-1 rounded-md border ${on ? "border-accent text-accent" : "border-border text-text"} ${size === "sm" ? "h-8 px-2 text-xs" : "h-10 px-3"} hover:bg-surface disabled:opacity-60`}>
      <Star size={14} aria-hidden="true" fill={on ? "currentColor" : "none"} />{on ? "Siguiendo" : "Seguir"}
    </button>
  );
}
