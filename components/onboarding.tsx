import Link from "next/link";
import { Calculator, Puzzle, Flag, Laptop, Plug, Truck } from "lucide-react";

// Lo que ve un usuario nuevo cuando el radar todavía no tiene datos reales.
export function RadarOnboarding() {
  const steps = [
    { icon: Puzzle, title: "Instala la extensión en tu computador", body: "Funciona en Google Chrome de escritorio (en el celular los navegadores no aceptan extensiones).", href: "/extension", cta: "Descargar e instalar" },
    { icon: Plug, title: "Conéctala a tu cuenta", body: "En Ajustes crea tu código y pégalo en la extensión. Toma 1 minuto.", href: "/ajustes#extension", cta: "Crear mi código" },
    { icon: Laptop, title: "Navega tu catálogo de Dropi como siempre", body: "Cada producto que veas aparece aquí al instante. Las ventas estimadas se calculan desde el segundo día, cuando hay dos fotos del stock para comparar." },
  ];
  return (
    <section aria-labelledby="h-onb" className="grid gap-6">
      <div className="card grid gap-5 p-5">
        <div>
          <h2 id="h-onb" className="text-lg font-semibold">Tu radar se llena con lo que ves en Dropi</h2>
          <p className="mt-1 text-text-muted">Todavía no hay productos porque aquí solo aparecen datos reales. Son 3 pasos, y después se llena solo mientras trabajas.</p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="grid content-start gap-2 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <span className="num grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-semibold text-on-accent" aria-hidden="true">{i + 1}</span>
                <s.icon size={18} className="text-text-muted" aria-hidden="true" />
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-text-muted">{s.body}</p>
              {s.href && <Link href={s.href} className="mt-1 inline-flex h-10 w-fit items-center rounded-md bg-accent px-4 font-semibold text-on-accent">{s.cta}</Link>}
            </li>
          ))}
        </ol>
      </div>
      <div className="grid gap-3">
        <h2 className="text-lg font-semibold">Mientras tanto, ya puedes usar</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Calculator, title: "Calculadora de contra entrega", body: "Cuánto puedes pagar por pedido en anuncios sin perder, con devoluciones incluidas.", href: "/herramientas" },
            { icon: Flag, title: "Espiar a tu competencia", body: "Agrega una tienda o página de Facebook y abre sus anuncios activos en Chile.", href: "/competidores" },
            { icon: Truck, title: "Medir a tus proveedores", body: "Sube el reporte de pedidos de tu cuenta Dropi y ve cuánto entrega cada proveedor.", href: "/importar" },
          ].map((x) => (
            <li key={x.title}>
              <Link href={x.href} className="card grid h-full gap-2 p-4 hover:bg-surface">
                <x.icon size={18} className="text-accent" aria-hidden="true" />
                <span className="font-semibold">{x.title}</span>
                <span className="text-text-muted">{x.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
