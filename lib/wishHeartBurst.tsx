'use client';

import { motion } from 'motion/react';

// ────────────────────────────────────────────────────────────────────────
// শেয়ার্ড উইশলিস্ট হার্ট-বার্স্ট এনিমেশন — কোনো প্রোডাক্টে wishlist যোগ
// করলে হার্ট আইকনের চারপাশ থেকে ৫-৬টা ছোট হার্ট ছড়িয়ে/ভেসে উঠে ফেড-আউট হয়ে
// যায়। প্রোডাক্ট কার্ড (হোমপেজ) ও প্রোডাক্ট ডিটেল পেজ — দুই জায়গাতেই এই একই
// লজিক ব্যবহার করা হয়, যাতে দুটো জায়গায় একদম সেম এনিমেশন দেখা যায়।

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface HeartParticle {
  id: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
  rot: number;
}

const HEART_BURST_COLORS = ['#FF5A6E', '#FF7D90', '#FFA3B0', '#FF5A6E', '#FF93A4'];

export function makeHeartBurst(seed: number): HeartParticle[] {
  const count: number = 6;
  const spreadDeg = 156; // উপরের দিকে হালকা বাঁকা একটা "ফ্যান" আকারে ছড়িয়ে পড়ে
  const baseAngle = -90; // সোজা উপরের দিক
  const particles: HeartParticle[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const jitter = Math.random() * 16 - 8;
    const angleDeg = baseAngle - spreadDeg / 2 + spreadDeg * t + jitter;
    const rad = (angleDeg * Math.PI) / 180;
    const distance = 24 + Math.random() * 18;
    particles.push({
      id: seed * 10 + i,
      dx: Math.cos(rad) * distance,
      dy: Math.sin(rad) * distance,
      size: 7 + Math.random() * 6,
      color: HEART_BURST_COLORS[i % HEART_BURST_COLORS.length],
      delay: i * 0.03,
      rot: Math.random() * 50 - 25,
    });
  }
  return particles;
}

export function BurstHeart({ p }: { p: HeartParticle }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.3, x: 0, y: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.3, 1, 1, 0.5],
        x: p.dx,
        y: p.dy,
        rotate: p.rot,
      }}
      transition={{
        duration: 0.8,
        delay: p.delay,
        ease: [0.22, 0.7, 0.2, 1],
        times: [0, 0.22, 0.62, 1],
      }}
      className="pointer-events-none absolute left-1/2 top-1/2"
      style={{ marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
    >
      <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill={p.color}>
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </motion.span>
  );
}
