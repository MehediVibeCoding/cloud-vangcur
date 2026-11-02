// ফাইলের পাথ: lib/crossTabSync.ts
// [NEW] একই ব্রাউজারে একাধিক ট্যাব খোলা থাকলে localStorage-ভিত্তিক স্টোর
// (authStore/cartStore/wishlistStore) একে অপরের সাথে সিঙ্কে রাখার শেয়ার্ড ইউটিলিটি।
//
// কেন দরকার: আগে লগআউট/কার্ট-আপডেট/উইশলিস্ট-আপডেট শুধু যে ট্যাবে হতো সেই ট্যাবের
// zustand স্টোর আপডেট হতো আর localStorage-এ সেভ হতো — কিন্তু একই সাইটের অন্য খোলা
// ট্যাব সেই পরিবর্তনের কথা জানতেই পারত না, রিফ্রেশ না করা পর্যন্ত পুরনো অবস্থাই দেখাত।
//
// সমাধান: BroadcastChannel (দ্রুত, সাপোর্ট ভালো — Safari 15.4+/Chrome/Firefox সবখানে)।
// যেসব পুরনো ব্রাউজারে BroadcastChannel নেই, সেখানে `storage` ইভেন্টে ফলব্যাক — এটা
// localStorage.setItem() কল হলে ব্রাউজার নিজে থেকেই অন্য ট্যাবে পাঠায়, বাড়তি কোনো কোড
// ছাড়াই। দুটোই শুধু *অন্য* ট্যাবে ফায়ার হয় (নিজের ট্যাবে না), তাই সেলফ-মেসেজ ফিল্টার
// করার দরকার নেই।

type TabSyncHandler = () => void;

/**
 * `storageKey`-এ localStorage বদলালে (অন্য ট্যাব থেকে) `onChange` কল হবে।
 * রিটার্ন করা ফাংশন কল করলে লিসেনার সরে যায় (এই স্টোরগুলো যদিও পেজের সারাজীবন বেঁচে
 * থাকে, cartStore-এর pagehide/visibilitychange লিসেনারের মতোই — তাও ক্লিনআপ দেওয়া হলো)।
 */
export function subscribeTabSync(channelName: string, storageKey: string, onChange: TabSyncHandler): () => void {
  if (typeof window === 'undefined') return () => {};

  if ('BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel(channelName);
      const onMessage = () => onChange();
      bc.addEventListener('message', onMessage);
      return () => {
        bc.removeEventListener('message', onMessage);
        bc.close();
      };
    } catch {
      // তৈরি ব্যর্থ হলে নিচের storage-ইভেন্ট ফলব্যাকে যাওয়া
    }
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key === storageKey) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/**
 * localStorage-এ লেখার পরপরই কল করতে হবে — অন্য ট্যাবগুলোকে জানিয়ে দেয় যে ডেটা বদলেছে।
 * BroadcastChannel না থাকলে কিছুই করে না (তখন storage ইভেন্টই যথেষ্ট, সেটা এমনিতেই যায়)।
 */
export function notifyTabSync(channelName: string): void {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
  try {
    const bc = new BroadcastChannel(channelName);
    bc.postMessage(1);
    bc.close();
  } catch {
    // ignore — storage ইভেন্ট ফলব্যাক হিসেবে থাকবে
  }
}
