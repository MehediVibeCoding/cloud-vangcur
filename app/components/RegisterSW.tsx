'use client';

import { useEffect } from 'react';

// PWA ইনস্টল অপশনের জন্য service worker রেজিস্টার। ব্যর্থ হলে সাইটের কিছুই ভাঙে না।
export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    };
    // পেজ লোড শেষ হওয়ার পর রেজিস্টার, যাতে প্রথম লোড ধীর না হয়
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
