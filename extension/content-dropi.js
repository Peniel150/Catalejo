/*
 * Catalejo en Dropi.
 * - Ficha de producto: registra el stock (ahí viene como texto), una vez por producto y día.
 * - Catálogo: Dropi Chile dibuja el stock como imagen, así que no se lee; en cada tarjeta se muestra
 *   lo que Catalejo ya sabe de ese producto por las fichas que abriste.
 * Solo lee lo que el usuario ya tiene en pantalla. No hace requests a Dropi, no pagina ni hace scroll.
 */
(function () {
  "use strict";
  const P = globalThis.CatalejoParsers;
  const C = globalThis.CatalejoCommon;
  const LABEL = "Catalejo registra el stock que ves";
  const HINT = "Estimado por la caída de stock que has visto. No son ventas confirmadas.";

  function badgeText(h, today) {
    if (!h || !Object.keys(h.days).length) return "Catalejo: ábrelo para empezar a medir";
    const est = P.estimateFromHistory(h.days, today);
    if (est.daysObserved < 2) return "Catalejo: medido hoy, vuelve mañana";
    return `Catalejo: ~${est.units7} ventas 7d${est.restock ? " · repuso" : ""}`;
  }

  function putBadge(host, txt, after) {
    if (!host || !host.isConnected) return;
    let b = after ? host.nextElementSibling : host.querySelector(":scope > .catalejo-badge");
    if (!b || !b.classList.contains("catalejo-badge")) {
      b = C.el("span", "catalejo-badge");
      b.title = HINT;
      if (after) host.insertAdjacentElement("afterend", b); else host.appendChild(b);
    }
    if (b.textContent !== txt) b.textContent = txt;
  }

  async function scan() {
    if (await C.isPaused()) return;
    const today = C.todaySantiago();
    const detail = P.parseDropiDetail(document, location.pathname);
    const cards = detail ? [] : P.parseDropiCards(document.body); // en la ficha solo cuenta el producto principal
    const isTop = window === window.top;
    if (!detail && !cards.length && !isTop) return; // en marcos internos solo aparece si hay productos
    C.ensureIndicator(LABEL); // en la página principal siempre visible: así se sabe que la extensión está activa

    if (!detail && !cards.length) {
      C.setIndicatorState("Catalejo activo · no veo productos aquí", {
        label: "Copiar diagnóstico",
        onClick: async (ev) => {
          const d = P.diagnoseDropi(document.body);
          const txt = "Catalejo diagnóstico v" + chrome.runtime.getManifest().version + "\n" + JSON.stringify(d, null, 1);
          try { await navigator.clipboard.writeText(txt); ev.target.textContent = "Copiado ✓"; }
          catch (e) { console.log(txt); ev.target.textContent = "Ver consola"; }
        },
      });
      return;
    }

    const withStock = cards.filter((c) => c.stock != null);
    if (detail) withStock.push(detail);
    const { history = {}, queue = [], seenToday = {} } = await chrome.storage.local.get(["history", "queue", "seenToday"]);
    const seen = seenToday.day === today ? seenToday : { day: today, keys: {} };
    for (const c of withStock) {
      const h = (history[c.key] = history[c.key] || { name: c.name, days: {} });
      h.name = c.name;
      if (h.days[today] === undefined || c.stock < h.days[today]) h.days[today] = c.stock; // el menor del día
      if (!seen.keys[c.key]) {
        seen.keys[c.key] = 1;
        queue.push({ kind: "dropi_stock", key: c.key, name: c.name, stock: c.stock, prices: c.prices, warehouse: c.warehouse, supplier: c.supplier, url: c.url, image: c.image, day: today });
      }
    }
    if (withStock.length) {
      // Historial local: solo 45 días por producto.
      for (const k of Object.keys(history)) {
        const days = Object.keys(history[k].days).sort();
        for (const d of days.slice(0, Math.max(0, days.length - 45))) delete history[k].days[d];
      }
      await chrome.storage.local.set({ history, queue: queue.slice(-5000), seenToday: seen });
    }

    const n = Object.keys(seen.keys).length;
    if (detail) C.setIndicatorState(`Catalejo: stock ${detail.stock.toLocaleString("es-CL")} registrado · ${n} hoy`, null);
    else if (!withStock.length) C.setIndicatorState(`Catalejo: abre un producto para registrar su stock · ${n} hoy`, null);
    else C.setIndicatorCount(n, LABEL);

    if (detail && detail.holder) putBadge(detail.holder, badgeText(history[detail.key], today), true);
    for (const c of cards) putBadge(c.el, badgeText(history[c.key], today), false);
  }

  C.onPageChange(scan, 1500);
})();
