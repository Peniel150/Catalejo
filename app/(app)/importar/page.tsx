import type { Metadata } from "next";
import { PageHeader } from "@/components/ui.tsx";
import { hasDatabase } from "@/lib/server/db.ts";
import { authEnabled } from "@/lib/supabase/server.ts";
import { ImportForm } from "./form.tsx";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Importar pedidos" };

export default function Page() {
  const enabled = hasDatabase() && authEnabled();
  return (
    <>
      <PageHeader title="Importar pedidos de Dropi" sub="Sube el reporte de pedidos que descargas en tu cuenta de Dropi. Con él medimos qué proveedores entregan." />
      <ImportForm enabled={enabled} />
    </>
  );
}
