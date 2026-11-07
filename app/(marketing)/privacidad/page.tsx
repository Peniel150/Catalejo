import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidad" };

// Borrador para revisar con un abogado antes del lanzamiento.
export default function Privacy() {
  return (
    <article className="mx-auto grid max-w-2xl gap-4 leading-relaxed">
      <h1 className="text-xl font-bold">Política de privacidad (borrador)</h1>
      <p className="text-xs text-text-muted">Pendiente de revisión legal conforme a la Ley 19.628 y la Ley 21.719 de protección de datos personales de Chile.</p>
      <h2 className="text-lg font-semibold">Qué guardamos</h2>
      <ul className="list-disc pl-6">
        <li>Tu correo, para que puedas entrar.</li>
        <li>Lo que ves en el catálogo de Dropi mientras la extensión está activa: nombre del producto, stock, precio, bodega y proveedor.</li>
        <li>Lo que ves en la biblioteca pública de anuncios: identificador del anuncio, fecha de inicio, página y dominio del anunciante.</li>
        <li>De tus reportes de pedidos: número de pedido, fechas, estado, proveedor, producto, montos y región. <b>No guardamos nombres, teléfonos, direcciones ni documentos de tus clientes</b>, ni el archivo que subes.</li>
      </ul>
      <h2 className="text-lg font-semibold">Compartir con otros usuarios</h2>
      <p>Solo si lo activas en Ajustes. Se comparten agregados (stock por producto, tasas de entrega por proveedor) y nunca se muestran con menos de 5 aportantes.</p>
      <h2 className="text-lg font-semibold">Quién procesa los datos</h2>
      <ul className="list-disc pl-6">
        <li>Supabase (base de datos y acceso)</li>
        <li>Vercel (servidor de la aplicación)</li>
        <li>Mercado Pago (pagos de la suscripción; no vemos los datos de tu tarjeta)</li>
      </ul>
      <h2 className="text-lg font-semibold">Tus derechos</h2>
      <p>Puedes descargar los datos de la extensión desde su ícono y eliminar tu cuenta en Ajustes: se borra todo en el momento.</p>
    </article>
  );
}
