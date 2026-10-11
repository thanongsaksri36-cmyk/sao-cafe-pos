/* SAO CAFE POS — Service Worker
   หน้าที่เดียว: ให้ "เปิดแอปได้" ตอนเน็ตหลุด (ข้อมูลขายเก็บในเครื่องอยู่แล้ว)
   - หน้าแอป (index.html): ลองเน็ตก่อนเสมอ -> ออนไลน์ได้เวอร์ชันใหม่ทันที · ออฟไลน์ใช้สำเนาล่าสุด
   - ไฟล์นิ่ง (ไอคอน/ฟอนต์/supabase-js): ใช้สำเนาก่อน แล้วอัปเดตเบื้องหลัง
   - คำสั่งไป Supabase / Telegram / AI: ไม่แตะเลย (ห้าม cache ข้อมูลร้าน)
   เปลี่ยน VER เมื่อแก้ไฟล์นี้ */
const VER = 'sao-pos-sw-2';
const SHELL = ['./', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const CDN_OK = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VER).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isAppPage = (url) => url.pathname === '/' || url.pathname.endsWith('/index.html');

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (_) { return; }
  const same = url.origin === self.location.origin;

  // หน้าแอป: network-first (ตัด query เช่น ?t=T1&shop=.. ออกจาก key — ทุกลิงก์คือไฟล์เดียวกัน)
  // v2: เก็บสำเนาเฉพาะเมื่อเป็นหน้า HTML ของแอปจริง ๆ และไม่ใช่ response ที่ถูก redirect
  //     (เดิม navigate ไปไฟล์อื่น เช่น /manifest.json ก็ทับสำเนาหน้าแอป และ response แบบ redirect ใช้ตอนออฟไลน์ไม่ได้)
  if (same && (req.mode === 'navigate' || isAppPage(url))) {
    e.respondWith(
      fetch(req).then((res) => {
        const ct = (res && res.headers.get('content-type')) || '';
        if (res && res.ok && !res.redirected && isAppPage(new URL(res.url || req.url)) && ct.includes('text/html')) {
          const copy = res.clone();
          caches.open(VER).then((c) => c.put('./', copy));
        }
        return res;
      }).catch(() => caches.match('./').then((r) => r || new Response('ออฟไลน์ และยังไม่เคยเปิดแอปบนเครื่องนี้', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
    );
    return;
  }

  // ไฟล์นิ่งของเรา + CDN ที่อนุญาต: stale-while-revalidate
  if (same || CDN_OK.includes(url.hostname)) {
    e.respondWith(
      caches.open(VER).then((c) => c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  }
  // อื่น ๆ (Supabase ฯลฯ) -> ปล่อยผ่านตามปกติ
});
