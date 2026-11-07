(async function () {
  const $ = (id) => document.getElementById(id);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  async function render() {
    const s = await chrome.storage.local.get(["paused", "seenToday", "adsSeen", "savedAds", "competitors", "queue", "lastSync", "apiUrl"]);
    $("state").textContent = s.paused ? "En pausa: no se registra nada." : "Activo: registra lo que ves en Dropi y en la biblioteca de anuncios.";
    $("pause").textContent = s.paused ? "Reanudar" : "Pausar";
    $("dropi").textContent = s.seenToday && s.seenToday.day === today ? Object.keys(s.seenToday.keys).length : 0;
    $("ads").textContent = Object.keys(s.adsSeen || {}).filter((k) => k.endsWith(today)).length;
    $("saved").textContent = (s.savedAds || []).length;
    $("comps").textContent = (s.competitors || []).length;
    $("sync").textContent = s.apiUrl
      ? `${(s.queue || []).length} registros por enviar${s.lastSync ? ` · último envío ${new Date(s.lastSync).toLocaleString("es-CL")}` : ""}`
      : `${(s.queue || []).length} registros guardados en este navegador. Se envían a tu cuenta cuando la conectes.`;
  }
  $("pause").addEventListener("click", async () => {
    const { paused } = await chrome.storage.local.get("paused");
    await chrome.storage.local.set({ paused: !paused });
    render();
  });
  $("export").addEventListener("click", async () => {
    const data = await chrome.storage.local.get(null);
    delete data.token;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `catalejo-${today}.json` });
    a.click();
    URL.revokeObjectURL(url);
  });
  $("cform").addEventListener("submit", async (e) => {
    e.preventDefault();
    const api = $("api").value.trim().replace(/\/+$/, "");
    const tok = $("tok").value.trim();
    let origin;
    try { origin = new URL(api).origin; } catch { $("cmsg").textContent = "La dirección no es válida."; return; }
    if (!/^cat_[A-Za-z0-9_-]{40,}$/.test(tok)) { $("cmsg").textContent = "El código no tiene el formato correcto."; return; }
    // Permiso solo para el origen de tu Catalejo, pedido en este momento.
    const granted = await chrome.permissions.request({ origins: [origin + "/*"] });
    if (!granted) { $("cmsg").textContent = "Sin permiso no podemos enviar datos a tu cuenta."; return; }
    await chrome.storage.local.set({ apiUrl: origin, token: tok });
    $("cmsg").textContent = "Conectada. Los datos se envían cada 15 minutos.";
    render();
  });
  render();
})();
