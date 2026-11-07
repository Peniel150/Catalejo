import type { Metadata } from "next";
import { PageHeader } from "@/components/ui.tsx";

export const metadata: Metadata = { title: "Ajustes" };

export default function Page() {
  return (
    <>
      <PageHeader title="Ajustes" />
      <form className="card grid max-w-xl gap-4 p-4">
        <fieldset className="grid gap-2">
          <legend className="font-semibold">Compartir señales</legend>
          <label className="flex items-start gap-2">
            <input type="checkbox" className="mt-1 accent-accent" disabled />
            <span>
              Aportar al radar compartido el stock que veo en Dropi y el estado de mis pedidos, sin datos de mis clientes.
              <span className="block text-xs text-text-muted">Opcional. Se activa con la cuenta (próximo paso).</span>
            </span>
          </label>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="font-semibold">Extensión</legend>
          <p className="text-xs text-text-muted">La extensión solo lee lo que ya tienes en pantalla en Dropi y en las bibliotecas de anuncios. Puedes pausarla desde su ícono.</p>
        </fieldset>
      </form>
    </>
  );
}
