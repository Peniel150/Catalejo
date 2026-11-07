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

// Estructura como la del catálogo de Dropi Chile (escrita a mano a partir de una captura):
// la etiqueta "Stock" y el número van en elementos separados, igual que "Provider:" y el nombre.
const dropiCL = `
<div class="grid">
  <div class="product-card"><div class="img"><img src="r.jpg" alt=""><span>Verificado</span><button>♡</button></div>
    <div class="body"><div class="row"><span>Salud</span><span>Stock <b>958</b></span></div>
      <p class="title">2 Rodillera 2 Codera</p>
      <p><span>Provider:</span> <a>WOWI</a></p>
      <div class="prices"><div><small>Precio proveedor:</small><span>$ 5.900</span></div><div><small>Precio sugerido</small><b>$ 14.990</b></div></div>
      <button>Enviar a cliente</button></div></div>
  <div class="product-card"><div class="img"><img src="c.jpg" alt=""></div>
    <div class="body"><div class="row"><span>Hogar</span><span>Stock</span><span>400</span></div>
      <p class="title">Caja Plastica Divisiones Movibles</p>
      <p><span>Provider:</span><a>PRO OUTDOOR GLOBAL</a></p>
      <div class="prices"><small>Precio proveedor:</small><span>$ 1.990</span><small>Precio sugerido</small><b>$ 2.990</b></div>
      <button>Enviar a cliente</button></div></div>
  <div class="product-card"><div class="img"><img src="g.jpg" alt=""><span>Verificado</span></div>
    <div class="body"><div class="row"><span>Hogar</span><span>Stock <b>2.673</b></span></div>
      <p class="title">1000g Agente Impermeabilizante Dropi Cup</p>
      <p><a>IMPORTADORA PING +56912345678</a></p><p><span>Provider:</span> <a>968754918</a></p>
      <div class="prices"><small>Precio proveedor:</small><span>$ 3.000</span><small>Precio sugerido</small><b>$ 1</b></div>
      <button>Enviar a cliente</button></div></div>
</div>`;

test("Dropi Chile real: Stock y número separados, Provider separado", () => {
  const { document } = parseHTML(`<html><body>${dropiCL}</body></html>`);
  const cards = P.parseDropiCards(document.body);
  assert.equal(cards.length, 3);
  assert.deepEqual(cards.map((c) => [c.name, c.stock, c.supplier]), [
    ["2 Rodillera 2 Codera", 958, "WOWI"],
    ["Caja Plastica Divisiones Movibles", 400, "PRO OUTDOOR GLOBAL"],
    ["1000g Agente Impermeabilizante Dropi Cup", 2673, "IMPORTADORA PING +56912345678"],
  ]);
  assert.deepEqual(cards[0].prices, [5900, 14990]);
});

// Variante: sin <img> ni <a href> (imagen de fondo y botones), número de stock en un nieto del padre,
// y el nombre comercial arriba de "Provider: +569...". Escrito a mano a partir de una captura.
const dropiCL2 = `
<div class="grid">
  <app-product-card><div class="card"><div class="pic" style="background-image:url(x.jpg)"><span>Premium</span></div>
    <div class="info"><div class="top"><span>Belleza</span><div><span class="lbl">Stock</span></div><div><span class="ok">80</span></div></div>
      <div class="name">Crema Alivia Dolor</div>
      <div class="prov"><div>IMPORTADORA RVG SPA</div><div><span>Provider:</span><span>+56926235005</span></div></div>
      <div><span>Precio proveedor:</span><span>$ 2.500</span></div><div><span>Precio sugerido</span><span>$ 21.990</span></div>
      <button>Enviar a cliente</button></div></div></app-product-card>
  <app-product-card><div class="card"><div class="pic"></div>
    <div class="info"><div class="top"><span>Belleza</span><span>Stock <span class="ok">294</span></span></div>
      <div class="name">Plancha Alisador Ondulador 2 En 1</div>
      <div class="prov"><span>Provider:</span><span>SOLO CACHUREOS</span></div>
      <div><span>$ 7.990</span><span>$ 24.990</span></div><button>Enviar a cliente</button></div></div></app-product-card>
</div>`;

test("Dropi Chile: tarjetas sin imagen ni link, stock en otro bloque y proveedor con teléfono", () => {
  const { document } = parseHTML(`<html><body>${dropiCL2}</body></html>`);
  const cards = P.parseDropiCards(document.body);
  assert.deepEqual(cards.map((c) => [c.name, c.stock, c.supplier]), [
    ["Crema Alivia Dolor", 80, "IMPORTADORA RVG SPA"],
    ["Plancha Alisador Ondulador 2 En 1", 294, "SOLO CACHUREOS"],
  ]);
  const d = P.diagnoseDropi(document.body);
  assert.equal(d.stockLabels, 2);
  assert.ok(d.sample.includes("Stock"));
});

// Catálogo real de Dropi Chile (estructura del diagnóstico): stock y precios dibujados en <canvas>.
const dropiCanvas = `
<div class="grid">
  <app-card-product class="grid-item"><div class="card-box"><div class="card-box-vertical"><app-card-image><div class="box-img"><img class="card-image__img" src="h.jpg"></div></app-card-image></div>
    <div class="card-content"><div class="card-info-top"><div class="category-stock"><div>Cocina</div><div class="stock-container"><span>Stock</span><canvas></canvas></div></div>
      <h3 class="tittle-product"> Hervidor De Huevos </h3><div class="provider-data"><span>Provider:</span><span class="provider-name"> Inversiones DKC </span></div>
      <div class="card-prices"><div><div>Precio proveedor:</div><div class="price"><canvas></canvas></div></div><div><div>Precio sugerido</div><div class="price"><canvas></canvas></div></div></div></div>
      <button><div>Enviar a cliente</div></button></div></div></app-card-product>
  <app-card-product class="grid-item"><div class="card-box"><div class="card-content"><div class="category-stock"><div>Cocina</div><div class="stock-container"><span>Stock</span><canvas></canvas></div></div>
      <h3 class="tittle-product"> Vaso Termico De Acero Inoxidable </h3><div><span>Provider:</span><span> Importadora Tendenza </span></div><button><div>Enviar a cliente</div></button></div></div></app-card-product>
</div>
<div class="filter"><p>Stock:</p><span>Cantidad</span></div>`;

test("Dropi Chile catálogo con canvas: tarjetas sin stock, con nombre y proveedor", () => {
  const { document } = parseHTML(`<html><body>${dropiCanvas}</body></html>`);
  const cards = P.parseDropiCards(document.body);
  assert.deepEqual(cards.map((c) => [c.key, c.stock, c.supplier]), [
    ["name:hervidor de huevos", null, "Inversiones DKC"],
    ["name:vaso termico de acero inoxidable", null, "Importadora Tendenza"],
  ]);
});

const dropiDetail = `<main><h1> Hervidor De Huevos </h1><img src="p.jpg"><div><span>$ 7.990</span><span>$ 14.990</span></div>
  <div><span class="attribute">Stock</span><span> 16 </span></div><div><span> Stock Privado: </span><span> 0 </span></div>
  <button> Enviar al cliente </button><p>Vendido por:</p><p> Inversiones DKC </p><p>Bodegas: </p><p>LA CISTERNA</p><h3>Detalles</h3></main>`;

test("Dropi Chile ficha de producto: stock en texto, proveedor y bodega; misma clave que en el catálogo", () => {
  const { document } = parseHTML(`<html><body>${dropiDetail}</body></html>`);
  const d = P.parseDropiDetail(document, "/dashboard/product-details/20770/hervidor-de-huevos");
  assert.equal(d.key, "name:hervidor de huevos");
  assert.equal(d.id, "20770");
  assert.equal(d.stock, 16);
  assert.equal(d.supplier, "Inversiones DKC");
  assert.equal(d.warehouse, "LA CISTERNA");
  assert.deepEqual(d.prices, [7990, 14990]);
  assert.equal(P.parseDropiDetail(document, "/dashboard/search"), null);
});

test("catálogo grande (3.000 productos + 30.000 elementos de relleno) se lee rápido", () => {
  const card = (i) => `<div class="product-card"><img src="${i}.jpg"><div><span>Hogar</span><span>Stock</span><span>${100 + i}</span></div><p>Producto de prueba número ${i}</p><p><span>Provider:</span><a>Prov ${i % 9}</a></p><span>$ 1.990</span><b>$ 4.990</b></div>`;
  const filler = Array.from({ length: 30000 }, (_, i) => `<i>x${i}</i>`).join("");
  const { document } = parseHTML(`<html><body><nav>${filler}</nav><div>${Array.from({ length: 3000 }, (_, i) => card(i)).join("")}</div></body></html>`);
  const t0 = performance.now();
  const cards = P.parseDropiCards(document.body);
  const ms = performance.now() - t0;
  assert.equal(cards.length, 3000);
  assert.equal(cards[2999].stock, 3099);
  assert.ok(ms < 3000, `tardó ${Math.round(ms)} ms`);
});

test("estimación desde historial local: bajas = ventas, subidas = reposición", () => {
  const r = P.estimateFromHistory({ "2026-11-01": 100, "2026-11-03": 80, "2026-11-04": 200, "2026-11-06": 190 }, "2026-11-06");
  assert.equal(r.units7, 30);
  assert.equal(r.restock, true);
  assert.equal(r.daysObserved, 4);
});
