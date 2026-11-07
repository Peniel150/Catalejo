// Pruebas de punta a punta de la app en modo demostración (sin base de datos).
// Correr: npm run build && npm run e2e
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium, BASE, openPage, assertClean, assertNoHorizontalScroll, assertAccessible } from "./helpers.mjs";

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

const SCREENS = ["/radar", "/radar/p-1", "/radar/p-1?tab=anuncios", "/radar/p-1?tab=proveedor", "/proveedores", "/competidores", "/competidores/comp-1", "/anuncios", "/herramientas", "/seguimiento", "/importar", "/ajustes", "/privacidad", "/terminos"];

test("A11Y y estabilidad: cada pantalla sin errores, sin 5xx, accesible, en claro, oscuro y móvil", async () => {
  for (const scheme of ["light", "dark"]) {
    for (const width of [1440, 390]) {
      for (const path of SCREENS) {
        const page = await openPage(browser, { width, colorScheme: scheme });
        const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
        assert.equal(res.status(), 200, `${path} respondió ${res.status()}`);
        await assertNoHorizontalScroll(page);
        if (width === 1440 || scheme === "light") await assertAccessible(page, `${path} ${scheme} ${width}`);
        assertClean(page);
        await page.close();
      }
    }
  }
});

test("F01-H1 radar: muestra productos ordenados por puntaje", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/radar");
  await page.locator("table tbody tr").first().waitFor();
  const scores = await page.locator("table tbody tr td:nth-child(2) span").allTextContents();
  assert.ok(scores.length >= 10);
  const n = scores.map(Number);
  assert.deepEqual(n, [...n].sort((a, b) => b - a), "orden por puntaje descendente");
  assertClean(page);
});

test("F01-H2 radar: filtrar por categoría desde la interfaz actualiza la URL y la lista", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/radar", { waitUntil: "networkidle" });
  await page.getByLabel("Categoría").selectOption("Belleza");
  await page.waitForURL(/category=Belleza/);
  await page.waitForTimeout(300);
  const cats = await page.locator("table tbody tr td:first-child .text-xs").allTextContents();
  assert.ok(cats.length > 0 && cats.every((c) => c.startsWith("Belleza")), cats.join(","));
  assertClean(page);
});

test("F01-H3 radar: limpiar filtros vuelve a la lista completa", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/radar?category=Hogar&withAds=1", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Limpiar filtros/ }).click();
  await page.waitForURL((u) => !u.search.includes("category"));
  await page.waitForTimeout(300);
  assert.equal(await page.getByLabel("Categoría").inputValue(), "");
  assertClean(page);
});

test("F01-E1 radar: búsqueda sin resultados muestra estado vacío con acción", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/radar?q=" + encodeURIComponent("zzzz-no-existe"));
  await page.getByText("No hay productos con estos filtros").waitFor();
  assert.ok(await page.getByRole("link", { name: "Limpiar filtros" }).isVisible());
  assertClean(page);
});

test("F01-E2 radar: acentos, emoji y texto muy largo no rompen nada", async () => {
  const page = await openPage(browser);
  for (const q of ["lámpara", "🔥🔥", "a".repeat(2000), "<script>alert(1)</script>", "' or 1=1 --"]) {
    const res = await page.goto(BASE + "/radar?q=" + encodeURIComponent(q));
    assert.equal(res.status(), 200, q.slice(0, 20));
  }
  await page.goto(BASE + "/radar?q=" + encodeURIComponent("lámpara"));
  assert.ok(await page.getByRole("link", { name: /Lámpara de luna/ }).first().isVisible(), "busca con acentos");
  assertClean(page);
});

test("F01-E3 radar: parámetros inválidos se ignoran sin error", async () => {
  const page = await openPage(browser);
  const res = await page.goto(BASE + "/radar?minStock=abc&minDelivery=-5&sort=nada&saturation=xx");
  assert.equal(res.status(), 200);
  const full = await (await page.goto(BASE + "/radar")).text();
  await page.goto(BASE + "/radar?minStock=abc&minDelivery=-5&sort=nada&saturation=xx");
  assert.ok((await page.locator("table tbody tr").count()) > 0, "BUG-001: el radar no debe quedar vacío");
  assert.ok(full.length > 0);
  assertClean(page);
});

test("F01-H4 radar: en móvil se ven tarjetas, no la tabla", async () => {
  const page = await openPage(browser, { width: 390 });
  await page.goto(BASE + "/radar");
  await page.locator("main ul li.card").first().waitFor();
  assert.equal(await page.locator("table").isVisible(), false);
  assert.ok((await page.locator("main ul li.card").count()) > 0);
  await assertNoHorizontalScroll(page);
  assertClean(page);
});

test("F01-K1 teclado: se llega al primer producto y se abre con Enter", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/radar", { waitUntil: "networkidle" });
  const first = page.locator("table tbody tr td:first-child a").first();
  const name = await first.textContent();
  let reached = false;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    if (await first.evaluate((el) => el === document.activeElement)) { reached = true; break; }
  }
  assert.ok(reached, "el primer producto es alcanzable con Tab");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/radar\/p-/);
  assert.equal((await page.getByRole("heading", { level: 1 }).textContent())?.trim(), name?.trim());
  assertClean(page);
});

test("F02-H1 detalle: el puntaje mostrado es la suma de sus componentes", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/radar/p-2");
  const total = Number(await page.locator('[aria-label^="Puntaje"]').first().textContent());
  const pts = (await page.locator("#h-puntaje + ul li span.num").allTextContents()).map((t) => Number(t.replace("+", "")));
  const sum = Math.max(0, Math.min(100, pts.reduce((a, b) => a + b, 0)));
  assert.equal(total, sum, `puntaje ${total} vs suma ${sum}`);
  assertClean(page);
});

test("F02-H2 anuncios: los botones abren la biblioteca de Meta con Chile y solo activos", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/radar/p-1?tab=anuncios");
  const href = await page.getByRole("link", { name: /Buscar en Facebook e Instagram/ }).getAttribute("href");
  const u = new URL(href);
  assert.equal(u.hostname, "www.facebook.com");
  assert.equal(u.searchParams.get("country"), "CL");
  assert.equal(u.searchParams.get("active_status"), "active");
  assert.ok((await page.locator("article").count()) > 0, "muestra anuncios");
  for (const a of await page.locator("article a").all()) assert.equal(await a.getAttribute("rel"), "noopener noreferrer");
  assertClean(page);
});

test("F02-N1 producto o competidor inexistente: 404 con salida", async () => {
  const page = await openPage(browser);
  assert.equal((await page.goto(BASE + "/competidores/no-existe")).status(), 404);
  const res = await page.goto(BASE + "/radar/no-existe");
  assert.equal(res.status(), 404);
  assert.ok(await page.getByRole("link", { name: "Volver al radar" }).isVisible());
});

test("F03-H1 calculadora: recalcula al escribir y avisa cuando no es rentable", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/herramientas", { waitUntil: "networkidle" });
  await page.getByLabel("Precio de venta al cliente").fill("19990");
  await page.getByLabel("Costo del producto en Dropi").fill("7000");
  await page.getByLabel("Flete de ida por pedido").fill("3500");
  await page.getByLabel("Flete de devolución").fill("3500");
  await page.getByLabel("Tasa de entrega efectiva (%)").fill("75");
  const cpa = page.locator("dt", { hasText: "CPA máximo para no perder" }).locator("xpath=following-sibling::dd");
  assert.equal((await cpa.textContent())?.replace(/\D/g, ""), "4868");
  await page.getByLabel("Tasa de entrega efectiva (%)").fill("30");
  await page.getByText("las devoluciones se comen toda la ganancia").waitFor();
  assertClean(page);
});

test("F03-E1 calculadora: letras, vacíos y más de 100% no rompen el cálculo", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/herramientas", { waitUntil: "networkidle" });
  await page.getByLabel("Precio de venta al cliente").fill("abc");
  assert.equal(await page.getByLabel("Precio de venta al cliente").inputValue(), "");
  await page.getByLabel("Tasa de entrega efectiva (%)").fill("250");
  const txt = await page.locator('section[aria-label="Resultado"]').textContent();
  assert.ok(!/NaN|Infinity|undefined/.test(txt), txt);
  assertClean(page);
});

test("F03-H2 calculadora: llega prellenada desde un producto", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/radar/p-1");
  await page.getByRole("link", { name: "Ajustar en la calculadora" }).click();
  await page.waitForURL(/herramientas\?price=/);
  await page.waitForLoadState("networkidle");
  assert.equal(await page.getByLabel("Precio de venta al cliente").inputValue(), "19990");
  assertClean(page);
});

test("F04-H1 competidores: seguir uno muestra la confirmación con link a sus anuncios", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/competidores", { waitUntil: "networkidle" });
  const btn = page.getByRole("button", { name: "Seguir competidor" });
  assert.equal(await btn.isDisabled(), true, "deshabilitado sin texto");
  await page.getByLabel(/Página de Facebook, dominio/).fill("mitienda.cl");
  await btn.click();
  const link = page.getByRole("link", { name: "abre sus anuncios en la biblioteca" });
  await link.waitFor();
  assert.match(await link.getAttribute("href"), /q=mitienda\.cl/);
  assertClean(page);
});

test("F06 sin base de datos: las APIs fallan cerradas", async () => {
  const r1 = await fetch(BASE + "/api/ext/observations", { method: "POST", body: "{}" });
  assert.equal(r1.status, 503);
  const r2 = await fetch(BASE + "/api/cron/compute-scores");
  assert.equal(r2.status, 401);
  const r3 = await fetch(BASE + "/api/webhooks/mercadopago", { method: "POST", body: "{}" });
  assert.equal(r3.status, 503);
  const r4 = await fetch(BASE + "/api/import", { method: "POST" });
  assert.equal(r4.status, 503);
});

test("Tema: el botón cambia a oscuro y se recuerda al recargar", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/radar", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Usar tema oscuro" }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  assertClean(page);
});

test("Menú móvil: abre, navega y se cierra con Escape", async () => {
  const page = await openPage(browser, { width: 390 });
  await page.goto(BASE + "/radar", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Abrir menú" }).click();
  const dialog = page.getByRole("dialog", { name: "Menú" });
  await dialog.waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await dialog.count(), 0);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await dialog.getByRole("link", { name: "Proveedores" }).click();
  await page.waitForURL(/proveedores/);
  assertClean(page);
});

test("F05-H1 seguimiento: seguir desde el radar aparece en Seguimiento y se puede dejar de seguir", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/radar", { waitUntil: "networkidle" });
  const first = page.locator("table tbody tr").first();
  const name = (await first.locator("td:first-child a").textContent()).trim();
  await first.getByRole("button", { name: `Seguir ${name}` }).click();
  assert.equal(await first.getByRole("button", { name: `Dejar de seguir ${name}` }).getAttribute("aria-pressed"), "true");
  await page.goto(BASE + "/seguimiento", { waitUntil: "networkidle" });
  await page.getByRole("link", { name }).waitFor();
  await page.getByRole("button", { name: `Dejar de seguir ${name}` }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Aún no sigues productos").waitFor();
  assertClean(page);
});

test("F02-H3 detalle: muestra productos parecidos con su entrega", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/radar/p-1");
  await page.getByRole("heading", { name: "Productos parecidos" }).waitFor();
  assert.ok((await page.locator("#h-sim ~ ul li").count()) > 0);
  assertClean(page);
});

test("F03-H3 calculadora: ROI de campaña negativo se marca en rojo", async () => {
  const page = await openPage(browser);
  await page.goto(BASE + "/herramientas", { waitUntil: "networkidle" });
  await page.getByLabel("Gasto en anuncios").fill("900000");
  await page.getByLabel("Pedidos confirmados").fill("10");
  const net = page.locator("dt", { hasText: "Ganancia neta (con devoluciones)" }).locator("xpath=following-sibling::dd");
  assert.match(await net.getAttribute("class"), /text-danger/);
  assertClean(page);
});
