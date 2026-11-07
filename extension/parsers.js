/*
 * Catalejo: lectores de página. Funciones puras sobre el DOM que el usuario ya tiene en pantalla.
 * No hacen requests, no hacen scroll, no abren páginas. Se prueban con tests/parsers.test.mjs.
 *
 * Los selectores son por TEXTO visible (p. ej. "Stock", "Identificador de la biblioteca"),
 * no por clases CSS, porque las clases de esos sitios cambian seguido.
 */
(function (root) {
  "use strict";

  const MONTHS = {
    ene: 0, enero: 0, jan: 0, january: 0,
    feb: 1, febrero: 1, february: 1,
    mar: 2, marzo: 2, march: 2,
    abr: 3, abril: 3, apr: 3, april: 3,
    may: 4, mayo: 4,
    jun: 5, junio: 5, june: 5,
    jul: 6, julio: 6, july: 6,
    ago: 7, agosto: 7, aug: 7, august: 7,
    sep: 8, sept: 8, septiembre: 8, setiembre: 8, september: 8,
    oct: 9, octubre: 9, october: 9,
    nov: 10, noviembre: 10, november: 10,
    dic: 11, diciembre: 11, dec: 11, december: 11,
  };

  const pad = (n) => String(n).padStart(2, "0");
  const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  /** "12 oct. 2025", "12 de octubre de 2025", "Oct 12, 2025" -> "2025-10-12" */
  function parseDate(text) {
    if (!text) return null;
    const t = text.toLowerCase().replace(/\./g, " ").replace(/\s+/g, " ").trim();
    let m = t.match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\s+(?:de\s+)?(\d{4})/);
    if (m && MONTHS[m[2]] !== undefined) return iso(+m[3], MONTHS[m[2]], +m[1]);
    m = t.match(/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (m && MONTHS[m[1]] !== undefined) return iso(+m[3], MONTHS[m[1]], +m[2]);
    m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return iso(+m[3], +m[2] - 1, +m[1]);
    return null;
  }

  /** "1.234" o "1,234" o "1234" -> 1234 (formato chileno usa punto de miles) */
  function parseIntCL(s) {
    if (s == null) return null;
    const digits = String(s).replace(/[^\d]/g, "");
    return digits ? parseInt(digits, 10) : null;
  }

  function text(el) {
    return (el && (el.innerText !== undefined && el.innerText !== "" ? el.innerText : el.textContent)) || "";
  }

  /** Líneas de texto por nodo (no depende de cómo el navegador une los elementos en línea). */
  function lines(el) {
    const out = [];
    for (const n of walkTextNodes(el)) {
      for (const part of (n.nodeValue || "").split(/\n+/)) {
        const t = part.trim();
        if (t) out.push(t);
      }
    }
    return out;
  }

  /** Sube desde un nodo hasta el contenedor más chico que cumple `test`. */
  function closestMatching(el, test, maxUp = 8) {
    let cur = el;
    for (let i = 0; cur && i < maxUp; i++) {
      if (cur.nodeType === 1 && test(cur)) return cur;
      cur = cur.parentElement || cur.parentNode;
    }
    return null;
  }

  function* walkTextNodes(rootEl) {
    const doc = rootEl.ownerDocument || rootEl;
    const tw = doc.createTreeWalker(rootEl, 4 /* SHOW_TEXT */);
    let n;
    while ((n = tw.nextNode())) yield n;
  }

  // ---------------------------------------------------------------- Dropi

  const STOCK_RE = /\b(?:stock|disponibles?|inventario)\s*:?\s*([\d.,]+)/i;
  const PRICE_RE = /\$\s*([\d.]+)/g;

  /**
   * Lee las tarjetas de producto visibles en un catálogo de Dropi.
   * Devuelve [{ key, name, stock, prices[], url, image, warehouse }].
   * key = id del producto en la URL si existe, si no, el nombre normalizado.
   */
  function parseDropiCards(rootEl) {
    const seen = new Set();
    const out = [];
    for (const tn of walkTextNodes(rootEl)) {
      const m = (tn.nodeValue || "").match(STOCK_RE);
      if (!m) continue;
      // La tarjeta: el ancestro más chico que tiene una imagen o un link y un precio.
      const card = closestMatching(tn.parentElement, (el) => /\$\s*\d/.test(text(el)) && (el.querySelector("img") || el.querySelector("a[href]")));
      if (!card || seen.has(card)) continue;
      seen.add(card);
      const stock = parseIntCL(m[1]);
      if (stock === null) continue;
      const prices = [...text(card).matchAll(PRICE_RE)].map((x) => parseIntCL(x[1])).filter((n) => n && n > 0);
      const heading = card.querySelector("h1,h2,h3,h4,h5,[title]");
      const nameCandidates = lines(card).filter((l) => !/\$|stock|disponible|inventario|agregar|importar|ver m[aá]s|bodega|proveedor/i.test(l) && l.length >= 4);
      const name = (heading && (heading.getAttribute("title") || text(heading).trim())) || nameCandidates.sort((a, b) => b.length - a.length)[0] || null;
      if (!name) continue;
      const a = card.querySelector("a[href]");
      const url = a ? a.getAttribute("href") : null;
      const idMatch = url && url.match(/(?:product(?:o|s)?|id)[\/=-](\d+)/i);
      const img = card.querySelector("img");
      const wh = lines(card).find((l) => /bodega/i.test(l));
      const sup = lines(card).find((l) => /^proveedor\s*:/i.test(l));
      const item = {
        key: idMatch ? `dropi:${idMatch[1]}` : `name:${name.toLowerCase().replace(/\s+/g, " ").trim()}`,
        name: name.slice(0, 200),
        stock,
        prices,
        url,
        image: img ? img.getAttribute("src") : null,
        warehouse: wh ? wh.replace(/bodega\s*:?\s*/i, "").trim() : null,
        supplier: sup ? sup.replace(/^proveedor\s*:\s*/i, "").trim().slice(0, 160) : null,
      };
      Object.defineProperty(item, "el", { value: card, enumerable: false });
      out.push(item);
    }
    return out;
  }

  // ---------------------------------------------------- Meta Ad Library

  const LIB_ID_RE = /(?:library id|identificador de la biblioteca|id\.? de (?:la )?biblioteca|id de biblioteca)\s*:?\s*(\d{6,})/i;
  const STARTED_RE = /(?:started running on|comenz[oó] a (?:circular|publicarse) el|empez[oó] a (?:circular|publicarse) el|en circulaci[oó]n desde el)\s+(.+?\d{4})/i;
  const ACTIVE_RE = /\b(activo|active)\b/i;
  const INACTIVE_RE = /\b(inactivo|inactive)\b/i;

  function decodeOutbound(href) {
    try {
      const u = new URL(href, "https://www.facebook.com");
      if (/l\.facebook\.com$/.test(u.hostname) && u.searchParams.get("u")) return new URL(u.searchParams.get("u")).hostname.replace(/^www\./, "");
      if (!/facebook\.com$|fb\.com$|instagram\.com$|fbcdn\.net$/.test(u.hostname)) return u.hostname.replace(/^www\./, "");
    } catch (e) {}
    return null;
  }

  /**
   * Lee las tarjetas de anuncio visibles en la biblioteca de anuncios de Meta.
   * Devuelve [{ libraryId, startedOn, isActive, pageName, pageUrl, domain, mediaType, libraryUrl }].
   */
  function parseMetaAds(rootEl) {
    const out = [];
    const seen = new Set();
    for (const tn of walkTextNodes(rootEl)) {
      const m = (tn.nodeValue || "").match(LIB_ID_RE);
      if (!m) continue;
      const libraryId = m[1];
      if (seen.has(libraryId)) continue;
      // Tarjeta: ancestro que también contiene la fecha de inicio.
      const card = closestMatching(tn.parentElement, (el) => STARTED_RE.test(text(el)), 10);
      if (!card) continue;
      seen.add(libraryId);
      const t = text(card);
      const started = t.match(STARTED_RE);
      const links = [...card.querySelectorAll("a[href]")];
      const pageLink = links.find((a) => /facebook\.com\/(?!ads\/|l\.php)[^/?#]+\/?$/.test(new URL(a.getAttribute("href"), "https://www.facebook.com").href) && text(a).trim());
      const domain = links.map((a) => decodeOutbound(a.getAttribute("href"))).find(Boolean) || null;
      const mediaType = card.querySelector("video") ? "video" : card.querySelectorAll("img").length > 2 ? "carousel" : "image";
      const item = {
        libraryId,
        startedOn: started ? parseDate(started[1]) : null,
        isActive: INACTIVE_RE.test(t) ? false : ACTIVE_RE.test(t) ? true : true,
        pageName: pageLink ? text(pageLink).trim().slice(0, 120) : null,
        pageUrl: pageLink ? pageLink.getAttribute("href") : null,
        domain,
        mediaType,
        libraryUrl: `https://www.facebook.com/ads/library/?id=${libraryId}`,
      };
      Object.defineProperty(item, "el", { value: card, enumerable: false });
      out.push(item);
    }
    return out;
  }

  // ------------------------------------------------- estimación de ventas

  /** Misma regla que lib/score.ts: bajas de stock = ventas, subidas = reposición. */
  function estimateFromHistory(history /* {day: stock} */, today) {
    const days = Object.keys(history).sort();
    let units7 = 0, restock = false;
    const from = new Date(Date.parse(today + "T00:00:00Z") - 7 * 86400000).toISOString().slice(0, 10);
    for (let i = 1; i < days.length; i++) {
      const drop = history[days[i - 1]] - history[days[i]];
      if (days[i] > from) {
        if (drop > 0) units7 += drop;
        else if (drop < 0) restock = true;
      }
    }
    return { units7, restock, daysObserved: days.length };
  }

  function daysBetween(a, b) {
    return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
  }

  const api = { parseDate, parseIntCL, parseDropiCards, parseMetaAds, estimateFromHistory, daysBetween, decodeOutbound };
  root.CatalejoParsers = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
