'use client';

import { useEffect, useRef } from 'react';

/**
 * useHistoryModal
 * ─────────────────────────────────────────────────────────────────────
 * মোবাইলের ফিজিক্যাল/জেসচার ব্যাক বাটন অথবা ব্রাউজারের ব্যাক বাটন
 * চাপলে ওয়েবসাইট ব্যাকে না গিয়ে ওপেন থাকা মডাল/ড্রয়ারটি বন্ধ করার
 * সেন্ট্রালাইজড ইউনিভার্সাল হুক। ক্রস (X) বাটনেও স্বাভাবিকভাবে বন্ধ হয়।
 *
 * ব্যবহার:
 *   useHistoryModal(isOpen, onClose);
 *
 * ─────────────────────────────────────────────────────────────────────
 * সব মডাল/ড্রয়ার একটা শেয়ার্ড মডিউল-লেভেল "history স্লট" ব্যবহার করে,
 * প্রতিটি আলাদাভাবে পুশ/ব্যাক না করে। আগে প্রতিটি মডাল বন্ধ হওয়ার সময়
 * cleanup-এ সরাসরি window.history.back() কল করত — যেটা asynchronous,
 * তাই ঠিক তখনই পরের মডাল/পপআপ ওপেন হলে (pushState) বা চেকআউটে
 * router.push() হলে, back()-এর deferred popstate সেটার *পরে* গিয়ে
 * ফায়ার হতো এবং নতুন মডাল বন্ধ করে দিত বা নেভিগেশন উল্টে দিত।
 *
 * এখন:
 *  - মডাল ওপেন/এক মডাল থেকে আরেক মডালে transition — সবসময় synchronous
 *    pushState/replaceState (কখনো popstate ট্রিগার করে না, তাই race নেই)।
 *  - মডাল সম্পূর্ণ বন্ধ হয়ে গেলে (আর কিছু খুলছে না) — এক টিক অপেক্ষা করে
 *    নিশ্চিত হওয়া হয় যে এর মধ্যে অন্য কোনো মডাল স্লটটা নেয়নি বা
 *    router দিয়ে আসল নেভিগেশন হয়ে যায়নি, তারপরই কেবল history.back()
 *    কল করে entry-টা সরিয়ে ফেলা হয় — ফলে ব্যাক বাটনে বাড়তি একটা চাপ
 *    "নষ্ট" হয় না।
 *  - কোনো real navigation (URL পরিবর্তন) হয়ে গেলে সেই entry আর
 *    আমাদের নিয়ন্ত্রণে নেই ধরে নিয়ে হাত দেওয়া হয় না — Next.js router-এর
 *    নিজস্ব history entry-তে কখনো replaceState/back() করা হয় না।
 */

interface ModalStackEntry {
  key: string;
  close: () => void;
}

let modalStack: ModalStackEntry[] = [];
let historySlotUsed = false;
let slotUrl: string | null = null;
let listenerAttached = false;

function ensurePopstateListener() {
  if (listenerAttached || typeof window === 'undefined') return;
  window.addEventListener('popstate', () => {
    // যেকোনো real back/forward navigation-এ আমাদের রিজার্ভ করা স্লট
    // consumed হয়ে যায় — পরের মডাল ওপেন হলে নতুন করে পুশ করবে।
    historySlotUsed = false;
    slotUrl = null;
    if (modalStack.length === 0) return;
    const top = modalStack.pop();
    top?.close();
  });
  listenerAttached = true;
}

/**
 * suppressHistoryCleanup
 * ─────────────────────────────────────────────────────────────────────
 * যখনই কোনো কোড মডাল/ড্রয়ার বন্ধ করার (setOpen(false) / onClose())
 * ঠিক পরপরই একটা আসল navigation করে (router.push দিয়ে অন্য রুটে যাওয়া),
 * তখন এই ফাংশনটা সেই router.push()-এর *ঠিক আগে* কল করতে হবে।
 *
 * কেন দরকার: মডাল বন্ধ হলে useHistoryModal-এর cleanup একটা deferred
 * (setTimeout দিয়ে) window.history.back() শিডিউল করে, যাতে আমরা নিজেরা
 * পুশ করা "modalOpen" history entry-টা সাফ হয়ে যায়। কিন্তু router.push()
 * নিজে React-এর startTransition-এ wrap করা থাকায় এর আসল
 * history.pushState() কলটা ঠিক কখন ঘটবে তার নিশ্চয়তা নেই — অনেক সময়
 * সেটা আমাদের deferred back()-এর *পরে* গিয়ে ঘটে, ফলে back() নতুন
 * navigation-টাকেই উল্টে দেয় (ইউজার দেখে যেন বাটনে ক্লিক করে কিছুই
 * হলো না)।
 *
 * এই ফাংশন কল করলে historySlotUsed/slotUrl সাথে সাথে রিসেট হয়ে যায়,
 * তাই cleanup-এর `if (!historySlotUsed) return;` গার্ডেই থেমে যায় —
 * কোনো replaceState/back() আর ট্রিগার হয় না। আমাদের পুশ করা পুরনো
 * history entry-টা নতুন পেজে গিয়ে এমনিতেই অপ্রাসঙ্গিক হয়ে যায়, তাই
 * সেটা পরিষ্কার না করলেও কোনো সমস্যা নেই।
 */
export function suppressHistoryCleanup(): void {
  historySlotUsed = false;
  slotUrl = null;
  modalStack = [];
}

export function useHistoryModal(isOpen: boolean, onClose: () => void, modalKey?: string) {
  const onCloseRef = useRef(onClose);
  const entryRef = useRef<ModalStackEntry | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;

    ensurePopstateListener();

    const entry: ModalStackEntry = {
      key: modalKey || 'vc-modal',
      close: () => onCloseRef.current(),
    };
    entryRef.current = entry;
    modalStack.push(entry);

    const currentUrl = window.location.href;

    if (!historySlotUsed || slotUrl !== currentUrl) {
      // এই মুহূর্তে আমাদের কোনো নিজস্ব স্লট নেই (হয় প্রথমবার, নয়তো
      // মাঝে একটা real navigation হয়ে গেছে) — নতুন এন্ট্রি পুশ করা হচ্ছে।
      window.history.pushState({ modalOpen: true, key: entry.key }, '');
      historySlotUsed = true;
      slotUrl = window.location.href;
    } else {
      // স্লট আগে থেকেই আছে (এই মডালটা আরেকটা মডাল বন্ধ হওয়ার সাথে
      // সাথেই ওপেন হয়েছে) — নতুন পুশ না করে সেটাই রিইউজ করা হচ্ছে,
      // যাতে ব্যাক বাটনে একবার চাপলেই টপ-মোস্ট মডাল বন্ধ হয়।
      window.history.replaceState({ modalOpen: true, key: entry.key }, '');
    }

    return () => {
      const idx = modalStack.indexOf(entry);
      if (idx !== -1) modalStack.splice(idx, 1);

      if (typeof window === 'undefined' || !historySlotUsed) return;
      // মাঝে যদি ইতিমধ্যে অন্য কোথাও real navigation (URL বদল) হয়ে
      // গিয়ে থাকে, তাহলে এই history entry আর আমাদের নয় — হাত না
      // দেওয়াই নিরাপদ (Next router-এর entry ওভাররাইট হওয়া থেকে বাঁচে)।
      if (window.location.href !== slotUrl) return;

      if (modalStack.length > 0) {
        // আরেকটা মডাল এই স্লট রিইউজ করছে — সেই মডালের নিজের effect-ই
        // replaceState করে নেবে, এখানে কিছু করার দরকার নেই।
        return;
      }

      window.history.replaceState({ modalOpen: false }, '');
      const urlAtClose = slotUrl;

      // পরের এক টিক অপেক্ষা করা হচ্ছে — এই সময়ের মধ্যে যদি সিঙ্ক্রোনাসভাবে
      // আরেকটা মডাল ওপেন হয় বা router.push দিয়ে নেভিগেট করা হয়, সেটা
      // এতক্ষণে ঘটে যাবে। তখনই কেবল নিশ্চিতভাবে history.back() কল করে
      // entry-টা পুরোপুরি সরিয়ে ফেলা হয় (নাহলে ব্যাক বাটনে একটা বাড়তি
      // "নষ্ট" চাপ লাগত)। এই deferred back() অন্য কিছুর সাথে race করে
      // না, কারণ ততক্ষণে সব সিঙ্ক্রোনাস কাজ শেষ হয়ে গেছে।
      setTimeout(() => {
        if (modalStack.length > 0) return;
        if (!historySlotUsed || slotUrl !== urlAtClose) return;
        if (typeof window === 'undefined' || window.location.href !== urlAtClose) return;
        historySlotUsed = false;
        slotUrl = null;
        window.history.back();
      }, 0);
    };
  }, [isOpen, modalKey]);
}

export default useHistoryModal;
