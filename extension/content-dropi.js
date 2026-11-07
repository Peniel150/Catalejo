/*
 * Catalejo en Dropi: registra el stock de las tarjetas que el usuario tiene en pantalla
 * (una vez por producto y día) y muestra sobre cada una las ventas estimadas de 7 días.
 * Solo lee el DOM ya renderizado. No hace requests a Dropi, no pagina ni hace scroll.
 */
(function () {
  "use strict";
  const P = globalThis.CatalejoParsers;
  const C = globalThis.CatalejoCommon;
  const LABEL = "Catalejo registra el stock que ves";

  async function scan() {
    if (await C.isPaused()) return;
    const today = C.todaySantiago();
    const cards = P.parseDropiCards(document.body);
    if (!cards.length) return;
    C.ensureIndicator(LABEL);

    const { history = {}, queue = [], seenToday = {} } = await chrome.storage.local.get(["history", "queue", "seenToday"]);
    const seen = seenToday.day === today ? seenToday : { day: today, keys: {} };
    for (const c of cards) {
      const h = (history[c.key] = history[c.key] || { name: c.name, days: {} });
      h.name = c.name;
      if (h.days[today] === undefined || c.stock < h.days[today]) h.days[today] = c.stock; // nos quedamos con el menor del día
      if (!seen.keys[c.key]) {
        seen.keys[c.key] = 1;
        queue.push({ kind: "dropi_stock", key: c.key, name: c.name, stock: c.stock, prices: c.prices, warehouse: c.warehouse, url: c.url, day: today });
      }
    }
    // Historial local: solo 45 días por producto.
    for (const k of Object.keys(history)) {
      const days = Object.keys(history[k].days).sort();
      for (const d of days.slice(0, Math.max(0, days.length - 45))) delete history[k].days[d];
    }
    await chrome.storage.local.set({ history, queue: queue.slice(-5000), seenToday: seen });
    C.setIndicatorCount(Object.keys(seen.keys).length, LABEL);
    paintBadges(cards, history, today);
  }

  function paintBadges(cards, history, today) {
    for (const c of cards) {
      if (!c.el || !c.el.isConnected) continue;
      let b = c.el.querySelector(":scope > .catalejo-badge");
      if (!b) {
        b = C.el("span", "catalejo-badge");
        b.title = "Estimado por la caída de stock que has visto. No son ventas confirmadas.";
        c.el.appendChild(b);
      }
      const est = P.estimateFromHistory(history[c.key].days, today);
      b.textContent = est.daysObserved < 2 ? "Catalejo: día 1, vuelve mañana" : `Catalejo: ~${est.units7} ventas 7d${est.restock ? " · repuso" : ""}`;
    }
  }

  C.onPageChange(scan, 1500);
})();
