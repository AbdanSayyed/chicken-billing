// @ts-nocheck
const CACHE_NAME = 'poultrypro-v7';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (e.request.method !== 'GET') return;
  if (url.startsWith('chrome-extension')) return;
  if (url.includes('onesignal.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Push received
self.addEventListener('push', e => {
  let data = { title: '🐔 BismillahFoods', body: 'New bill created.' };
  if (e.data) {
    try { data = e.data.json(); } catch(err) { data.body = e.data.text(); }
  }
  e.waitUntil(
    self.registration.showNotification(data.title || '🐔 BismillahFoods', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || 'bill-' + Date.now(),
      requireInteraction: true, // stays until tapped ✅
      vibrate: [200, 100, 200],
      data: { billNo: data.billNo || null, url: data.url || './index.html' }
    })
  );
});

// Notification click — open app at correct page
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const billNo = e.notification.data && e.notification.data.billNo;
  // Open app — if billNo exists go to dashboard/bills tab
  const url = billNo
    ? `./index.html#bill-${billNo}`
    : './index.html';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // If app already open — focus it and navigate
      for (const client of list) {
        if (client.url.includes('bismillah-foods-billing') && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'OPEN_BILL', billNo: billNo });
          return;
        }
      }
      // App not open — open it
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});