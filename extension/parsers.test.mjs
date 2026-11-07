// Pruebas de los lectores con HTML de prueba escrito a mano (no copiado de los sitios reales).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { parseHTML } from "linkedom";

const require = createRequire(import.meta.url);
const P = require("./parsers.js");

const dropiFixture = `
<div class="grid">
  <div class="card"><a href="/catalogo/producto/88123"><img src="a.jpg" alt=""></a>
    <h3 title="Corrector de postura ajustable">Corrector de postura ajus...</h3>
    <p>Precio proveedor $6.500</p><p>Precio sugerido $19.990</p>
    <span>Stock: 1.284</span><span>Bodega: Santiago</span><span>Proveedor: Proveedor de prueba</span><button>Importar</button></div>
  <div class="card"><a href="/catalogo/producto/88124"><img src="b.jpg" alt=""></a>
    <h3>Lámpara de luna 3D</h3><p>$5.200</p><span>Disponibles 37</span></div>
  <div class="banner">Envíos a todo Chile</div>
</div>`;

const metaFixture = `
<div>
  <div class="ad">
    <span>Activo</span>
    <span>Identificador de la biblioteca: 1234567890123</span>
    <span>Comenzó a circular el 12 oct. 2026</span>
    <a href="https://www.facebook.com/TiendaDeEjemplo/">Tienda de Ejemplo</a>
    <a href="https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.tienda-ejemplo.cl%2Fproducto&h=x">Comprar</a>
    <video src="v.mp4"></video>
  </div>
  <div class="ad">
    <span>Inactive</span>
    <span>Library ID: 9876543210987</span>
    <span>Started running on Sep 3, 2026</span>
    <a href="https://www.facebook.com/OtraPagina">Otra Página</a>
    <img src="1.jpg"><img src="2.jpg"><img src="3.jpg">
  </div>
</div>`;

test("fechas en español e inglés", () => {
  assert.equal(P.parseDate("12 oct. 2026"), "2026-10-12");
  assert.equal(P.parseDate("3 de septiembre de 2026"), "2026-09-03");
  assert.equal(P.parseDate("Sep 3, 2026"), "2026-09-03");
  assert.equal(P.parseDate("03/09/2026"), "2026-09-03");
  assert.equal(P.parseDate("ayer"), null);
});

test("números con punto de miles", () => {
  assert.equal(P.parseIntCL("1.284"), 1284);
  assert.equal(P.parseIntCL("$19.990"), 19990);
});

test("Dropi: lee nombre, stock, precios, id y bodega de las tarjetas visibles", () => {
  const { document } = parseHTML(`<html><body>${dropiFixture}</body></html>`);
  const cards = P.parseDropiCards(document.body);
  assert.equal(cards.length, 2);
  assert.deepEqual(cards[0], {
    key: "dropi:88123", name: "Corrector de postura ajustable", stock: 1284, prices: [6500, 19990],
    url: "/catalogo/producto/88123", image: "a.jpg", warehouse: "Santiago", supplier: "Proveedor de prueba",
  });
  assert.equal(cards[1].name, "Lámpara de luna 3D");
  assert.equal(cards[1].stock, 37);
});

test("Meta Ad Library: id, fecha de inicio, estado, página, dominio y formato", () => {
  const { document } = parseHTML(`<html><body>${metaFixture}</body></html>`);
  const ads = P.parseMetaAds(document.body);
  assert.equal(ads.length, 2);
  assert.equal(ads[0].libraryId, "1234567890123");
  assert.equal(ads[0].startedOn, "2026-10-12");
  assert.equal(ads[0].isActive, true);
  assert.equal(ads[0].pageName, "Tienda de Ejemplo");
  assert.equal(ads[0].domain, "tienda-ejemplo.cl");
  assert.equal(ads[0].mediaType, "video");
  assert.equal(ads[1].isActive, false);
  assert.equal(ads[1].startedOn, "2026-09-03");
  assert.equal(ads[1].mediaType, "carousel");
});

test("estimación desde historial local: bajas = ventas, subidas = reposición", () => {
  const r = P.estimateFromHistory({ "2026-11-01": 100, "2026-11-03": 80, "2026-11-04": 200, "2026-11-06": 190 }, "2026-11-06");
  assert.equal(r.units7, 30);
  assert.equal(r.restock, true);
  assert.equal(r.daysObserved, 4);
});
