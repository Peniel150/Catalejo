import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui.tsx";

export const metadata: Metadata = { title: "Extensión" };

const steps = [
  ["Descarga el archivo", "Toca el botón de abajo desde tu computador. Se descarga catalejo-extension.zip."],
  ["Descomprímelo", "Clic derecho sobre el archivo → Extraer todo. Te queda una carpeta con un archivo manifest.json adentro."],
  ["Abre las extensiones de Chrome", "Escribe chrome://extensions en la barra de direcciones y presiona Enter."],
  ["Activa el modo de desarrollador", "Es el interruptor de arriba a la derecha."],
  ["Carga la carpeta", "Toca \"Cargar descomprimida\" y elige la carpeta que descomprimiste. Fija Catalejo con el ícono de la pieza de puzzle."],
  ["Conéctala a tu cuenta", "En Ajustes crea tu código. Luego, en el ícono de Catalejo → Conectar cuenta, pega la dirección de este sitio y el código."],
  ["Navega Dropi", "Abre tu catálogo de Dropi. Verás una etiqueta de Catalejo en cada producto y los productos aparecerán en tu radar."],
];

export default function ExtensionPage() {
  return (
    <>
      <PageHeader title="Extensión de Chrome" sub="La extensión registra el stock que ves en Dropi y los días activos de los anuncios. Así se llena tu radar." />
      <div className="grid max-w-3xl gap-6">
        <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold">Catalejo para Chrome (escritorio)</p>
            <p className="text-xs text-text-muted">Versión 0.1 · Solo lee lo que ya tienes en pantalla. Puedes pausarla cuando quieras.</p>
          </div>
          <a href="/catalejo-extension.zip" download className="inline-flex h-10 items-center rounded-md bg-accent px-4 font-semibold text-on-accent">Descargar extensión</a>
        </div>
        <ol className="grid gap-3">
          {steps.map(([t, b], i) => (
            <li key={t} className="flex gap-3 rounded-lg border border-border p-4">
              <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold" aria-hidden="true">{i + 1}</span>
              <div><p className="font-semibold">{t}</p><p className="text-text-muted">{b}</p></div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-text-muted">Pronto estará en la Chrome Web Store y se instalará con un clic. <Link href="/ajustes#extension" className="underline">Ir a crear mi código</Link></p>
      </div>
    </>
  );
}
