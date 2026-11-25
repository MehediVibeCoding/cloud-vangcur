'use client';

import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { useT } from '@/lib/i18n/useT';
import { getEnabledGames, gameUrl, type GameDef } from '@/lib/games';

/**
 * 🎮 অ্যাকাউন্ট পেজের গেম কার্ড — ওয়েটিং পেজের সেই একই গেম, কিন্তু এখানে সময়ের কোনো সীমা নেই।
 *
 *  • গেম/স্কোর/লিডারবোর্ড সব ওয়েটিং পেজের সাথে এক: একই `public/games/...` ফাইল, একই `game_scores` টেবিল, একই টপ ৩।
 *    পার্থক্য শুধু পরিচয়: ওখানে অর্ডার দিয়ে, এখানে লগইন সেশন দিয়ে (`source: 'account'` — সার্ভারে সেশন থেকে ইউজার চেনা হয়)।
 *  • ৫ মিনিট/অর্ডার-স্ট্যাটাস/কনফার্ম-ইভেন্ট — এসবের কিছুই এখানে গেম বন্ধ করে না। বন্ধ হয় শুধু গেমের ✕ / Esc / "ফিরে যান" বাটনে।
 *  • একজন ইউজারের একাধিক অর্ডার ও অ্যাকাউন্টের খেলা লিডারবোর্ডে একজন হিসেবেই গোনা হয় (ফোনের শেষ ১০ ডিজিট দিয়ে মেলানো)।
 *
 * এই কম্পোনেন্ট শুধু লগইন করা অবস্থায় রেন্ডার করতে হবে (AccountClient থেকে)।
 */

function IconGamepad({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="13" x2="15.01" y2="13" />
      <line x1="18" y1="11" x2="18.01" y2="11" />
      <rect x="2" y="6" width="20" height="12" rx="4" />
    </svg>
  );
}

export default function AccountGameCard() {
  const { lang } = useT();
  const en = lang === 'en';
  const games = getEnabledGames();

  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState<GameDef | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // বর্তমান খেলার "রান" আইডি (সার্ভার খেলা শুরুতে দেয়; স্কোর জমার সময় লাগে) — ওয়েটিং পেজের মতোই Promise
  const runRef = useRef<Promise<string | null> | null>(null);
  // স্কোর জমা ব্যর্থ হলে একই রান দিয়ে আবার চেষ্টার জন্য শেষ রানটা মনে রাখি
  const lastRunRef = useRef<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const close = useCallback(() => {
    setPlaying(null);
    try {
      const fsEl = document.fullscreenElement || (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      if (fsEl && (fsEl === wrapRef.current || wrapRef.current?.contains(fsEl))) {
        const exit = document.exitFullscreen || (document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen;
        exit?.call(document)?.catch?.(() => {});
      }
    } catch {
      // ফুলস্ক্রিন API না থাকলে/এক্সিট ব্যর্থ হলে চুপচাপ উপেক্ষা
    }
  }, []);

  // গেমের ভেতরের বার্তা (শুধু আমাদের নিজের iframe থেকে): ✕ বাটন, লিডারবোর্ড চাওয়া, খেলা শুরু (রান খোলা), স্কোর জমা
  useEffect(() => {
    if (!playing) return undefined;
    const gameId = playing.id;
    const reply = (payload: Record<string, unknown>) => {
      try {
        iframeRef.current?.contentWindow?.postMessage(payload, window.location.origin);
      } catch {
        // iframe ততক্ষণে বন্ধ হয়ে গেলে চুপচাপ উপেক্ষা
      }
    };
    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data as { type?: string; score?: unknown; retry?: unknown } | null;
      if (data?.type === 'vc-game-close') {
        close();
        return;
      }
      if (data?.type === 'vc-game-lb-request') {
        try {
          // me=1: লগইন ইউজারের নিজের সেরা স্কোর ডাটাবেজ থেকে (গেমের "আপনার সেরা" সবসময় সার্ভারের সংখ্যা)
          const res = await fetch(`/api/game-score?game=${encodeURIComponent(gameId)}&me=1`, { cache: 'no-store' });
          const json = await res.json();
          reply({
            type: 'vc-game-lb', ok: !!json?.ok, top: json?.top || [], me: json?.me || null,
          });
        } catch {
          reply({ type: 'vc-game-lb', ok: false, top: [] });
        }
        return;
      }
      if (data?.type === 'vc-game-start') {
        lastRunRef.current = null;
        runRef.current = (async () => {
          try {
            const res = await fetch('/api/game-score', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'start', source: 'account', game: gameId }),
            });
            const json = await res.json();
            return json?.ok && typeof json.run === 'string' ? (json.run as string) : null;
          } catch {
            return null;
          }
        })();
        return;
      }
      if (data?.type === 'vc-game-score' && typeof data.score === 'number') {
        const runPromise = runRef.current;
        runRef.current = null; // প্রতিটা রান একবারই ব্যবহার হয়
        let run = runPromise ? await runPromise : null;
        if (run) lastRunRef.current = run;
        else if (data.retry === true) run = lastRunRef.current; // পুনরায় চেষ্টা: আগের রানটাই
        if (!run) {
          reply({ type: 'vc-game-result', ok: false });
          return;
        }
        try {
          const res = await fetch('/api/game-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'account', game: gameId, score: data.score, run,
            }),
          });
          const json = await res.json();
          reply({ type: 'vc-game-result', ...json });
        } catch {
          reply({ type: 'vc-game-result', ok: false });
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      runRef.current = null;
      lastRunRef.current = null;
    };
  }, [playing, close]);

  // 🖥️ গেম শুরুতে পুরো প্যানেল নেটিভ ফুলস্ক্রিনে নেওয়ার চেষ্টা (ব্যর্থ হলে চুপচাপ স্বাভাবিক লেআউটে চলে)
  useEffect(() => {
    if (!playing) return;
    const el = wrapRef.current;
    if (!el) return;
    const req = el.requestFullscreen
      || (el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen;
    try {
      req?.call(el)?.catch?.(() => {});
    } catch {
      // নীরবে উপেক্ষা
    }
  }, [playing]);

  // স্ক্রল লক + Esc (শুধু গেম খোলা থাকলে)
  useEffect(() => {
    if (!playing) return undefined;
    lockBody();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockBody();
    };
  }, [playing, close]);

  if (!mounted || games.length === 0) return null;

  return (
    <>
      {games.map((g) => (
        <div key={g.id} className="rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-xs backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
              <IconGamepad size={14} />
            </span>
            <div className="font-body text-[13.5px] font-extrabold text-ink">{en ? 'Play a Game' : 'গেম খেলুন'}</div>
          </div>

          <div className="flex items-center gap-3 rounded-[16px] border border-border-base bg-white/90 p-3 shadow-xs">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-brand-bg text-brand-light">
              {g.thumb ? (
                <img src={g.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : <IconGamepad size={22} />}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block font-body text-[13.5px] font-extrabold text-ink">{en ? g.titleEn : g.titleBn}</strong>
              <span className="block font-body text-[11.5px] leading-snug text-muted">{en ? g.descEn : g.descBn}</span>
            </span>
            <button
              type="button"
              onClick={() => setPlaying(g)}
              className="shimmer-sheen shrink-0 rounded-full bg-gradient-to-r from-info to-brand-light px-5 py-2.5 font-body text-[13.5px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03] active:scale-95"
            >
              {en ? 'Play' : 'খেলুন'}
            </button>
          </div>
        </div>
      ))}

      {/* ফুলস্ক্রিন গেম — পোর্টালে, যাতে পেজের স্ক্রল/ট্রান্সফর্মের ভেতরে আটকে না যায় */}
      {playing && createPortal(
        <div
          className="fixed inset-0 z-[1310] flex items-stretch justify-stretch bg-[#EAF3FE] animate-soft-fade-in"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-[#EAF3FE]">
            <iframe
              ref={iframeRef}
              src={gameUrl(playing, lang)}
              title={en ? playing.titleEn : playing.titleBn}
              allow="fullscreen; autoplay"
              className="h-full w-full border-0"
              onLoad={() => {
                iframeRef.current?.focus();
                // গেমের "ওয়েটিং পেজে ফিরে যান" লেখাটা এখানে অ্যাকাউন্টের জন্য বদলানো (একই origin, তাই অ্যাক্সেস পাওয়া যায়)
                try {
                  const back = iframeRef.current?.contentDocument?.getElementById('bBack');
                  if (back) back.textContent = en ? 'Back to account' : 'অ্যাকাউন্টে ফিরে যান';
                } catch {
                  // অ্যাক্সেস না পেলে ডিফল্ট লেখাই থাকবে
                }
              }}
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
