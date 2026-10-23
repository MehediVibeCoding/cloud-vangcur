// 🧭 প্রোডাক্ট-নেভিগেশন হিন্ট (ক্লায়েন্ট-সাইড, ছোট্ট স্টোর)
//
// কেন দরকার: কার্ডে ট্যাপ করলে Next.js যদি প্রোডাক্ট পেজের নিজস্ব loading.tsx আগে থেকে না জানে
// (আমরা ইচ্ছাকৃতভাবে prefetch={false} রেখেছি, KV/CPU কোটা বাঁচাতে), তখন সবচেয়ে কাছের প্যারেন্ট
// fallback দেখা যেত। এখন ক্লিকের মুহূর্তে এই স্টোরে লিখে রাখা হয় "প্রোডাক্ট পেজ খুলছে" + (কার্ড থেকে হলে)
// কার্ডের তথ্য — যাতে স্কেলেটন/প্রিভিউ ঠিক আকৃতির হয় এবং যা তথ্য আগে থেকেই জানা, তা সঙ্গে সঙ্গে দেখানো যায়।
//
// ⚠️ শুধু কার্ডেই যা আছে (GRID_COLS) তা রাখা হয়; কোনো নেটওয়ার্ক রিকোয়েস্ট নেই।

import { useSyncExternalStore } from 'react';

/** কার্ড থেকে যে তথ্য প্রিভিউতে লাগে (Product-এর GRID_COLS অংশ) */
export interface NavPreviewProduct {
  /** প্রথম ছবির মূল URL/ভ্যালু — কার্ড যে URL-এ ছবি এনেছে, প্রিভিউও ঠিক সেটাই চায় (ব্রাউজার ক্যাশ কাজে লাগাতে) */
  img: string | null;
  imgCount: number;
  price: number;
  old: number;
  stock: number;
  badge: string;
  warranty: string;
  /** কালার-ভ্যারিয়েন্ট থাকলে (স্কেলেটনে এক সারি জায়গা রাখতে) */
  hasColorGroup: boolean;
}

export interface ProductNavHint {
  /** কার্ডের প্রোডাক্টে কয়টা ছবি আছে (অজানা হলে null) */
  imgCount: number | null;
  /** কার্ড থেকে এলে তার তথ্য, অন্য জায়গা (সার্চ/অফার ইত্যাদি) থেকে এলে null */
  product: NavPreviewProduct | null;
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

// ⚠️ ইভেন্ট-ক্রম: Next.js App Router ডকুমেন্টেই React হাইড্রেট করে, তাই ProductCard-এর onClickCapture (React-এর লিসেনার,
// হাইড্রেশনে আগে বসানো) আর ProductNavOverlay-এর document capture লিসেনার — দুটোই document-এ; যেটা আগে বসেছে সেটা আগে চলে,
// অর্থাৎ কার্ডের তথ্য হিন্ট বানানোর *আগেই* আসতে পারে। তাই কার্ডের তথ্য এখানে একটা "অপেক্ষমাণ" স্লটে রাখা হয়,
// আর হিন্ট বানানোর সময় (বা আগে থেকে তাজা হিন্ট থাকলে তখনই) সেটা জুড়ে নেওয়া হয়। দুই ক্রমেই একই ফল।
const PENDING_TTL_MS = 1000;
let pendingProduct: { product: NavPreviewProduct; at: number } | null = null;

export function setProductNavHint(imgCount: number | null, fromPath: string) {
  const pending = pendingProduct && Date.now() - pendingProduct.at < PENDING_TTL_MS ? pendingProduct.product : null;
  pendingProduct = null;
  hint = { imgCount: pending ? pending.imgCount : imgCount, product: pending, fromPath, at: Date.now() };
  emit();
}

/** ProductCard ক্লিকে চলে: কার্ডের তথ্য নেভিগেশন-হিন্টে জুড়ে দেয় (হিন্ট এখনো না বানানো থাকলে অপেক্ষমাণ রাখে) */
export function attachProductToNavHint(product: NavPreviewProduct) {
  if (hint && Date.now() - hint.at < PENDING_TTL_MS) {
    hint = { ...hint, imgCount: product.imgCount, product };
    emit();
    return;
  }
  pendingProduct = { product, at: Date.now() };
}

export function clearProductNavHint() {
  if (!hint) return;
  hint = null;
  emit();
}

/** রেন্ডারের সময় একবার পড়ার জন্য (রিঅ্যাক্টিভ নয়) — যেমন প্রোডাক্ট পেজ মাউন্টের মুহূর্তে */
export function peekProductNavHint(): ProductNavHint | null {
  return getSnapshot();
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
