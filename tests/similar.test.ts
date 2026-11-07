import { test } from "node:test";
import assert from "node:assert/strict";
import { rankSimilar, similarity } from "../lib/similar.ts";

test("mismo producto con otro nombre se reconoce como parecido", () => {
  assert.ok(similarity("Corrector de postura ajustable", "Corrector postura espalda unisex") >= 0.25);
  assert.ok(similarity("Lámpara de luna 3D", "Lampara luna 3d recargable") >= 0.5, "ignora acentos y mayúsculas");
  assert.equal(similarity("Freidora de aire", "Rizador de pestañas"), 0);
});

test("primero los parecidos por nombre, después la misma categoría", () => {
  const all = [
    { id: "1", name: "Corrector de postura ajustable", category: "Salud" },
    { id: "2", name: "Faja reductora térmica", category: "Salud" },
    { id: "3", name: "Corrector postura espalda", category: "Ortopedia" },
    { id: "4", name: "Freidora de aire", category: "Cocina" },
  ];
  const r = rankSimilar(all[0], all).map((x) => x.item.id);
  assert.deepEqual(r, ["3", "2"]);
});
