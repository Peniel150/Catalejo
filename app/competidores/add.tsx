"use client";
import { useState } from "react";
import { metaAdLibraryDomain } from "@/lib/adlinks.ts";

// Formulario para seguir un competidor. Con datos de ejemplo no guarda: muestra qué hará.
export function AddCompetitor() {
  const [value, setValue] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const clean = value.trim();
  return (
    <form className="card mb-6 flex flex-wrap items-end gap-3 p-4" onSubmit={(e) => { e.preventDefault(); if (clean) setDone(clean); }}>
      <div className="min-w-0 flex-1">
        <label htmlFor="comp" className="label">Página de Facebook, dominio o cuenta de TikTok</label>
        <input id="comp" className="input mt-1" placeholder="ej.: mitienda.cl o @mitienda" value={value} onChange={(e) => { setValue(e.target.value); setDone(null); }} />
      </div>
      <button type="submit" disabled={!clean} className="h-10 rounded-md bg-accent px-4 font-semibold text-on-accent disabled:opacity-50">Seguir competidor</button>
      {done && (
        <p className="w-full text-xs text-text-muted" role="status">
          Listo. Ahora <a className="font-semibold text-accent underline" href={metaAdLibraryDomain(done)} target="_blank" rel="noopener noreferrer">abre sus anuncios en la biblioteca</a> con la extensión activa: cada vez que la abras, guardamos cuántos anuncios tiene activos.
        </p>
      )}
    </form>
  );
}
