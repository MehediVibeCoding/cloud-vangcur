import type { NotificationItem } from './notificationsData';

/**
 * নোটিফিকেশন বেল আগে প্রতিবার লোডে সব সোর্স থেকে "লাইভ" ভাবে রিবিল্ড হতো —
 * তাই পড়া/না-পড়া, বা ম্যানুয়াল ডিলিট — কোনোটাই টেকসই ছিল না, প্যানেল খুললেই
 * পুরোনো নোটিফিকেশন "হারিয়ে" যেত। এই মডিউল localStorage-এ একটা persistent
 * স্টোর রাখে যেখানে প্রতিটা নোটিফিকেশনের নিজস্ব createdAt/readAt থাকে এবং
 * টাইপ অনুযায়ী নিচের ৩টা লজিকের একটা মেনে চলে —
 *
 *  ১) LIVE_CONDITION — অফার/ড্রাফট/প্রোফাইল-অসম্পূর্ণ/কুপন-কোড: যতক্ষণ আসল
 *     শর্তটা সত্যি (candidate হিসেবে আসছে), ততক্ষণ দেখাবে। শর্ত মিথ্যা হয়ে
 *     গেলে (বা ম্যানুয়ালি ডিলিট করলে) সাথে সাথেই সরে যাবে — এদের নিজস্ব
 *     কোনো "পড়ার ২৪ ঘণ্টা পর" টাইমার নেই।
 *  ২) READ_THEN_24H — স্টক/রিভিউ/টায়ার-আপগ্রেড/প্রোফাইল-ভেরিফায়েড: প্রথমবার
 *     panel খোলা হলে (readAt সেট হলে) তার ২৪ ঘণ্টা পর অটো-ডিলিট। না পড়া
 *     পর্যন্ত অনির্দিষ্টকাল থাকবে।
 *  ৩) ONE_TIME — রিভিউ/টায়ার/প্রোফাইল-ভেরিফায়েড আইডিগুলো সারাজীবনে একবারই
 *     স্টোরে যোগ হবে (everCreatedOnceIds লেজার দিয়ে), মেয়াদ শেষ হয়ে সরে
 *     গেলেও আর কখনো ফিরে আসবে না — যাতে "অভিনন্দন" বারবার না দেখায়।
 *
 * ম্যানুয়াল ডিলিট সব টাইপের জন্যই প্রযোজ্য এবং সেই id চিরদিনের জন্য
 * dismissedForeverIds-এ চলে যায় (dismiss করা আইটেম আবার resurrect হবে না)।
 */

const MAX_ITEMS = 5;
const READ_TTL_MS = 24 * 60 * 60 * 1000; // ২৪ ঘণ্টা
const MAX_DISMISSED_LEDGER = 300; // মেমরি/স্টোরেজ বাড়তে না দেওয়ার জন্য সিলিং

const LIVE_CONDITION_TYPES = new Set<NotificationItem['type']>([
  'offer', 'draft', 'code',
]);

const ONE_TIME_TYPES = new Set<NotificationItem['type']>([
  'review', 'tier',
]);

interface StoredEntry {
  type: NotificationItem['type'];
  title: string;
  subtitle?: string;
  href: string;
  createdAt: number;
  readAt: number | null;
}

interface StoreShape {
  items: Record<string, StoredEntry>;
  everCreatedOnceIds: string[];
  dismissedForeverIds: string[];
}

export interface ReconciledNotification extends NotificationItem {
  createdAt: number;
  readAt: number | null;
}

function emptyStore(): StoreShape {
  return { items: {}, everCreatedOnceIds: [], dismissedForeverIds: [] };
}

function storageKey(userId: string): string {
  return `vc_notif_store_v2:${userId || 'guest'}`;
}

function loadStore(userId: string): StoreShape {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    return {
      items: parsed?.items || {},
      everCreatedOnceIds: Array.isArray(parsed?.everCreatedOnceIds) ? parsed.everCreatedOnceIds : [],
      dismissedForeverIds: Array.isArray(parsed?.dismissedForeverIds) ? parsed.dismissedForeverIds : [],
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(userId: string, store: StoreShape): void {
  if (typeof window === 'undefined') return;
  try {
    if (store.dismissedForeverIds.length > MAX_DISMISSED_LEDGER) {
      store.dismissedForeverIds = store.dismissedForeverIds.slice(-MAX_DISMISSED_LEDGER);
    }
    localStorage.setItem(storageKey(userId), JSON.stringify(store));
  } catch {
    // storage unavailable — নীরবে উপেক্ষা করা হচ্ছে
  }
}

/**
 * বর্তমানে "সত্যি" (candidate) নোটিফিকেশনগুলোর সাথে persistent store মিলিয়ে
 * চূড়ান্ত তালিকা রিটার্ন করে — নতুন যোগ করা, মেয়াদোত্তীর্ণ/অপ্রাসঙ্গিক সরানো,
 * নতুন-আগে-সাজানো এবং সর্বোচ্চ ৫টার সীমা — সবকিছু এখানেই হয়ে যায়।
 */
export function reconcileNotifications(userId: string, candidates: NotificationItem[]): ReconciledNotification[] {
  const store = loadStore(userId);
  const now = Date.now();
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));

  // ১. নতুন ক্যান্ডিডেট যোগ করা
  for (const c of candidates) {
    if (store.items[c.id]) continue;
    if (store.dismissedForeverIds.includes(c.id)) continue;
    if (ONE_TIME_TYPES.has(c.type) && store.everCreatedOnceIds.includes(c.id)) continue;

    store.items[c.id] = {
      type: c.type,
      title: c.title,
      subtitle: c.subtitle,
      href: c.href,
      createdAt: now,
      readAt: null,
    };
    if (ONE_TIME_TYPES.has(c.type)) store.everCreatedOnceIds.push(c.id);
  }

  // ২. এখনো ভ্যালিড ক্যান্ডিডেট থাকা আইটেমের টাইটেল/সাবটাইটেল রিফ্রেশ করা
  //    (যেমন কুপনের "X ঘণ্টা বাকি" পরিবর্তনশীল টেক্সট), টাইমিং অপরিবর্তিত রেখে
  for (const [id, entry] of Object.entries(store.items)) {
    const c = candidateMap.get(id);
    if (c) {
      entry.title = c.title;
      entry.subtitle = c.subtitle;
      entry.href = c.href;
    }
  }

  // ৩. লাইভ-কন্ডিশন টাইপ: ক্যান্ডিডেটে না থাকলে (শর্ত আর সত্যি না) সাথে সাথে সরানো
  for (const id of Object.keys(store.items)) {
    const entry = store.items[id];
    if (LIVE_CONDITION_TYPES.has(entry.type) && !candidateMap.has(id)) {
      delete store.items[id];
    }
  }

  // ৪. রিড-থেন-২৪ঘণ্টা গ্রুপ: পড়ার ২৪ ঘণ্টা পর অটো-ডিলিট
  for (const id of Object.keys(store.items)) {
    const entry = store.items[id];
    if (!LIVE_CONDITION_TYPES.has(entry.type) && entry.readAt != null && now - entry.readAt >= READ_TTL_MS) {
      delete store.items[id];
    }
  }

  // ৫. নতুন-আগে সাজানো এবং সর্বোচ্চ ৫টার সীমা (তার বেশি হলে সবচেয়ে পুরোনোটা বাদ)
  let list = Object.entries(store.items)
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => b.createdAt - a.createdAt);

  if (list.length > MAX_ITEMS) {
    const overflow = list.slice(MAX_ITEMS);
    list = list.slice(0, MAX_ITEMS);
    for (const item of overflow) delete store.items[item.id];
  }

  saveStore(userId, store);

  return list.map(({ id, type, title, subtitle, href, createdAt, readAt }) => ({
    id, type, title, subtitle, href, createdAt, readAt,
  }));
}

/** প্যানেল খোলার সময় বর্তমানে দেখানো সব আইটেমকে "পড়া হয়েছে" মার্ক করা */
export function markNotificationsRead(userId: string, ids: string[]): void {
  const store = loadStore(userId);
  const now = Date.now();
  let changed = false;
  for (const id of ids) {
    const entry = store.items[id];
    if (entry && entry.readAt == null) {
      entry.readAt = now;
      changed = true;
    }
  }
  if (changed) saveStore(userId, store);
}

/** নির্দিষ্ট একটা নোটিফিকেশন ম্যানুয়ালি ডিলিট করা — চিরদিনের জন্য (আর ফিরে আসবে না) */
export function dismissNotificationForever(userId: string, id: string): void {
  const store = loadStore(userId);
  delete store.items[id];
  if (!store.dismissedForeverIds.includes(id)) store.dismissedForeverIds.push(id);
  saveStore(userId, store);
}
