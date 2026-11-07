import type { Metadata } from "next";
import { EmptyState, PageHeader, ButtonLink } from "@/components/ui.tsx";

export const metadata: Metadata = { title: "Seguimiento" };

export default function Page() {
  return (
    <>
      <PageHeader title="Seguimiento" sub="Productos que sigues, con alertas de stock, reposición, precio y entrega." />
      <EmptyState
        title="Aún no sigues productos"
        body="Toca “Seguir” en un producto del radar. Te avisaremos si baja el stock, repone o cambia su tasa de entrega."
        action={<ButtonLink href="/radar" variant="primary">Ir al radar</ButtonLink>}
      />
    </>
  );
}
