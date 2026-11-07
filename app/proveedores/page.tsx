import type { Metadata } from "next";
import { getSuppliers } from "@/lib/data.ts";
import { fmtInt, fmtPct } from "@/lib/format.ts";
import { DeliveryBadge, DemoNotice, PageHeader, ButtonLink } from "@/components/ui.tsx";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Proveedores" };

export default async function SuppliersPage() {
  const list = await getSuppliers();
  return (
    <>
      <PageHeader title="Proveedores que entregan" sub="Entrega efectiva, devoluciones y tiempo de despacho de cada proveedor de Dropi Chile." actions={<ButtonLink href="/importar" variant="primary">Aportar mis pedidos</ButtonLink>} />
      <DemoNotice />
      <p className="mb-4 text-xs text-text-muted">Se calcula con los reportes de pedidos que los dropshippers suben desde su cuenta de Dropi, con su permiso. Un proveedor aparece medido desde 20 pedidos; antes, verás “s/d”.</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <caption className="sr-only">Ranking de proveedores por entrega efectiva</caption>
          <thead>
            <tr className="bg-surface text-left text-xs text-text-muted">
              {["#", "Proveedor", "Entrega efectiva", "Devoluciones", "Despacho promedio", "Pedidos analizados", "Productos en radar"].map((h) => <th key={h} scope="col" className="border-b border-border px-3 py-2 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map(({ supplier, score, products }, i) => {
              const ok = score.ordersN >= 20;
              return (
                <tr key={supplier.id} className="border-b border-border last:border-0">
                  <td className="num px-3 py-2 text-text-muted">{ok ? i + 1 : "—"}</td>
                  <td className="px-3 py-2 font-medium">{supplier.name}</td>
                  <td className="px-3 py-2"><DeliveryBadge rate={ok ? score.deliveryRate : null} /></td>
                  <td className="num px-3 py-2">{ok ? fmtPct(score.returnRate) : "—"}</td>
                  <td className="num px-3 py-2">{ok ? `${score.avgDispatchHours} h` : "—"}</td>
                  <td className="num px-3 py-2">{fmtInt(score.ordersN)}{!ok && <span className="ml-2 text-xs text-text-muted">(pocos datos)</span>}</td>
                  <td className="num px-3 py-2">{products}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
