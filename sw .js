const V = 'fhs-shell-v11';
const HOSTS = ['www.gstatic.com', 'cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];
// مكتبات خارجية يحتاجها التطبيق ليعمل بدون إنترنت: تُخزَّن عند التثبيت وليس بعد الزيارة الثانية
const EXTERNAL = [
  ['https://cdn.tailwindcss.com', 'no-cors'],
  ['https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js', 'cors'],
  ['https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js', 'cors'],
  ['https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js', 'cors'],
  ['https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap', 'no-cors']
];
// مهلة قصيرة حتى لا يتعطل التثبيت إذا كان موقع خارجي محجوباً
const timed = (req, ms) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); return fetch(req, { signal: c.signal }).finally(() => clearTimeout(t)); };

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all([
    ...SHELL.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(u); return c.put(u, r); })
      .catch(err => { if (u === './' || u === 'index.html') throw err; })), // الأيقونات اختيارية
    ...EXTERNAL.map(([u, mode]) => timed(new Request(u, { mode }), 10000).then(r => c.put(u, r)).catch(() => {}))
  ])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('fhs-shell') && k !== V).map(k => caches.delete(k)))).then(() => clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith('http')) return;
  const u = new URL(r.url);
  if (u.searchParams.has('diag')) return; // طلبات فحص الاتصال تذهب للشبكة مباشرة
  if (u.origin !== location.origin && !HOSTS.includes(u.hostname)) return; // لا نتدخل بطلبات Firestore
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })
      .catch(() => hit || (r.mode === 'navigate' ? caches.match('index.html') : undefined));
    return hit || net;
  }));
});
