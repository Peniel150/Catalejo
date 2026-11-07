// Utilidades de las pruebas de punta a punta. Usa el Playwright instalado en el sistema.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require("/opt/npm-tools/node_modules/playwright"); }
export const { chromium } = pw;
export const BASE = process.env.E2E_BASE ?? "http://localhost:3130";
const AXE = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");

/** Abre una página que falla ante errores de consola o respuestas 5xx. */
export async function openPage(browser, { width = 1440, height = 900, colorScheme = "light" } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme });
  const problems = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`consola: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`error de página: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url()}`); });
  page.problems = problems;
  return page;
}

export function assertClean(page) {
  assert.deepEqual(page.problems, [], page.problems.join("\n"));
}

export async function assertNoHorizontalScroll(page) {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(w[0] <= w[1] + 1, `desborde horizontal: ${w[0]} > ${w[1]}`);
}

/** Escaneo de accesibilidad con axe: falla con problemas serios o críticos. */
export async function assertAccessible(page, label) {
  await page.addScriptTag({ content: AXE });
  const res = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { resultTypes: ["violations"] });
    return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  });
  assert.deepEqual(res, [], `${label}: problemas de accesibilidad\n${res.join("\n")}`);
}
