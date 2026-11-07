/* Catalejo: utilidades compartidas por los scripts de página. */
(function () {
  "use strict";

  function todaySantiago() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }

  function alive() {
    try { return !!(chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
  }

  async function isPaused() {
    if (!alive()) return true; // la extensión se recargó: este script viejo deja de trabajar
    try {
      const { paused } = await chrome.storage.local.get("paused");
      return !!paused;
    } catch (e) { return true; }
  }

  /** Ejecuta fn cuando la página cambia (el usuario hace scroll o filtra), con espera para no recalcular de más. */
  function onPageChange(fn, wait = 1200) {
    let t = null;
    let obs = null;
    const safe = async () => {
      if (!alive()) { if (obs) obs.disconnect(); return; }
      try { await fn(); } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        if (/context invalidated/i.test(msg)) { if (obs) obs.disconnect(); return; } // pestaña vieja tras actualizar: se apaga en silencio
        console.warn("[Catalejo]", msg);
      }
    };
    const run = () => { clearTimeout(t); t = setTimeout(safe, wait); };
    const OWN = ".catalejo-badge, .catalejo-adbar, #catalejo-indicator";
    obs = new MutationObserver((records) => {
      // Ignora los cambios que hace la propia extensión, para no entrar en un ciclo.
      const external = records.some((r) => {
        const t = r.target.nodeType === 1 ? r.target : r.target.parentElement;
        return !(t && t.closest && t.closest(OWN));
      });
      if (external) run();
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    run();
  }

  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  /** Indicador visible en la página: el usuario siempre sabe que Catalejo está registrando, y puede pausar. */
  function ensureIndicator(label) {
    let box = document.getElementById("catalejo-indicator");
    if (box) return box;
    box = el("div", "catalejo-indicator");
    box.id = "catalejo-indicator";
    box.setAttribute("role", "status");
    const dot = el("span", "catalejo-dot");
    const txt = el("span", "catalejo-ind-text", label);
    const btn = el("button", "catalejo-ind-btn", "Pausar");
    btn.type = "button";
    btn.addEventListener("click", async () => {
      const paused = !(await isPaused());
      await chrome.storage.local.set({ paused });
      btn.textContent = paused ? "Reanudar" : "Pausar";
      box.classList.toggle("is-paused", paused);
      txt.textContent = paused ? "Catalejo en pausa: no registra nada" : label;
    });
    box.append(dot, txt, btn);
    document.body.appendChild(box);
    isPaused().then((p) => { if (p) { btn.textContent = "Reanudar"; box.classList.add("is-paused"); txt.textContent = "Catalejo en pausa: no registra nada"; } });
    return box;
  }

  /** Cambia el texto del indicador y, si se pide, muestra un botón extra (p. ej. "Copiar diagnóstico"). */
  function setIndicatorState(textValue, action) {
    const box = document.getElementById("catalejo-indicator");
    if (!box || box.classList.contains("is-paused")) return;
    box.querySelector(".catalejo-ind-text").textContent = textValue;
    let extra = box.querySelector(".catalejo-ind-extra");
    if (!action) { if (extra) extra.remove(); return; }
    if (!extra) {
      extra = el("button", "catalejo-ind-btn catalejo-ind-extra", action.label);
      extra.type = "button";
      box.insertBefore(extra, box.lastChild);
    }
    extra.onclick = action.onClick;
  }

  function setIndicatorCount(n, label) {
    setIndicatorState(`${label} · ${n} hoy`, null);
  }

  globalThis.CatalejoCommon = { todaySantiago, isPaused, onPageChange, el, ensureIndicator, setIndicatorCount, setIndicatorState };
})();
