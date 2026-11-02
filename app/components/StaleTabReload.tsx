'use client';

import { useEffect } from 'react';

/**
 * StaleTabReload
 * ─────────────────────────────────────────────────────────────────────
 * 🛡️ "ট্যাব খোলা রেখে অনেকক্ষণ পর ফিরে এলে CSS/JS লোড হয় না" — এই
 * সমস্যার একটা অংশের ফিক্স।
 *
 * কী হচ্ছিল: ব্রাউজার (Chrome সহ প্রায় সব আধুনিক ব্রাউজার) কোনো ট্যাব
 * না-ছেড়ে অনেকক্ষণ background-এ রাখলে, অথবা অন্য পেজে গিয়ে back/forward
 * বাটনে ফিরে এলে, পুরো পেজটাকে নতুন করে লোড না করে মেমোরি থেকে একটা
 * "ফ্রোজেন স্ন্যাপশট" (back/forward cache বা bfcache) হিসেবে restore করে
 * দেয় — নতুন কোনো নেটওয়ার্ক রিকোয়েস্ট ছাড়াই। এই স্ন্যাপশটটা যদি গতকালের
 * ডেপ্লয়মেন্টের (পুরনো CSS/JS ফাইলের hash) হয়, আর এর মাঝে নতুন একটা
 * ডেপ্লয়মেন্ট হয়ে থাকে (এই প্রজেক্টে প্রায়ই হয়), তাহলে সেই পুরনো
 * স্ন্যাপশটটাই দেখানো হতে থাকে — যেটায় স্টাইল ভাঙা/অনুপস্থিত দেখাতে পারে,
 * যতক্ষণ না কোনো নতুন রিকোয়েস্ট (নেভিগেশন) হয়।
 *
 * সমাধান: `pageshow` ইভেন্টের `event.persisted` ফ্ল্যাগ true হলে বোঝা
 * যায় পেজটা bfcache থেকে এসেছে (ফ্রেশ লোড না) — তখন `location.reload()`
 * দিয়ে জোর করে একটা সম্পূর্ণ নতুন, বর্তমান ডেপ্লয়মেন্টের সঠিক
 * CSS/JS রেফারেন্স সহ পেজ লোড করানো হয়। এটা শুধু bfcache-restore-এর
 * ক্ষেত্রেই ঘটে (পুরো পেজ তখন এমনিতেই "জমে" ছিল, ইউজারের কোনো চলমান কাজ/
 * ইনপুট হারানোর ঝুঁকি নেই), সাধারণ ট্যাব-সুইচ বা অল্প সময়ের জন্য ট্যাব
 * মিনিমাইজ করায় এটা ট্রিগার হয় না — তাই স্বাভাবিক ব্যবহারে কোনো বিরক্তিকর
 * অপ্রত্যাশিত রিলোড হবে না।
 */
export default function StaleTabReload() {
  useEffect(() => {
    const handlePageShow = async (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const mine = process.env.NEXT_PUBLIC_BUILD_ID || '';
      // build id জানা না থাকলে আগের নিরাপদ আচরণ: সবসময় রিলোড
      if (!mine) {
        window.location.reload();
        return;
      }
      // নতুন ডেপ্লয় হয়েছে কিনা দেখো — হয়ে থাকলেই কেবল রিলোড; একই ভার্সন হলে bfcache-এর দ্রুত Back রেখে দাও।
      // নেটওয়ার্ক না থাকলে/এরর হলে কিছু করা হয় না (ক্যাশ-করা পেজই থাকে)।
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch('/api/build-id', { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) return;
        const data = (await res.json()) as { id?: string };
        if (data.id && data.id !== mine) window.location.reload();
      } catch {
        // ignore
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return null;
}
