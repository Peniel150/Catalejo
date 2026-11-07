// Pruebas de la extensión cargada en Chromium, con páginas de prueba propias servidas
// en las direcciones de Dropi y de la biblioteca de anuncios (no se contacta ningún sitio real).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "./helpers.mjs";

const EXT = fileURLToPath(new URL("../extension", import.meta.url));
const HTML = { contentType: "text/html; charset=utf-8" };
const GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const dropi = (stock) => `<html><body><div class="grid">
<div class="card"><a href="/catalogo/producto/88123"><img src="${GIF}" alt=""></a><h3 title="Corrector de postura ajustable">Corrector</h3><p>Precio proveedor $6.500</p><span>Stock: ${stock}</span><span>Bodega: Santiago</span><span>Proveedor: Proveedor de prueba</span></div>
<div class="card"><a href="/catalogo/producto/88124"><img src="${GIF}" alt=""></a><h3>Lámpara de luna 3D</h3><p>$5.200</p><span>Disponibles 37</span></div></div></body></html>`;
// Como Dropi Chile real: catálogo con stock dibujado en <canvas> y ficha con stock en texto.
const dropiCanvasCatalog = `<html><body><div class="grid">
<app-card-product><div class="card-content"><div><div>Cocina</div><div><span>Stock</span><canvas></canvas></div></div><h3> Hervidor De Huevos </h3><div><span>Provider:</span><span> Inversiones DKC </span></div><div><div>Precio proveedor:</div><canvas></canvas></div><button>Enviar a cliente</button></div></app-card-product>
<app-card-product><div class="card-content"><div><div>Cocina</div><div><span>Stock</span><canvas></canvas></div></div><h3> Vaso Termico </h3><div><span>Provider:</span><span> Tendenza </span></div><div><div>Precio proveedor:</div><canvas></canvas></div><button>Enviar a cliente</button></div></app-card-product>
</div></body></html>`;
const dropiDetail = `<html><body><main><h1> Hervidor De Huevos </h1><div><span>$ 7.990</span></div><div><span>Stock</span><span> 16 </span></div><div><span> Stock Privado: </span><span> 0 </span></div><p>Vendido por:</p><p> Inversiones DKC </p><p>Bodegas: </p><p>LA CISTERNA</p></main></body></html>`;
const meta = `<html><body><div class="ad"><span>Activo</span><span>Identificador de la biblioteca: 1234567890123</span><span>Comenzó a circular el 12 oct. 2026</span>
<a href="https://www.facebook.com/TiendaDeEjemplo/">Tienda de Ejemplo</a><a href="https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.tienda-ejemplo.cl%2F">Comprar</a></div></body></html>`;

let ctx, sw, stock = 1284;
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const yesterday = new Date(Date.parse(today + "T12:00:00Z") - 86400000).toISOString().slice(0, 10);

before(async () => {
  ctx = await chromium.launchPersistentContext("", { channel: "chromium", headless: true, args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] });
  await ctx.route("https://app.dropi.cl/**", (r) => {
    const u = r.request().url();
    if (u.includes("/dashboard/search")) return r.fulfill({ ...HTML, body: dropiCanvasCatalog });
    if (u.includes("/product-details/")) return r.fulfill({ ...HTML, body: dropiDetail });
    return r.fulfill({ ...HTML, body: dropi(stock) });
  });
  await ctx.route("https://www.facebook.com/**", (r) => r.fulfill({ ...HTML, body: meta }));
  sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker"));
});
after(async () => { await ctx?.close(); });

const storage = () => sw.evaluate(() => chrome.storage.local.get(null));

test("E01-H1 Dropi: etiqueta en cada producto, aviso visible y registro una vez por día", async () => {
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("https://app.dropi.cl/catalogo");
  await p.locator(".catalejo-badge").nth(1).waitFor({ timeout: 8000 });
  assert.equal(await p.locator(".catalejo-badge").count(), 2);
  assert.match(await p.locator("#catalejo-indicator").textContent(), /registra el stock que ves · 2 hoy/);
  await p.reload(); await p.locator(".catalejo-badge").nth(1).waitFor({ timeout: 8000 });
  const s = await storage();
  assert.equal(s.queue.filter((q) => q.kind === "dropi_stock").length, 2, "recargar no duplica el registro del día");
  assert.equal(s.queue[0].supplier, "Proveedor de prueba");
  assert.deepEqual(errs, []);
  await p.close();
});

test("E01-H2 Dropi: al segundo día muestra ventas estimadas por caída de stock", async () => {
  await sw.evaluate(({ y }) => chrome.storage.local.get("history").then(({ history }) => {
    history["dropi:88123"].days[y] = 1320; // ayer había 1.320; hoy 1.284 → 36 ventas
    return chrome.storage.local.set({ history });
  }), { y: yesterday });
  const p = await ctx.newPage();
  await p.goto("https://app.dropi.cl/catalogo");
  await p.getByText("Catalejo: ~36 ventas 7d").waitFor({ timeout: 8000 });
  await p.close();
});

test("E01-H3 Dropi Chile real: el stock se registra en la ficha y se ve en la tarjeta del catálogo", async () => {
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("https://app.dropi.cl/dashboard/search");
  await p.getByText("Catalejo: abre el producto para registrar su stock").first().waitFor({ timeout: 8000 });
  assert.equal(await p.locator(".catalejo-badge").count(), 2);
  await p.goto("https://app.dropi.cl/dashboard/product-details/20770/hervidor-de-huevos");
  await p.getByText("stock 16 registrado").waitFor({ timeout: 8000 });
  const s = await storage();
  const q = s.queue.find((x) => x.key === "name:hervidor de huevos");
  assert.equal(q.stock, 16);
  assert.equal(q.supplier, "Inversiones DKC");
  await p.goto("https://app.dropi.cl/dashboard/search");
  await p.getByText("Catalejo: stock registrado hoy, vuelve mañana").waitFor({ timeout: 8000 });
  assert.deepEqual(errs, []);
  await p.close();
});

test("E02-H1 biblioteca de anuncios: días activo, guardar y seguir anunciante", async () => {
  const p = await ctx.newPage();
  await p.goto("https://www.facebook.com/ads/library/?active_status=active&country=CL&q=corrector");
  const bar = p.locator(".catalejo-adbar");
  await bar.waitFor({ timeout: 8000 });
  const days = Math.round((Date.parse(today) - Date.parse("2026-10-12")) / 86400000);
  assert.match(await bar.textContent(), new RegExp(`${days} d activo`));
  assert.match(await bar.getByRole("link").getAttribute("href"), /q=tienda-ejemplo\.cl/);
  await bar.getByRole("button", { name: "Guardar" }).click();
  await bar.getByRole("button", { name: "Seguir anunciante" }).click();
  await p.waitForTimeout(300);
  const s = await storage();
  assert.equal(s.savedAds.length, 1);
  assert.equal(s.competitors[0].name, "Tienda de Ejemplo");
  assert.ok(s.queue.some((q) => q.kind === "meta_ad" && q.libraryId === "1234567890123"));
  await p.close();
});

test("E03-H1 pausa: deja de registrar hasta reanudar", async () => {
  const p = await ctx.newPage();
  await p.goto("https://www.facebook.com/ads/library/?q=x");
  await p.locator("#catalejo-indicator").waitFor({ timeout: 8000 });
  await p.getByRole("button", { name: "Pausar" }).click();
  await p.getByText("Catalejo en pausa").waitFor();
  const before = (await storage()).queue.length;
  stock = 1200;
  await p.goto("https://app.dropi.cl/catalogo");
  await p.waitForTimeout(3000);
  assert.equal((await storage()).queue.length, before, "en pausa no se agrega nada");
  assert.equal(await p.locator(".catalejo-badge").count(), 0);
  await sw.evaluate(() => chrome.storage.local.set({ paused: false }));
  await p.close();
});
