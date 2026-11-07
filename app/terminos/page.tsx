import type { Metadata } from "next";

export const metadata: Metadata = { title: "Términos" };

// Borrador para revisar con un abogado antes del lanzamiento.
export default function Terms() {
  return (
    <article className="mx-auto grid max-w-2xl gap-4 leading-relaxed">
      <h1 className="text-xl font-bold">Términos de uso (borrador)</h1>
      <p className="text-xs text-text-muted">Pendiente de revisión legal.</p>
      <ul className="list-disc pl-6">
        <li>Las ventas que muestra Catalejo son <b>estimaciones</b> a partir de la caída de stock observada. No son ventas confirmadas ni una garantía de resultados.</li>
        <li>Usa la extensión solo con tu propia cuenta de Dropi y respetando sus términos de uso.</li>
        <li>Los anuncios y creativos pertenecen a sus anunciantes. Catalejo guarda links a la biblioteca pública; no los copies.</li>
        <li>Cancelas tu suscripción cuando quieras desde Ajustes, en un clic.</li>
        <li>Catalejo no está afiliado a Dropi, Meta ni TikTok.</li>
      </ul>
    </article>
  );
}
