// Productos parecidos por nombre: el mismo producto suele aparecer en varios proveedores
// con nombres distintos ("Corrector postura espalda" / "Corrector de postura ajustable").
// v1 por palabras; v2 por imagen (embeddings).

const STOP = new Set(["de", "la", "el", "con", "para", "y", "en", "los", "las", "del", "por", "un", "una", "set", "pack", "x"]);

export function tokens(name: string): Set<string> {
  return new Set(
    name
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)), // plural simple
  );
}

export function similarity(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter); // Jaccard
}

/** Ordena candidatos: primero por parecido de nombre, luego misma categoría. */
export function rankSimilar<T extends { id: string; name: string; category: string }>(target: T, all: T[], limit = 4) {
  return all
    .filter((p) => p.id !== target.id)
    .map((p) => ({ p, s: similarity(target.name, p.name), sameCat: p.category === target.category }))
    .filter((x) => x.s >= 0.25 || x.sameCat)
    .sort((x, y) => y.s - x.s || Number(y.sameCat) - Number(x.sameCat))
    .slice(0, limit)
    .map((x) => ({ item: x.p, score: x.s }));
}
