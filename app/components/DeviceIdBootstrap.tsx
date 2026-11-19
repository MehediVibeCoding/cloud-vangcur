'use client';

import { useEffect } from 'react';
import { ensureDeviceCookie } from '@/lib/deviceId';

// সার্চ-বট/অডিট টুলে অপ্রয়োজনীয় কুকি-রিকোয়েস্ট এড়াতে বাদ
const BOT_UA = /bot|crawl|spider|slurp|lighthouse|pagespeed/i;

export default function DeviceIdBootstrap() {
  useEffect(() => {
    if (BOT_UA.test(navigator.userAgent)) return;
    void ensureDeviceCookie();
  }, []);
  return null;
}
