// Calculadora de rentabilidad para pago contra entrega (COD) en Chile.
// Incluye lo que las calculadoras comunes omiten: pedidos que no se entregan
// y el flete de vuelta de las devoluciones.

export interface CodInput {
  salePrice: number; // precio al cliente, CLP
  productCost: number; // lo que cobra el proveedor Dropi
  freight: number; // flete de ida por pedido
  returnFreight: number; // flete de vuelta por pedido no entregado
  deliveryRate: number; // 0..1, pedidos confirmados que se entregan y se cobran
  otherCostPerOrder: number; // comisiones, empaque, etc. por pedido despachado
  cpa?: number; // costo publicitario por pedido (confirmado), opcional
}

export interface CodResult {
  profitPerDelivered: number; // ganancia por pedido entregado, antes de publicidad
  expectedProfitPerOrder: number; // por pedido despachado, ya ponderado por entrega, antes de publicidad
  breakevenCpa: number; // CPA máximo por pedido despachado para no perder
  breakevenRoas: number; // ROAS mínimo (ventas brutas de pedidos despachados / gasto)
  netPerOrder: number | null; // con el CPA ingresado
  marginOnSale: number; // margen sobre precio de venta en pedidos entregados
  warnings: string[];
}

export function codCalc(i: CodInput): CodResult {
  const dr = Math.min(1, Math.max(0, i.deliveryRate));
  const profitPerDelivered = i.salePrice - i.productCost - i.freight - i.otherCostPerOrder;
  // Pedido no entregado: el producto vuelve, pero pagas ida, vuelta y otros costos.
  const lossPerFailed = i.freight + i.returnFreight + i.otherCostPerOrder;
  const expectedProfitPerOrder = dr * profitPerDelivered - (1 - dr) * lossPerFailed;
  const breakevenCpa = Math.max(0, expectedProfitPerOrder);
  const breakevenRoas = breakevenCpa > 0 ? i.salePrice / breakevenCpa : Infinity;
  const netPerOrder = i.cpa === undefined ? null : expectedProfitPerOrder - i.cpa;
  const warnings: string[] = [];
  if (profitPerDelivered <= 0) warnings.push("Pierdes plata incluso cuando el pedido se entrega: sube el precio o busca otro proveedor.");
  if (expectedProfitPerOrder <= 0 && profitPerDelivered > 0) warnings.push("Con esta tasa de entrega, las devoluciones se comen toda la ganancia.");
  if (dr < 0.7) warnings.push("Una entrega menor a 70% es un riesgo alto en contra entrega.");
  return {
    profitPerDelivered,
    expectedProfitPerOrder: Math.round(expectedProfitPerOrder),
    breakevenCpa: Math.round(breakevenCpa),
    breakevenRoas: Number.isFinite(breakevenRoas) ? Math.round(breakevenRoas * 100) / 100 : Infinity,
    netPerOrder: netPerOrder === null ? null : Math.round(netPerOrder),
    marginOnSale: i.salePrice > 0 ? profitPerDelivered / i.salePrice : 0,
    warnings,
  };
}
