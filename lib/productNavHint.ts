// 🧭 প্রোডাক্ট-নেভিগেশন হিন্ট (ক্লায়েন্ট-সাইড, ছোট্ট স্টোর)
//
// কেন দরকার: কার্ডে ট্যাপ করলে Next.js যদি প্রোডাক্ট পেজের নিজস্ব loading.tsx আগে থেকে না জানে
// (আমরা ইচ্ছাকৃতভাবে prefetch={false} রেখেছি, KV/CPU কোটা বাঁচাতে), তখন সবচেয়ে কাছের প্যারেন্ট
// fallback (হোমপেজের স্কেলেটন) দেখা যেত। এখন ক্লিকের মুহূর্তে এই স্টোরে লিখে রাখা হয়
// "প্রোডাক্ট পেজ খুলছে" + কার্ডে কয়টা ছবি আছে — যাতে স্কেলেটন ঠিক প্রোডাক্ট-স্কেলেটনই হয়
// এবং ছবির স্ট্রিপ (ডট + থাম্বনেইল) আসল পেজের সাথে হুবহু মেলে।
//
// ⚠️ এখানে কার্ডের নাম/দাম/ছবি কিছুই রাখা হয় না — শুধু ছবির সংখ্যা (আকৃতি ঠিক রাখার জন্য)।

import { useSyncExternalStore } from 'react';

export interface ProductNavHint {
  /** কার্ডের প্রোডাক্টে কয়টা ছবি আছে (অজানা হলে null) */
  imgCount: number | null;
  /** ক্লিকের সময় ব্রাউজারের pathname (যেমন "/") */
  fromPath: string;
  at: number;
}

// ক্লিক হয়েছে অথচ পেজ আসেনি (নেটওয়ার্ক ফেল/ক্যানসেল) — এর পরও যেন আটকে না থাকে
const HINT_TTL_MS = 15000;

let hint: ProductNavHint | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setProductNavHint(imgCount: number | null, fromPath: string) {
  hint = { imgCount, fromPath, at: Date.now() };
  emit();
}

export function clearProductNavHint() {
  if (!hint) return;
  hint = null;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): ProductNavHint | null {
  if (hint && Date.now() - hint.at > HINT_TTL_MS) hint = null;
  return hint;
}

function getServerSnapshot(): ProductNavHint | null {
  return null;
}

export function useProductNavHint(): ProductNavHint | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
