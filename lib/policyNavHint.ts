// ফাইলের পাথ: lib/policyNavHint.ts
// [NEW] পলিসি/গ্রাহক-সেবা লিংকের নেভিগেশন-হিন্ট (ক্লায়েন্ট-সাইড, ছোট্ট স্টোর) — lib/productNavHint.ts-এর মতোই।
//
// কেন দরকার: হোম/অন্য পেজ থেকে ফুটারের পলিসি লিংকে ক্লিক করলে (prefetch={false} থাকায়) পলিসি-গ্রুপের লেআউট তখনও ফোনে
// আসেনি, তাই গ্রুপের ভেতরের নিজস্ব স্কেলেটন দেখানো যায় না। তখন app/loading.tsx (রুট fallback) দেখানো হয় — আর সেটা
// আগে সব রুটেই হোমের গ্রিড-স্কেলেটন দেখাত। এখন ক্লিকের মুহূর্তে গন্তব্য এখানে লিখে রাখা হয়, যাতে app/loading.tsx
// সঠিক পলিসি-স্কেলেটন দেখাতে পারে (pathname পুরনো থাকলেও)।
//
// ⚠️ কোনো নেটওয়ার্ক রিকোয়েস্ট/প্রিফেচ নেই।

import { useSyncExternalStore } from 'react';
import { POLICY_PATH_PREFIXES } from '@/lib/scrollMemory';

export interface PolicyNavHint {
  /** গন্তব্যের বেস পাথ, যেমন "/guide" */
  to: string;
  /** ক্লিকের সময় ব্রাউজারের pathname (যেমন "/") */
  fromPath: string;
  at: number;
}

// ক্লিক হয়েছে অথচ পেজ আসেনি (নেটওয়ার্ক ফেল/ক্যানসেল) — এর পরও যেন আটকে না থাকে
const HINT_TTL_MS = 10000;

let hint: PolicyNavHint | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** "/guide", "/guide/", "/guide?x=1" → "/guide"; পলিসি পাথ না হলে null */
export function policyBasePath(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  return POLICY_PATH_PREFIXES.includes(clean) ? clean : null;
}

export function setPolicyNavHint(to: string, fromPath: string) {
  hint = { to, fromPath, at: Date.now() };
  emit();
}

export function clearPolicyNavHint() {
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

function getSnapshot(): PolicyNavHint | null {
  if (hint && Date.now() - hint.at > HINT_TTL_MS) hint = null;
  return hint;
}

function getServerSnapshot(): PolicyNavHint | null {
  return null;
}

export function usePolicyNavHint(): PolicyNavHint | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
