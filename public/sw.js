/* Tresh service worker — Web Push alma + tıklama yönlendirme + uygulama rozeti. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

/* Ana ekrana eklenmiş uygulamanın ikonunda kaç eşiğin tetiklendiğini gösteren
   rozet (iOS 16.4+ PWA ve Android'de desteklenir). Sayaç SW yeniden başlasa da
   kaybolmasın diye IndexedDB yerine basitçe Cache API'de tutulur. */
const BADGE_CACHE = 'tresh-badge';
const BADGE_KEY = '/badge-count';

async function readBadge() {
  try {
    const cache = await caches.open(BADGE_CACHE);
    const res = await cache.match(BADGE_KEY);
    return res ? parseInt(await res.text(), 10) || 0 : 0;
  } catch { return 0; }
}

async function writeBadge(n) {
  try {
    const cache = await caches.open(BADGE_CACHE);
    await cache.put(BADGE_KEY, new Response(String(n)));
  } catch { /* yoksay */ }
  try {
    if (n > 0) await self.navigator.setAppBadge(n);
    else await self.navigator.clearAppBadge();
  } catch { /* desteklenmeyen tarayıcı */ }
}

self.addEventListener('push', (event) => {
  let payload = { title: 'Tresh', body: 'Level crossed.', tag: 'tresh', url: '/app' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) { /* düz metin payload */ }
  event.waitUntil((async () => {
    const count = (await readBadge()) + 1;
    await writeBadge(count);
    /* image/actions/requireInteraction yalnızca Chrome/Edge/Android'de gösterilir —
       Safari/macOS ve iOS PWA bu alanları sessizce yoksayar, hata vermez. */
    const options = {
      body: payload.body,
      tag: payload.tag,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      timestamp: Date.now(),
      data: { url: payload.url },
      renotify: true,
      vibrate: [160, 60, 160],
    };
    if (payload.image) options.image = payload.image;
    if (Array.isArray(payload.actions) && payload.actions.length) options.actions = payload.actions;
    if (payload.requireInteraction) options.requireInteraction = true;
    await self.registration.showNotification(payload.title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  const url = (event.notification.data && event.notification.data.url) || '/app';
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil((async () => {
    await writeBadge(0);
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of list) {
      if ('focus' in client) { client.navigate(url); return client.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});

/* Uygulama açıldığında sayfa tarafı "badge-clear" mesajı gönderir. */
self.addEventListener('message', (event) => {
  if (event.data === 'badge-clear') event.waitUntil(writeBadge(0));
});
