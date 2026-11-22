// Vangcur PWA service worker — শুধু ইনস্টলযোগ্যতার জন্য (Chrome/Edge "Install app")।
// কোনো ক্যাশিং বা অফলাইন লজিক নেই: fetch হ্যান্ডলার খালি, তাই সব রিকোয়েস্ট আগের মতোই সরাসরি নেটওয়ার্কে যায়।
// ব্রাউজারেই চলে — Cloudflare Worker/KV/D1-এ কোনো রিকোয়েস্ট বা খরচ বাড়ায় না।
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
