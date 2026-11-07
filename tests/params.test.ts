import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRadarFilters } from "../lib/params.ts";

test("BUG-001: filtros inválidos en la URL se ignoran en vez de vaciar el radar", () => {
  const f = parseRadarFilters({ minStock: "abc", minDelivery: "-5", sort: "nada", saturation: "xx", withAds: "si" });
  assert.equal(f.minStock, undefined);
  assert.equal(f.minDelivery, undefined);
  assert.equal(f.sort, undefined);
  assert.equal(f.saturation, undefined);
  assert.equal(f.withAds, false);
});

test("filtros válidos se respetan; texto largo se recorta", () => {
  const f = parseRadarFilters({ minStock: "100", minDelivery: "0.8", sort: "growth", saturation: "baja", withAds: "1", q: "a".repeat(500) });
  assert.equal(f.minStock, 100);
  assert.equal(f.minDelivery, 0.8);
  assert.equal(f.sort, "growth");
  assert.equal(f.q?.length, 120);
});
