/*
 * Catalejo: envía la cola de observaciones a la app cada 15 minutos.
 * Mientras no haya cuenta conectada (replica-backend), los datos quedan solo en este navegador.
 */
const FLUSH_MIN = 15;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("flush", { periodInMinutes: FLUSH_MIN });
});

chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== "flush") return;
  const { queue = [], apiUrl, token, paused } = await chrome.storage.local.get(["queue", "apiUrl", "token", "paused"]);
  if (paused || !apiUrl || !token || !queue.length) return;
  const batch = queue.slice(0, 500);
  try {
    const res = await fetch(`${apiUrl}/api/ext/observations`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: batch }),
    });
    if (res.ok) {
      const { queue: current = [] } = await chrome.storage.local.get("queue");
      await chrome.storage.local.set({ queue: current.slice(batch.length), lastSync: new Date().toISOString() });
    }
  } catch (e) {
    // Sin conexión: se reintenta en el próximo ciclo.
  }
});
