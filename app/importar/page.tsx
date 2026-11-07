import type { Metadata } from "next";
import { PageHeader } from "@/components/ui.tsx";

export const metadata: Metadata = { title: "Importar pedidos" };

export default function Page() {
  return (
    <>
      <PageHeader title="Importar pedidos de Dropi" sub="Sube el reporte de pedidos que descargas en tu cuenta de Dropi. Con él medimos qué proveedores entregan." />
      <div className="card grid gap-3 p-6">
        <label htmlFor="file" className="grid place-items-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-12 text-center">
          <span className="font-semibold">Arrastra el archivo aquí o elige uno</span>
          <span className="text-xs text-text-muted">Excel (.xlsx) o CSV</span>
          <input id="file" type="file" accept=".xlsx,.csv" className="sr-only" disabled aria-describedby="imp-note" />
        </label>
        <p id="imp-note" className="text-xs text-text-muted">
          No guardamos nombres, teléfonos ni direcciones de tus clientes: solo la región, el estado del pedido y el proveedor. La importación se activa al conectar la base de datos (próximo paso).
        </p>
      </div>
    </>
  );
}
