importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

/* =============================================
   Reto 60 Días · Service Worker
   sw.js — Notificaciones en segundo plano
   ============================================= */

const CACHE_NAME = "reto60-v1";

/* ── Instalar SW ── */
self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(self.clients.claim());
});

/* ── Recibir mensaje desde la app ── */
self.addEventListener("message", e => {
  if (e.data && e.data.type === "SCHEDULE_NOTIFICATIONS") {
    scheduleAll(e.data.notificaciones);
  }
  if (e.data && e.data.type === "CANCEL_NOTIFICATIONS") {
    cancelAll();
  }
});

/* ── Timers activos ── */
let timers = [];

function cancelAll() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
}

function scheduleAll(notificaciones) {
  cancelAll();
  if (!notificaciones || !Array.isArray(notificaciones)) return;

  notificaciones.forEach(n => {
    if (!n.activa || !n.hora) return;
    scheduleOne(n);
  });
}

function scheduleOne(n) {
  const [hh, mm] = n.hora.split(":").map(Number);
  const now  = new Date();
  const next = new Date();
  next.setHours(hh, mm, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const ms = next - now;
  const t = setTimeout(() => {
    showNotif(n);
    // Reagendar para el día siguiente
    scheduleOne(n);
  }, ms);
  timers.push(t);
}

function showNotif(n) {
  const title = n.titulo || "⏰ Reto 60 días · Kuale";
  const body  = n.mensaje || "¡No olvides registrar tus hábitos de hoy!";
  self.registration.showNotification(title, {
    body,
    icon: "logo-icon.png",
    badge: "logo-icon.png",
    vibrate: [200, 100, 200],
    tag: `reto60-${n.hora}`,
    renotify: true,
    data: { url: self.registration.scope }
  });
}

/* ── Clic en notificación → abrir app ── */
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes("Reto_60_dias") || c.url === url);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});