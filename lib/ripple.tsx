'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';

/**
 * "ফিরে যান"-জাতীয় বাটনে ক্লিকের জায়গা থেকে পানির ঢেউয়ের মতো বৃত্ত ছড়ানোর এনিমেশন।
 *
 * ব্যবহার:
 *   1) বাটনের ভেতরে <RippleLayer /> বসান (বাটনের `relative` ক্লাস থাকতে হবে)
 *   2) onClick-এ rippleThen(e, () => router.back()) ডাকুন
 *
 * - ঢেউটা আলাদা লেয়ারে আঁকা হয় (overflow-hidden সেই লেয়ারে), তাই বাটনের বাইরের
 *   বাড়তি ক্লিক-এলাকা (::before) কখনো ছাঁটা পড়ে না।
 * - prefers-reduced-motion চালু থাকলে ঢেউ ও দেরি দুটোই বাদ।
 * - নেভিগেশন ~170ms পরে হয়, যাতে ক্লিকটা "অনুভব" করা যায়; এর মধ্যে আবার ক্লিক করলে উপেক্ষা হয়।
 */

const NAV_DELAY_MS = 170;
let busyUntil = 0;

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function RippleLayer() {
  return <span aria-hidden="true" className="vc-ripple-layer" />;
}

export function playRipple(e: ReactMouseEvent<HTMLElement>): void {
  if (reducedMotion()) return;
  const host = e.currentTarget;
  const layer = host.querySelector<HTMLElement>(':scope > .vc-ripple-layer');
  if (!layer) return;

  const rect = host.getBoundingClientRect();
  // কিবোর্ড/স্ক্রিনরিডার ক্লিকে (detail === 0) বা বাড়তি ক্লিক-এলাকায় ক্লিক হলে বাটনের ভেতরে টেনে আনা
  const hasPoint = e.detail !== 0 && (e.clientX !== 0 || e.clientY !== 0);
  const rawX = hasPoint ? e.clientX - rect.left : rect.width / 2;
  const rawY = hasPoint ? e.clientY - rect.top : rect.height / 2;
  const x = Math.min(Math.max(rawX, 0), rect.width);
  const y = Math.min(Math.max(rawY, 0), rect.height);

  // ক্লিকের বিন্দু থেকে সবচেয়ে দূরের কোণ পর্যন্ত ছড়ালেই পুরো বাটন ঢেকে যায়
  const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));

  const dot = document.createElement('span');
  dot.className = 'vc-ripple';
  dot.style.width = dot.style.height = `${radius * 2}px`;
  dot.style.left = `${x - radius}px`;
  dot.style.top = `${y - radius}px`;
  layer.appendChild(dot);
  const remove = () => dot.remove();
  dot.addEventListener('animationend', remove, { once: true });
  window.setTimeout(remove, 900); // animationend না এলেও পরিষ্কার হবে
}

/** ঢেউ চালিয়ে অল্প পরে action চালায়। দ্রুত ডাবল-ক্লিক হলে দ্বিতীয়টা বাদ। */
export function rippleThen(e: ReactMouseEvent<HTMLElement>, action: () => void): void {
  const now = Date.now();
  if (now < busyUntil) return;
  if (reducedMotion()) {
    action();
    return;
  }
  busyUntil = now + NAV_DELAY_MS + 350;
  playRipple(e);
  window.setTimeout(action, NAV_DELAY_MS);
}
