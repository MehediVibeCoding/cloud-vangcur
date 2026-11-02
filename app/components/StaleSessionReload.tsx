'use client';

import { useEffect } from 'react';

/**
 * StaleSessionReload
 * ─────────────────────────────────────────────────────────────────────
 * 🛡️ "ব্রাউজার ট্যাব/অ্যাপ খোলা রেখে কেউ ২ ঘণ্টা+ বাইরে থেকে পরে ফিরে
 * এলে পুরনো (স্ট্যাল) দাম/স্টক/ডাটা দেখা" — এই সমস্যার ফিক্স।
 *
 * এটা StaleTabReload.tsx থেকে আলাদা জিনিস ঠিক করে:
 *  - StaleTabReload শুধু ব্রাউজারের bfcache (back/forward navigation-এ
 *    ফ্রোজেন স্ন্যাপশট) এর সমস্যা ধরে।
 *  - এই ফাইলটা ধরে: ট্যাব কখনো বন্ধ/নেভিগেট হয়নি, শুধু ব্যাকগ্রাউন্ডে
 *    (মিনিমাইজড/অন্য অ্যাপে) অনেকক্ষণ পড়ে ছিল — তারপর আবার visible হলো।
 *
 * কীভাবে কাজ করে:
 *  1. ট্যাব hidden (background-এ যাওয়া) হলে বর্তমান সময় sessionStorage-এ
 *     সেভ হয় (`vc_last_hidden_at`)।
 *  2. ট্যাব আবার visible হলে, সেভ করা সময়ের সাথে এখনকার সময়ের ব্যবধান
 *     মাপা হয়। STALE_AFTER_MS (ডিফল্ট ২ ঘণ্টা) এর বেশি হলে একবার
 *     `location.reload()` করে পুরো পেজ নতুন করে লোড হয় — সব দাম/স্টক/
 *     কার্ট/অর্ডার-স্ট্যাটাস তাজা ডাটা নিয়ে আসে।
 *  3. চেকআউট ফর্মে কিছু লেখা থাকলেও ভয় নেই — `lib/draftRecovery.ts` ও
 *     `vc_form_draft`/`vc_checkout_step` ইতিমধ্যে প্রতিটা ফিল্ড পরিবর্তনে
 *     localStorage/sessionStorage-এ সেভ হয়, তাই রিলোডের পর পেজ আবার
 *     লোড হলে draft থেকেই সব ফিরে আসে।
 *  4. সেশনে একবার রিলোড হয়ে গেলে sessionStorage-এর মার্কার নতুন করে
 *     সেট হয় (রিলোডের পরের প্রথম লোডেই), তাই বারবার রিলোড-লুপ হয় না।
 */
const STALE_AFTER_MS = 2 * 60 * 60 * 1000; // ২ ঘণ্টা
const HIDDEN_AT_KEY = 'vc_last_hidden_at';

export default function StaleSessionReload() {
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        try {
          sessionStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
        } catch {
          // ignore
        }
        return;
      }

      // visible হলো — আগের hidden-হওয়ার সময় চেক
      try {
        const raw = sessionStorage.getItem(HIDDEN_AT_KEY);
        if (!raw) return;
        const hiddenAt = Number(raw);
        if (!Number.isFinite(hiddenAt)) return;
        const elapsed = Date.now() - hiddenAt;
        if (elapsed >= STALE_AFTER_MS) {
          sessionStorage.removeItem(HIDDEN_AT_KEY);
          window.location.reload();
        }
      } catch {
        // ignore
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return null;
}
