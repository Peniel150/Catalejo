import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateDailySales, scoreProduct, saturationFor } from "../lib/score.ts";
import { codCalc } from "../lib/cod.ts";
import { metaAdLibrarySearch } from "../lib/adlinks.ts";

test("caída de stock = ventas; subida = reposición, no venta", () => {
  const d = estimateDailySales([
    { day: "2026-11-01", stock: 100 },
    { day: "2026-11-02", stock: 90 },
    { day: "2026-11-03", stock: 200 },
    { day: "2026-11-04", stock: 185 },
  ]);
  assert.deepEqual(d.map((x) => x.units), [0, 10, 0, 15]);
  assert.equal(d[2].restock, true);
});

test("hueco de días: la caída se reparte, no se infla un día", () => {
  const d = estimateDailySales([{ day: "2026-11-01", stock: 100 }, { day: "2026-11-04", stock: 70 }]);
  assert.equal(d.length, 4);
  assert.deepEqual(d.slice(1).map((x) => x.units), [10, 10, 10]);
});

test("varias bodegas el mismo día se suman", () => {
  const d = estimateDailySales([
    { day: "2026-11-01", stock: 50, warehouse: "A" }, { day: "2026-11-01", stock: 50, warehouse: "B" },
    { day: "2026-11-02", stock: 45, warehouse: "A" }, { day: "2026-11-02", stock: 40, warehouse: "B" },
  ]);
  assert.equal(d[1].units, 15);
});

test("saturación por anunciantes", () => {
  assert.equal(saturationFor(3), "baja");
  assert.equal(saturationFor(15), "media");
  assert.equal(saturationFor(40), "alta");
});

test("puntaje: más ventas efectivas y buen proveedor puntúan más; siempre 0..100 y explicado", () => {
  const obs = (perDay: number) => Array.from({ length: 15 }, (_, i) => ({ day: `2026-11-${String(i + 1).padStart(2, "0")}`, stock: 2000 - i * perDay }));
  const p = (id: string, perDay: number) => ({ id, name: id, category: "x", supplierId: "s", supplierCost: 5000, suggestedPrice: 15000, listedOn: "2026-10-01", observations: obs(perDay) });
  const good = scoreProduct({ product: p("a", 40), ads: [], supplier: { supplierId: "s", ordersN: 200, contributorsN: 6, deliveryRate: 0.92, returnRate: 0.05, avgDispatchHours: 20 }, today: "2026-11-15" });
  const bad = scoreProduct({ product: p("b", 2), ads: [], supplier: { supplierId: "s", ordersN: 200, contributorsN: 6, deliveryRate: 0.55, returnRate: 0.3, avgDispatchHours: 70 }, today: "2026-11-15" });
  assert.ok(good.score > bad.score);
  assert.equal(good.estUnits7d, 280);
  assert.equal(good.effectiveUnits7d, Math.round(280 * 0.92));
  for (const s of [good, bad]) { assert.ok(s.score >= 0 && s.score <= 100); assert.ok(s.components.length >= 6); }
});

test("proveedor con menos de 20 pedidos no se usa (dato no confiable)", () => {
  const s = scoreProduct({ product: { id: "a", name: "a", category: "x", supplierId: "s", supplierCost: 1, suggestedPrice: 2, listedOn: "2026-10-01", observations: [{ day: "2026-11-14", stock: 10 }, { day: "2026-11-15", stock: 5 }] }, ads: [], supplier: { supplierId: "s", ordersN: 5, contributorsN: 1, deliveryRate: 1, returnRate: 0, avgDispatchHours: 1 }, today: "2026-11-15" });
  assert.equal(s.supplierDeliveryRate, null);
  assert.equal(s.effectiveUnits7d, null);
});

test("calculadora COD: las devoluciones bajan el CPA de equilibrio", () => {
  const base = { salePrice: 19990, productCost: 7000, freight: 3500, returnFreight: 3500, otherCostPerOrder: 500 };
  const perfect = codCalc({ ...base, deliveryRate: 1 });
  const real = codCalc({ ...base, deliveryRate: 0.75 });
  assert.equal(perfect.profitPerDelivered, 8990);
  assert.equal(perfect.breakevenCpa, 8990);
  // 0.75*8990 - 0.25*(3500+3500+500) = 6742.5 - 1875 = 4867.5
  assert.equal(real.breakevenCpa, 4868);
  assert.ok(real.breakevenRoas > perfect.breakevenRoas);
  assert.equal(codCalc({ ...base, deliveryRate: 0.3 }).breakevenRoas, Infinity);
});

test("link de la biblioteca de Meta: Chile, activos, búsqueda", () => {
  const u = new URL(metaAdLibrarySearch("corrector de postura"));
  assert.equal(u.searchParams.get("country"), "CL");
  assert.equal(u.searchParams.get("active_status"), "active");
  assert.equal(u.searchParams.get("q"), "corrector de postura");
});
