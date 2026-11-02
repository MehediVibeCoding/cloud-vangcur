'use client';

// Cloudflare Turnstile — invisible bot-protection widget loader।
// লগইন/রেজিস্ট্রেশন ফর্মে ব্যবহৃত হয়; ভেরিফিকেশন সবসময় সার্ভার-সাইডে হয় (app/api/verify-turnstile)।

export interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  /** true ফেরত দিলে Cloudflare নিজের ডিফল্ট ত্রুটি-আচরণ (স্বয়ংক্রিয় পুনরায় চেষ্টা) বন্ধ রাখে */
  'error-callback'?: (errorCode?: string) => boolean | void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  'unsupported-callback'?: () => void;
  size?: 'normal' | 'invisible' | 'flexible' | 'compact';
  appearance?: 'always' | 'execute' | 'interaction-only';
  retry?: 'auto' | 'never';
  'retry-interval'?: number;
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  'refresh-timeout'?: 'auto' | 'manual' | 'never';
  language?: string;
}

interface TurnstileApi {
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __turnstileLoadPromise?: Promise<void>;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

export function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (window.__turnstileLoadPromise) return window.__turnstileLoadPromise;

  window.__turnstileLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile script load failed'));
    document.head.appendChild(script);
  });
  return window.__turnstileLoadPromise;
}

export type TurnstileVerifyResult = 'ok' | 'rejected' | 'rate_limited' | 'error';

/**
 * সার্ভারে টোকেন যাচাই — ফলাফল আলাদা করে জানায়, যাতে ব্যবহারকারীকে ঠিক কারণটা বলা যায়:
 *  'rejected'     → Cloudflare টোকেন গ্রহণ করেনি (সত্যিই ব্যর্থ/মেয়াদোত্তীর্ণ/ব্যবহৃত)
 *  'rate_limited' → একই আইপি থেকে অল্প সময়ে অনেক অনুরোধ (শেয়ার্ড মোবাইল নেটে হতে পারে)
 *  'error'        → নেটওয়ার্ক বা যাচাই-সার্ভারের সাময়িক সমস্যা (ব্যবহারকারীর দোষ নয়)
 */
export async function verifyTurnstileTokenDetailed(token: string): Promise<TurnstileVerifyResult> {
  try {
    const res = await fetch('/api/verify-turnstile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.status === 429) return 'rate_limited';
    if (res.status >= 500) return 'error';
    const data = await res.json().catch(() => null);
    if (data?.success) return 'ok';
    // ৪০০ (খালি/অবৈধ টোকেন) ও success:false — দুটোই টোকেন গ্রহণযোগ্য হয়নি
    return 'rejected';
  } catch {
    return 'error';
  }
}

/** পুরনো কলারদের জন্য — শুধু সফল/ব্যর্থ */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  return (await verifyTurnstileTokenDetailed(token)) === 'ok';
}
