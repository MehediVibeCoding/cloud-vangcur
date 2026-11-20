'use client';

// 🖼️ প্রোডাক্ট পেজের গ্যালারির বাকি ছবি (প্রথমটা বাদে) আগে থেকে ব্রাউজার-ক্যাশে আনে, যাতে সোয়াইপে লোডিং না দেখায়।
//
// কেন দরকার: গ্যালারি একবারে শুধু বর্তমান ছবির <img> বানায়, তাই বাকি ছবির কোনো রিকোয়েস্টই যায় না যতক্ষণ না
// কাস্টমার সোয়াইপ করে — যত অপেক্ষাই করুক। এখানে পেজ শান্ত হওয়ার পর (লোডের ~১ সেকেন্ড পর, অথবা প্রথম টাচ/ক্লিকে)
// ছবিগুলো একটা একটা করে, কম অগ্রাধিকারে আনা হয়।
//
// খরচ: Worker/Supabase/ডাটাবেজে কোনো রিকোয়েস্ট নেই, প্রিফেচও নয় — শুধু ছবির ফাইল (img.vangcur.com / Cloudflare
// ছবি-সার্ভিস) থেকে ব্রাউজারের ডাউনলোড। ডাটা-সেভার মোডে বা 2g নেটে কিছুই করে না।
// ⚠️ GALLERY_SRCSET_WIDTHS / GALLERY_SIZES / ৮০০-এর fallback অবশ্যই app/product/[slug]/ProductDetailClient.tsx-এর
// গ্যালারির মানের সাথে হুবহু এক থাকতে হবে — নইলে ব্রাউজার অন্য URL আনবে আর ক্যাশ কাজে লাগবে না।
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { buildImageSrcSet, optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';

const GALLERY_SRCSET_WIDTHS = [720, 1600] as const;
const GALLERY_SIZES = '(min-width: 768px) calc((min(100vw, 1100px) - 98px) / 2), calc(100vw - 34px)';
const START_DELAY_MS = 1000;
const GAP_MS = 150;
const KEEP_MAX = 24;

// রেফারেন্স ধরে রাখি যাতে ডাউনলোড মাঝপথে বাদ না পড়ে; একই সেশনে একই ছবি দুবার অনুরোধ করি না
const kept: HTMLImageElement[] = [];
const requested = new Set<string>();

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

// প্রোডাক্টের সব ছবির তালিকা পেজের Product structured-data (JSON-LD `image`) থেকে নিই — page.tsx-এ ওই তালিকা = গ্যালারির
// সব http ছবি, একই ক্রমে। তাই আলাদা props/সার্ভার-কোড লাগে না।
function readGalleryImages(): string[] {
  const out: string[] = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    try {
      const data = JSON.parse(el.textContent || 'null');
      if (data && data['@type'] === 'Product' && Array.isArray(data.image)) {
        data.image.forEach((u: unknown) => typeof u === 'string' && out.push(u));
      }
    } catch {
      // অন্য/ভাঙা JSON-LD — বাদ
    }
  });
  return out;
}

// সরাসরি /product/<slug> পেজে থাকলেই চলে; অন্য পেজে কিছু করে না। মাউন্ট হয় ProductNavOverlay থেকে (লেআউটে একবার)।
export default function ProductImagePreloader() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname.startsWith('/product/')) return;

    const conn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    if (conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return;

    let cancelled = false;
    let started = false;
    let delayTimer: number | undefined;
    let gapTimer: number | undefined;

    let rest: string[] = [];
    const loadFrom = (i: number) => {
      if (cancelled || i >= rest.length) return;
      const val = rest[i];
      const src = optimizeCloudinaryUrl(val, 800);
      if (requested.has(src)) {
        loadFrom(i + 1);
        return;
      }
      requested.add(src);
      const im = new Image();
      im.decoding = 'async';
      (im as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low';
      const set = buildImageSrcSet(val, GALLERY_SRCSET_WIDTHS);
      if (set) {
        im.sizes = GALLERY_SIZES;
        im.srcset = set;
      }
      const next = () => {
        im.onload = null;
        im.onerror = null;
        gapTimer = window.setTimeout(() => loadFrom(i + 1), GAP_MS);
      };
      im.onload = next;
      im.onerror = next;
      im.src = src;
      kept.push(im);
      if (kept.length > KEEP_MAX) kept.shift();
    };

    const removeTriggers = () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('touchstart', start);
    };
    function start() {
      if (started || cancelled) return;
      started = true;
      window.clearTimeout(delayTimer);
      removeTriggers();
      // প্রথম ছবি গ্যালারি নিজেই আনে; বাকিগুলো আমরা
      rest = readGalleryImages().filter((u) => u.startsWith('http')).slice(1);
      loadFrom(0);
    }

    // প্রথম ছবি ও পেজ নিজের কাজ শেষ করুক — তারপর শুরু; তার আগে কাস্টমার ছুঁলে সঙ্গে সঙ্গে
    const arm = () => {
      delayTimer = window.setTimeout(start, START_DELAY_MS);
      window.addEventListener('pointerdown', start, { passive: true });
      window.addEventListener('touchstart', start, { passive: true });
    };
    if (document.readyState === 'complete') arm();
    else window.addEventListener('load', arm, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(delayTimer);
      window.clearTimeout(gapTimer);
      window.removeEventListener('load', arm);
      removeTriggers();
    };
  }, [pathname]);

  return null;
}
