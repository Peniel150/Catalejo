import { test } from "node:test";
import assert from "node:assert/strict";
import { mapStatus, parseCsv, parseDropiReport } from "../lib/dropi-report.ts";

// Reporte de prueba inventado (encabezados plausibles, datos ficticios), separado por ;
const csv = [
  "ID;Fecha;Estatus;Nombre cliente;Teléfono;Dirección;Región;Proveedor;Producto;Cantidad;Total;Flete;Fecha despacho",
  '1001;03-11-2026 10:15;ENTREGADO;Persona Ficticia;+56900000000;Calle Falsa 123;Metropolitana;Proveedor X;"Corrector de postura; talla M";1;19.990;3.990;04-11-2026 09:00',
  "1002;03-11-2026 11:00;DEVOLUCION;Otra Persona;+56900000001;Pasaje 1;Valparaíso;Proveedor X;Lámpara;2;31.980;3.990;",
  "1002;03-11-2026 11:00;DEVOLUCION;Otra Persona;+56900000001;Pasaje 1;Valparaíso;Proveedor X;Otro ítem;1;0;;",
  "1003;fecha mala;ENTREGADO;X;Y;Z;Biobío;Proveedor Y;P;1;9.990;;",
  "1004;04-11-2026;EN TRANSITO;X;Y;Z;Biobío;Proveedor Y;P;1;9.990;;",
  ";;;;;;;;;;;;",
].join("\n");

test("estados de Dropi a estados internos", () => {
  assert.equal(mapStatus("ENTREGADO"), "delivered");
  assert.equal(mapStatus("Devolución"), "returned");
  assert.equal(mapStatus("CANCELADO"), "cancelled");
  assert.equal(mapStatus("GUIA GENERADA"), "shipped");
  assert.equal(mapStatus("PENDIENTE CONFIRMACION"), "confirmed");
  assert.equal(mapStatus("???"), null);
});

test("lee el reporte, une líneas de la misma orden y reporta errores por fila", () => {
  const r = parseDropiReport(parseCsv(csv));
  assert.equal(r.orders.length, 3);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].row, 5);
  const o = r.orders[0];
  assert.equal(o.externalId, "1001");
  assert.equal(o.status, "delivered");
  assert.equal(o.total, 19990);
  assert.equal(o.freight, 3990);
  assert.equal(o.region, "Metropolitana");
  assert.equal(o.supplierName, "Proveedor X");
  assert.equal(o.productTitle, "Corrector de postura; talla M");
  assert.ok(o.dispatchedAt && o.dispatchedAt > o.placedAt);
  assert.equal(r.orders[1].status, "returned");
});

test("nunca extrae datos personales del cliente", () => {
  const r = parseDropiReport(parseCsv(csv));
  const json = JSON.stringify(r.orders);
  for (const pii of ["Persona Ficticia", "+5690000", "Calle Falsa", "Pasaje 1"]) assert.ok(!json.includes(pii), `filtró ${pii}`);
  assert.ok(r.ignoredColumns.includes("Nombre cliente") && r.ignoredColumns.includes("Teléfono") && r.ignoredColumns.includes("Dirección"));
});

test("si faltan columnas clave, lo dice en vez de adivinar", () => {
  const r = parseDropiReport([["Producto", "Total"], ["x", "1"]]);
  assert.equal(r.orders.length, 0);
  assert.match(r.errors[0].message, /No encontramos las columnas/);
});
