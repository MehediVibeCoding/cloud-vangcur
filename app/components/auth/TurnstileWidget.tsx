'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { loadTurnstileScript } from '@/lib/turnstile';

export interface TurnstileHandle {
  /** এই মুহূর্তে তৈরি টোকেন (না থাকলে খালি স্ট্রিং) */
  getToken: () => string;
  /** টোকেন তৈরি না হওয়া পর্যন্ত সর্বোচ্চ timeoutMs অপেক্ষা করে; না পেলে খালি স্ট্রিং */
  waitForToken: (timeoutMs?: number) => Promise<string>;
  /** ব্যবহৃত টোকেন বাতিল করে নতুন যাচাই শুরু */
  reset: () => void;
}

interface TurnstileWidgetProps {
  /** ফর্ম/মোডাল বন্ধ থাকলে widget বসাবে না — অহেতুক script লোড এড়াতে */
  active: boolean;
}

/**
 * Cloudflare Turnstile widget। NEXT_PUBLIC_TURNSTILE_SITE_KEY সেট করা না থাকলে কিছুই
 * render/লোড করে না (graceful degrade)।
 *
 * ⚠️ আগে এটা `size: 'invisible'` + `display:none` কন্টেইনারে ছিল — Cloudflare কোনো ব্রাউজারকে
 * সন্দেহ করলে চেকবক্স দেখাতে চায়, কিন্তু লুকানো উইজেটে সেটা দেখানোর জায়গা ছিল না, ফলে
 * ওই ফোন/ব্রাউজারে যতবার চেষ্টা করুক টোকেন তৈরিই হতো না। এখন `interaction-only`:
 * সাধারণ ব্যবহারকারী কিছুই দেখবেন না, কিন্তু যাচাই আটকে গেলে ফর্মের ওপরে চেকবক্স আসবে।
 * (Cloudflare ড্যাশবোর্ডে উইজেটের Mode অবশ্যই "Managed" হতে হবে — "Invisible" মোডে চেকবক্স আসে না।)
 */
const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(function TurnstileWidget(
  { active },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string>('');
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useImperativeHandle(ref, () => ({
    getToken: () => tokenRef.current,
    waitForToken: (timeoutMs = 10000) =>
      new Promise<string>((resolve) => {
        if (tokenRef.current) { resolve(tokenRef.current); return; }
        const startedAt = Date.now();
        const timer = setInterval(() => {
          if (tokenRef.current) {
            clearInterval(timer);
            resolve(tokenRef.current);
          } else if (Date.now() - startedAt >= timeoutMs) {
            clearInterval(timer);
            resolve('');
          }
        }, 100);
      }),
    reset: () => {
      tokenRef.current = '';
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // widget আগেই সরানো হয়ে থাকতে পারে — নিরাপদে ignore
        }
      }
    },
  }));

  useEffect(() => {
    if (!active || !siteKey || !containerRef.current || widgetIdRef.current) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current || widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          size: 'flexible',
          appearance: 'interaction-only',
          // ব্যর্থ হলে নিজে থেকে আবার চেষ্টা; মেয়াদ (৫ মিনিট) শেষ হলে নিজে নতুন টোকেন
          retry: 'auto',
          'retry-interval': 3000,
          'refresh-expired': 'auto',
          'refresh-timeout': 'auto',
          callback: (token: string) => {
            tokenRef.current = token;
          },
          'error-callback': () => {
            tokenRef.current = '';
            // false/undefined ফেরত দিলে Cloudflare নিজের স্বয়ংক্রিয় পুনরায় চেষ্টা চালিয়ে যায়
          },
          'expired-callback': () => {
            tokenRef.current = '';
          },
          'timeout-callback': () => {
            tokenRef.current = '';
          },
        });
      })
      .catch(() => {
        // script লোড ব্যর্থ হলে token খালিই থাকবে — কল করা কোড স্পষ্ট বার্তা দেখাবে
      });

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
      tokenRef.current = '';
    };
  }, [active, siteKey]);

  if (!siteKey) return null;
  // লুকানো নয়: যাচাই চেকবক্স দরকার হলে এখানেই দেখাবে। দরকার না হলে উচ্চতা শূন্য (empty:hidden-এর মতো আচরণ)।
  return <div ref={containerRef} className="flex w-full justify-center" />;
});

export default TurnstileWidget;
