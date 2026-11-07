import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgePercent, Bell, Calculator, Flag, ShieldCheck, Truck } from "lucide-react";
import { currentUser } from "@/lib/supabase/server.ts";
import { Pricing } from "./pricing.tsx";

export const metadata: Metadata = {
  title: { absolute: "Catalejo: qué se vende en Dropi y qué proveedor entrega" },
  description: "Ventas estimadas de los productos de Dropi Chile, la entrega efectiva de cada proveedor y los anuncios de tu competencia. Plan gratis.",
};
export const dynamic = "force-dynamic";

const features = [
  { icon: Truck, title: "Proveedores que entregan", body: "Ve qué porcentaje de pedidos entrega cada proveedor, cuántos se devuelven y cuánto tarda en despachar. Antes de vender, no después." },
  { icon: BadgePercent, title: "Ventas efectivas, no solo ventas", body: "El radar ordena por lo que realmente se entrega y se cobra: ventas estimadas por la tasa de entrega del proveedor." },
  { icon: Flag, title: "Los anuncios de tu competencia", body: "Quién anuncia cada producto en Chile, hace cuántos días y cuántos anuncios nuevos lanza cada competidor que sigues." },
  { icon: Calculator, title: "Calculadora de contra entrega real", body: "Incluye los pedidos que no se entregan y el flete de vuelta. Te dice cuánto puedes pagar por pedido sin perder." },
  { icon: Bell, title: "Avisos de lo que sigues", body: "Stock para menos de una semana, reposiciones y productos que suben o caen fuerte." },
  { icon: ShieldCheck, title: "Los datos de tus clientes no salen de tu archivo", body: "Al importar tus pedidos leemos estado, proveedor y región. Nunca nombres, teléfonos ni direcciones." },
];

const faqs = [
  { q: "¿Las ventas que muestra son reales?", a: "Son estimaciones: Catalejo mira cuánto baja el stock de cada producto de un día a otro e ignora las reposiciones. Por eso siempre dice “estimado”. La entrega del proveedor sí sale de pedidos reales que los usuarios importan." },
  { q: "¿De dónde salen los datos si Dropi no tiene una API pública?", a: "De la extensión: mientras navegas tu catálogo de Dropi, registra el stock que ya tienes en pantalla, una vez por producto y día. No abre páginas sola ni recorre el catálogo por su cuenta. Si activas “compartir señales”, tus observaciones se suman a las de otros usuarios y el radar cubre más productos." },
  { q: "¿Cómo veo los anuncios de un producto?", a: "Desde cada producto abres la biblioteca pública de anuncios de Meta ya filtrada por Chile. Con la extensión activa, cada anuncio muestra los días que lleva activo y lo puedes guardar o seguir al anunciante." },
  { q: "¿Funciona fuera de Chile o con otros proveedores?", a: "Por ahora solo Dropi Chile. Preferimos hacer bien un país antes de sumar otros." },
  { q: "¿Puedo importar mis pedidos de Dropi?", a: "Sí, en los planes Básico y Pro: subes el reporte de pedidos (Excel o CSV) que descargas en tu cuenta y medimos la entrega de tus proveedores." },
  { q: "¿Cómo cancelo?", a: "En Ajustes, con un clic. Mantienes tu plan hasta el fin del período pagado, y si no te sirvió, te devolvemos el pago dentro de 14 días." },
  { q: "¿Necesito Shopify?", a: "No. Catalejo funciona con tu cuenta de Dropi y Chrome. Da igual dónde tengas tu tienda." },
];

export default async function Landing() {
  if (await currentUser()) redirect("/radar");
  return (
    <>
      <section className="grid gap-8 py-12 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:py-20" aria-labelledby="hero">
        <div className="grid gap-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-brass">Para dropshippers de Dropi Chile</p>
          <h1 id="hero" className="text-display font-bold">Qué se vende en Dropi y qué proveedor de verdad entrega.</h1>
          <p className="text-base text-text-muted">Catalejo estima las ventas de cada producto, mide la entrega efectiva de cada proveedor y te muestra los anuncios de tu competencia. Para que elijas por ganancia, no por volumen.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/radar" className="inline-flex h-12 items-center rounded-md bg-accent px-6 font-semibold text-on-accent">Pruébalo gratis, sin tarjeta</Link>
            <Link href="#como-funciona" className="inline-flex h-12 items-center rounded-md border border-border px-6">Cómo funciona</Link>
          </div>
        </div>
        <figure className="card overflow-hidden">
          <picture>
            <source srcSet="/radar-oscuro.png" media="(prefers-color-scheme: dark)" />
            <img src="/radar-claro.png" width={1440} height={900} alt="Pantalla del radar de Catalejo: productos de Dropi con puntaje, ventas estimadas, ventas efectivas, tendencia, entrega del proveedor y anunciantes." className="h-auto w-full" />
          </picture>
          <figcaption className="border-t border-border px-3 py-2 text-xs text-text-muted">El radar de Catalejo, con datos de ejemplo.</figcaption>
        </figure>
      </section>

      <section className="grid gap-4 border-y border-border py-12 lg:grid-cols-3" aria-labelledby="problema">
        <h2 id="problema" className="text-xl font-bold lg:col-span-1">Un producto que vende 400 unidades no sirve si se entrega la mitad.</h2>
        <div className="grid gap-2">
          <h3 className="font-semibold">Proveedores que no despachan</h3>
          <p className="text-text-muted">Eliges un producto que se ve ganador, y el proveedor despacha cuando quiere o manda unidades defectuosas. Te enteras con la campaña ya corriendo.</p>
        </div>
        <div className="grid gap-2">
          <h3 className="font-semibold">Pedidos que no llegan</h3>
          <p className="text-text-muted">En contra entrega pagas el flete de ida y de vuelta de cada pedido que no se entrega. Con una entrega baja, las devoluciones se comen toda la ganancia.</p>
        </div>
      </section>

      <section id="como-funciona" className="py-12" aria-labelledby="h-como">
        <h2 id="h-como" className="mb-6 text-xl font-bold">Cómo funciona</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["Instala la extensión y navega Dropi como siempre", "Registra el stock que ves en pantalla, una vez por producto y día. Puedes pausarla cuando quieras."],
            ["Catalejo cruza ventas con entregas", "Estima las ventas por la caída de stock y las multiplica por la entrega real del proveedor. Así sale el puntaje de cada producto."],
            ["Revisa a la competencia y testea", "Mira quién lo anuncia en Chile y hace cuántos días, calcula tu CPA máximo y sigue el producto."],
          ].map(([t, b], i) => (
            <li key={t} className="card grid gap-2 p-5">
              <span className="num grid h-8 w-8 place-items-center rounded-full bg-accent text-sm font-semibold text-on-accent" aria-hidden="true">{i + 1}</span>
              <h3 className="font-semibold">{t}</h3>
              <p className="text-text-muted">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-12" aria-labelledby="h-features">
        <h2 id="h-features" className="mb-6 text-xl font-bold">Lo que otras herramientas no te muestran</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <li key={title} className="grid gap-2 rounded-lg border border-border p-5">
              <Icon size={20} className="text-accent" aria-hidden="true" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="precios" className="py-12" aria-labelledby="h-precios">
        <h2 id="h-precios" className="mb-2 text-xl font-bold">Precios en pesos chilenos</h2>
        <p className="mb-6 text-text-muted">Empieza gratis. Paga con Mercado Pago. Cancela en un clic.</p>
        <Pricing />
      </section>

      <section id="preguntas" className="py-12" aria-labelledby="h-faq">
        <h2 id="h-faq" className="mb-6 text-xl font-bold">Preguntas frecuentes</h2>
        <div className="grid max-w-3xl gap-2">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-lg border border-border p-4 open:bg-surface">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="mr-2 inline-block text-accent transition-transform group-open:rotate-90" aria-hidden="true">›</span>{f.q}
              </summary>
              <p className="mt-2 text-text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="my-12 grid place-items-center gap-4 rounded-lg bg-surface px-6 py-12 text-center" aria-labelledby="h-cta">
        <h2 id="h-cta" className="text-xl font-bold">Elige tu próximo producto por lo que se entrega.</h2>
        <Link href="/radar" className="inline-flex h-12 items-center rounded-md bg-accent px-6 font-semibold text-on-accent">Pruébalo gratis, sin tarjeta</Link>
      </section>
    </>
  );
}
