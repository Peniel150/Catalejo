"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

export function RadarFilters({ categories }: { categories: string[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const submit = () => {
    const fd = new FormData(form.current!);
    const p = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (v) p.set(k, String(v));
    router.replace(`/radar${p.size ? "?" + p : ""}`, { scroll: false });
  };
  const sel = "h-10 rounded-md border border-border-input bg-bg px-3 text-text";
  const chk = "flex h-10 items-center gap-2 rounded-full border border-border px-3 text-xs font-medium has-[:checked]:border-text-muted has-[:checked]:bg-surface-2";
  const active = [...sp.keys()].filter((k) => k !== "sort").length;
  return (
    <form key={sp.toString()} ref={form} action="/radar" onChange={submit} onSubmit={(e) => { e.preventDefault(); submit(); }} className="mb-4 flex flex-wrap items-center gap-2" aria-label="Filtros del radar">
      <label className="sr-only" htmlFor="f-q">Buscar</label>
      <input id="f-q" name="q" defaultValue={sp.get("q") ?? ""} placeholder="Buscar producto" className={`${sel} w-full sm:w-56`} />
      <label className="sr-only" htmlFor="f-cat">Categoría</label>
      <select id="f-cat" name="category" defaultValue={sp.get("category") ?? ""} className={sel}>
        <option value="">Todas las categorías</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <label className="sr-only" htmlFor="f-del">Entrega del proveedor</label>
      <select id="f-del" name="minDelivery" defaultValue={sp.get("minDelivery") ?? ""} className={sel}>
        <option value="">Cualquier proveedor</option>
        <option value="0.8">Proveedor entrega ≥ 80%</option>
        <option value="0.9">Proveedor entrega ≥ 90%</option>
      </select>
      <label className="sr-only" htmlFor="f-stock">Stock mínimo</label>
      <select id="f-stock" name="minStock" defaultValue={sp.get("minStock") ?? ""} className={sel}>
        <option value="">Cualquier stock</option>
        <option value="100">Stock ≥ 100</option>
        <option value="500">Stock ≥ 500</option>
      </select>
      <label className="sr-only" htmlFor="f-sat">Saturación</label>
      <select id="f-sat" name="saturation" defaultValue={sp.get("saturation") ?? ""} className={sel}>
        <option value="">Cualquier saturación</option>
        <option value="baja">Saturación baja</option>
        <option value="media">Saturación media</option>
        <option value="alta">Saturación alta</option>
      </select>
      <label className="sr-only" htmlFor="f-sort">Ordenar por</label>
      <select id="f-sort" name="sort" defaultValue={sp.get("sort") ?? "score"} className={sel}>
        <option value="score">Mayor puntaje</option>
        <option value="effective">Más ventas efectivas</option>
        <option value="growth">Mayor crecimiento</option>
        <option value="margin">Mayor margen</option>
        <option value="newest">Más nuevos</option>
      </select>
      <label className={chk}><input type="checkbox" name="withAds" value="1" defaultChecked={sp.has("withAds")} className="accent-accent" />Con anuncios en Chile</label>
      <label className={chk}><input type="checkbox" name="restocked" value="1" defaultChecked={sp.has("restocked")} className="accent-accent" />Repuso stock</label>
      <label className={chk}><input type="checkbox" name="newOnly" value="1" defaultChecked={sp.has("newOnly")} className="accent-accent" />Nuevos (&lt; 30 días)</label>
      {active > 0 && (
        <button type="button" className="h-10 rounded-md border border-border px-3 text-xs font-medium" onClick={() => { form.current?.reset(); router.replace("/radar", { scroll: false }); }}>
          Limpiar filtros ({active})
        </button>
      )}
    </form>
  );
}
