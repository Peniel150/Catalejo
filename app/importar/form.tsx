"use client";
import { useState } from "react";

type Result = { ok?: boolean; orders?: number; errors?: { row: number; message: string }[]; error?: string; ignoredColumns?: string[] };

export function ImportForm({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  async function upload(file: File) {
    setBusy(true);
    setRes(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/import", { method: "POST", body: fd });
      setRes(await r.json());
    } catch {
      setRes({ error: "No pudimos subir el archivo. Revisa tu conexión." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="card grid gap-3 p-6">
      <label htmlFor="file" className={`grid place-items-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-12 text-center ${enabled ? "cursor-pointer hover:bg-surface" : "opacity-60"}`}>
        <span className="font-semibold">{busy ? "Importando…" : "Elige el archivo del reporte"}</span>
        <span className="text-xs text-text-muted">Excel (.xlsx) o CSV, hasta 5 MB</span>
        <input id="file" type="file" accept=".xlsx,.csv" className="sr-only" disabled={!enabled || busy} aria-describedby="imp-note"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </label>
      <p id="imp-note" className="text-xs text-text-muted">
        Solo leemos el número de pedido, fechas, estado, proveedor, producto, montos y región. No guardamos nombres, teléfonos, direcciones ni el archivo.
        {!enabled && " La importación se activa al conectar la base de datos."}
      </p>
      <div aria-live="polite">
        {res?.error && <p className="rounded-md bg-score-low-bg px-3 py-2 text-xs text-score-low" role="alert">{res.error}</p>}
        {res?.ok && (
          <div className="grid gap-2 rounded-md bg-score-high-bg px-3 py-2 text-xs text-score-high">
            <p className="font-semibold">Listo: {res.orders} pedidos importados.</p>
            {!!res.errors?.length && <p>{res.errors.length} filas no se pudieron leer (por ejemplo, fila {res.errors[0].row}: {res.errors[0].message})</p>}
            {!!res.ignoredColumns?.length && <p>Columnas ignoradas: {res.ignoredColumns.join(", ")}.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
