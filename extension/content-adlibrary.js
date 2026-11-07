/*
 * Catalejo en la biblioteca de anuncios de Meta: lee los anuncios que el usuario tiene en pantalla,
 * muestra los días activos y permite guardar el anuncio o seguir al anunciante.
 * No descarga creativos, no hace scroll ni consultas propias.
 */
(function () {
  "use strict";
  const P = globalThis.CatalejoParsers;
  const C = globalThis.CatalejoCommon;
  const LABEL = "Catalejo registra los anuncios que ves";

  function searchContext() {
    const u = new URL(location.href);
    return { q: u.searchParams.get("q"), country: u.searchParams.get("country"), pageId: u.searchParams.get("view_all_page_id") };
  }

  async function scan() {
    if (await C.isPaused()) return;
    const today = C.todaySantiago();
    const ads = P.parseMetaAds(document.body);
    if (!ads.length) return;
    C.ensureIndicator(LABEL);
    const ctx = searchContext();
    const { queue = [], adsSeen = {}, competitors = [] } = await chrome.storage.local.get(["queue", "adsSeen", "competitors"]);
    const seenKey = (id) => `${id}:${today}`;
    let newCount = 0;
    for (const ad of ads) {
      if (!adsSeen[seenKey(ad.libraryId)]) {
        adsSeen[seenKey(ad.libraryId)] = 1;
        newCount++;
        queue.push({ kind: "meta_ad", ...ad, country: ctx.country, query: ctx.q, day: today });
      }
    }
    // Si la página abierta es la de un competidor seguido, se guarda la foto del día.
    if (ctx.pageId) {
      const comp = competitors.find((c) => c.pageId === ctx.pageId);
      if (comp) queue.push({ kind: "competitor_snapshot", pageId: ctx.pageId, activeAds: ads.filter((a) => a.isActive).length, day: today });
    }
    // Limpieza de vistos antiguos
    for (const k of Object.keys(adsSeen)) if (!k.endsWith(today)) delete adsSeen[k];
    await chrome.storage.local.set({ queue: queue.slice(-5000), adsSeen });
    C.setIndicatorCount(Object.keys(adsSeen).length, LABEL);
    paint(ads, today);
  }

  function paint(ads, today) {
    for (const ad of ads) {
      const card = ad.el;
      if (!card || !card.isConnected || card.querySelector(`[data-catalejo-ad="${ad.libraryId}"]`)) continue;
      const bar = C.el("div", "catalejo-adbar");
      bar.dataset.catalejoAd = ad.libraryId;
      const days = ad.startedOn ? P.daysBetween(ad.startedOn, today) : null;
      const pill = C.el("span", `catalejo-pill ${days === null ? "" : days >= 30 ? "is-high" : days >= 7 ? "is-mid" : "is-low"}`, days === null ? "días activo: s/d" : `${days} d activo`);
      const save = C.el("button", "catalejo-btn", "Guardar");
      save.type = "button";
      save.addEventListener("click", async () => {
        const { savedAds = [] } = await chrome.storage.local.get("savedAds");
        if (!savedAds.find((s) => s.libraryId === ad.libraryId)) savedAds.push({ ...ad, savedAt: today });
        await chrome.storage.local.set({ savedAds });
        save.textContent = "Guardado";
        save.disabled = true;
      });
      bar.append(pill, save);
      if (ad.domain) {
        const dom = C.el("a", "catalejo-btn", `Todos los de ${ad.domain}`);
        const u = new URL("https://www.facebook.com/ads/library/");
        u.search = new URLSearchParams({ active_status: "active", ad_type: "all", country: "CL", q: ad.domain, search_type: "keyword_unordered", media_type: "all" }).toString();
        dom.href = u.toString();
        bar.append(dom);
      }
      if (ad.pageName) {
        const follow = C.el("button", "catalejo-btn", "Seguir anunciante");
        follow.type = "button";
        follow.addEventListener("click", async () => {
          const { competitors = [] } = await chrome.storage.local.get("competitors");
          const pageId = new URL(location.href).searchParams.get("view_all_page_id");
          if (!competitors.find((c) => c.name === ad.pageName)) competitors.push({ name: ad.pageName, pageUrl: ad.pageUrl, pageId, domain: ad.domain, addedAt: today });
          await chrome.storage.local.set({ competitors });
          follow.textContent = "Siguiendo";
          follow.disabled = true;
        });
        bar.append(follow);
      }
      card.prepend(bar);
    }
  }

  C.onPageChange(scan, 1500);
})();
