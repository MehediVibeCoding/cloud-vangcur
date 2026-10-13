'use client';

import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { SHOW_BG_CONFIRM_EVENT } from '@/lib/uiEvents';
import { useT } from '@/lib/i18n/useT';
import {
  GAME_INVITE_DELAY_MS, GAME_MAX_PLAY_MS, getEnabledGames, gameUrl, type GameDef,
} from '@/lib/games';

/**
 * 🎮 ওয়েটিং পেজ/ওভারলের মিনি গেম — একটাই কম্পোনেন্ট, দুই জায়গায় বসে।
 *
 *  • ইনলাইনে একটা ছোট "গেম খেলুন" বাটন দেখায় (যেখানে কম্পোনেন্টটা বসানো হয়)।
 *  • বাটনে ক্লিক (বা `variant="page"`-এ ৪০ সেকেন্ড পর নিজে থেকে) → ইনভাইট পপআপ (✕ দিয়ে বন্ধ হয়)।
 *  • পপআপের গেম কার্ডে ক্লিক → ফুলস্ক্রিন গেম (iframe — তখনই তৈরি হয়, তাই যে খেলবে না তার কোনো বাড়তি ডাউনলোড নেই)।
 *  • গেম বন্ধ হয় তৎক্ষণাৎ: গেমের ✕ / Esc, অর্ডারের স্ট্যাটাস বদলালে (`active` = false বা কনফার্ম ইভেন্ট),
 *    অথবা অর্ডার সাবমিটের ৫ মিনিট পূর্ণ হলে। বন্ধ হলে iframe ধ্বংস হয় (WebGL মেমোরি মুক্ত)।
 *  • সময় গোনা হয় `vc_pending_ts` (সাবমিটের সময়) থেকে — StatusClient-এর ৫ মিনিটের লজিকের সাথে হুবহু এক।
 *
 * এই কম্পোনেন্ট অর্ডারের স্ট্যাটাস নিজে পোল করে না — ডাটাবেজে কোনো বাড়তি রিকোয়েস্ট যায় না।
 */

type Phase = 'idle' | 'invite' | 'playing';

function readSubmitTs(): number {
  try {
    return parseInt(localStorage.getItem('vc_pending_ts') || '0', 10) || 0;
  } catch {
    return 0;
  }
}

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

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

interface Props {
  /** `page` = ফুলস্ক্রিন স্ট্যাটাস পেজ (৪০ সেকেন্ড পর অটো-পপআপ), `overlay` = ওভারলে (শুধু বাটন) */
  variant: 'page' | 'overlay';
  /** অর্ডার এখনো পেন্ডিং (এবং ওয়েটিং স্ক্রিন চালু) থাকলে true */
  active: boolean;
}

export default function WaitingGame({ variant, active }: Props) {
  const { lang } = useT();
  const en = lang === 'en';
  const games = getEnabledGames();

  const [phase, setPhase] = useState<Phase>('idle');
  const [game, setGame] = useState<GameDef | null>(null);
  const [expired, setExpired] = useState(false);
  const [mounted, setMounted] = useState(false);
  const submitTsRef = useRef(0);
  const autoShownRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    submitTsRef.current = readSubmitTs();
    setMounted(true);
  }, []);

  const closeAll = useCallback(() => {
    setPhase('idle');
    setGame(null);
    try {
      const fsEl = document.fullscreenElement || (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      if (fsEl && (fsEl === wrapRef.current || wrapRef.current?.contains(fsEl))) {
        const exit = document.exitFullscreen || (document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen;
        exit?.call(document)?.catch?.(() => {});
      }
    } catch {
      // ফুলস্ক্রিন API না থাকলে বা এক্সিট ব্যর্থ হলে চুপচাপ উপেক্ষা — গেম যেন বন্ধ হওয়া আটকে না যায়
    }
  }, []);

  // ⏱️ ৫ মিনিটের সীমা: টাইমার + ব্যাকগ্রাউন্ড থেকে ফিরলে আবার হিসাব (ব্রাউজার ব্যাকগ্রাউন্ডে টাইমার থামায়)
  useEffect(() => {
    if (!mounted) return undefined;
    const isOver = () => {
      const ts = submitTsRef.current;
      return !ts || Date.now() - ts >= GAME_MAX_PLAY_MS;
    };
    const check = () => {
      if (isOver()) {
        setExpired(true);
        closeAll();
        return true;
      }
      return false;
    };
    if (check()) return undefined;
    const remaining = Math.max(0, GAME_MAX_PLAY_MS - (Date.now() - submitTsRef.current));
    const timer = setTimeout(check, remaining + 50);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [mounted, closeAll]);

  // 🔔 অর্ডার কনফার্ম হলে (SHOW_BG_CONFIRM_EVENT) গেম/পপআপ সঙ্গে সঙ্গে বন্ধ — কনফার্ম পপআপ যেন গেমের নিচে চাপা না পড়ে
  useEffect(() => {
    window.addEventListener(SHOW_BG_CONFIRM_EVENT, closeAll);
    return () => window.removeEventListener(SHOW_BG_CONFIRM_EVENT, closeAll);
  }, [closeAll]);

  // স্ট্যাটাস বদলে গেলে (পেন্ডিং আর নেই)
  useEffect(() => {
    if (!active) closeAll();
  }, [active, closeAll]);

  // 👋 ইউজার ট্যাব/ব্রাউজার থেকে সরে গেলে (ক্লোজ বাটনে না চেপেই) গেম সাথে সাথে বন্ধ — ব্যাকগ্রাউন্ডে সাউন্ড/লুপ চলতে থাকা আটকাতে
  useEffect(() => {
    if (phase === 'idle') return undefined;
    const onVisibility = () => { if (document.visibilityState === 'hidden') closeAll(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', closeAll);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', closeAll);
    };
  }, [phase, closeAll]);

  // 💬 ফুলস্ক্রিন পেজে প্রথম ~৪০ সেকেন্ড কনটেন্ট পড়ার সময় দিয়ে নিজে থেকে একবার পপআপ
  useEffect(() => {
    if (variant !== 'page' || !mounted || !active || expired || games.length === 0) return undefined;
    const timer = setTimeout(() => {
      if (autoShownRef.current) return;
      autoShownRef.current = true;
      setPhase((p) => (p === 'idle' ? 'invite' : p));
    }, GAME_INVITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [variant, mounted, active, expired, games.length]);

  // গেমের ভেতরের ✕ বাটন থেকে আসা বার্তা (শুধু আমাদের নিজের iframe থেকে)
  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      if ((e.data as { type?: string } | null)?.type === 'vc-game-close') closeAll();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [phase, closeAll]);

  // 🖥️ গেম শুরু হওয়ার সাথে সাথে পুরো প্যানেলটা ব্রাউজারের নেটিভ ফুলস্ক্রিনে নেওয়ার চেষ্টা (ডেস্কটপ ও মোবাইল দুটোতেই —
  // ব্যর্থ হলে (ব্রাউজার সাপোর্ট না করলে/পলিসি ব্লক করলে) চুপচাপ বর্তমান কার্ড-সাইজ লেআউটেই পড়ে থাকে)
  useEffect(() => {
    if (phase !== 'playing') return;
    const el = wrapRef.current;
    if (!el) return;
    const req = el.requestFullscreen
      || (el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen;
    try {
      req?.call(el)?.catch?.(() => {});
    } catch {
      // নীরবে উপেক্ষা — ফুলস্ক্রিন না হলেও গেম স্বাভাবিকভাবে চলবে
    }
  }, [phase]);

  // স্ক্রল লক + Esc (শুধু পপআপ/গেম খোলা থাকলে)
  useEffect(() => {
    if (phase === 'idle') return undefined;
    lockBody();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAll(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockBody();
    };
  }, [phase, closeAll]);

  if (!mounted || !active || expired || games.length === 0) return null;

  const openInvite = () => setPhase('invite');
  const startGame = (g: GameDef) => { setGame(g); setPhase('playing'); };

  return (
    <>
      {/* ইনলাইন "গেম খেলুন" বাটন — ওয়েটিং কার্ডের ডিজাইনের সাথে মিলিয়ে */}
      <button
        type="button"
        onClick={openInvite}
        className="relative z-10 mb-4 flex w-full items-center justify-center gap-1.5 font-body text-[12.5px] font-bold text-brand-light transition-opacity duration-brand hover:opacity-80 active:scale-[0.98]"
      >
        <IconGamepad />
        <span className="underline decoration-brand-light/50 underline-offset-[3px]">{en ? 'Bored? Play a quick game' : 'বিরক্ত লাগছে? একটু গেম খেলুন'}</span>
      </button>

      {/* পপআপ ও গেম — পোর্টালে, যাতে ওভারলের স্ক্রল/ট্রান্সফর্ম কন্টেইনারের ভেতরে আটকে না যায় */}
      {phase !== 'idle' && createPortal(
        <>
          {phase === 'invite' && (
            <div
              className="fixed inset-0 z-[1300] flex items-center justify-center bg-ink/55 p-4 backdrop-blur-[3px] animate-soft-fade-in"
              onClick={closeAll}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="relative w-full max-w-[360px] rounded-[24px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-5 text-center shadow-sh3 ring-1 ring-white/80 animate-section-reveal"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={closeAll}
                  aria-label={en ? 'Close' : 'বন্ধ করুন'}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-brand-light/30 bg-white/90 text-ink/70 shadow-xs transition-colors hover:bg-white hover:text-ink active:scale-95"
                >
                  <IconClose />
                </button>

                <div className="mx-auto mb-3 mt-1 flex h-14 w-14 items-center justify-center rounded-full border border-brand-light/35 bg-white text-brand-light shadow-xs">
                  <IconGamepad size={26} />
                </div>
                <h3 className="mb-1.5 font-body text-[17px] font-extrabold text-ink">
                  {en ? 'Feeling bored?' : 'বিরক্ত লাগছে?'}
                </h3>
                <p className="mb-4 font-body text-[12.5px] leading-[1.7] text-ink/80">
                  {en
                    ? 'While your order gets confirmed, you can play a quick game. We will let you know the moment your order status changes.'
                    : 'চাইলে আপনার অর্ডারটি কনফার্ম হতে হতে আপনি একটু গেম খেলে নিতে পারেন। অর্ডারের স্ট্যাটাস বদলালেই আমরা সাথে সাথে জানিয়ে দেব।'}
                </p>

                <div className="flex flex-col gap-2.5">
                  {games.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => startGame(g)}
                      className="flex w-full items-center gap-3 rounded-[16px] border border-brand-light/35 bg-white/90 p-3 text-left shadow-xs transition-all duration-brand hover:border-brand-light hover:bg-white active:scale-[0.98]"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-brand-bg text-[22px]">
                        {g.thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : g.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block font-body text-[13.5px] font-extrabold text-ink">{en ? g.titleEn : g.titleBn}</strong>
                        <span className="block font-body text-[11.5px] leading-snug text-muted">{en ? g.descEn : g.descBn}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-info to-brand-light px-3 py-1.5 font-body text-[11.5px] font-bold text-white">
                        {en ? 'Play' : 'খেলুন'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {phase === 'playing' && game && (
            <div
              className="fixed inset-0 z-[1310] flex items-center justify-center bg-[#0B1B33]/90 animate-soft-fade-in"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div
                ref={wrapRef}
                className="relative h-full w-full overflow-hidden bg-[#C3DEFC] sm:h-[min(94vh,760px)] sm:max-w-[460px] sm:rounded-[24px] sm:shadow-sh3 [&:fullscreen]:max-w-none [&:fullscreen]:rounded-none [&:-webkit-full-screen]:max-w-none [&:-webkit-full-screen]:rounded-none"
              >
                <iframe
                  ref={iframeRef}
                  src={gameUrl(game, lang)}
                  title={en ? game.titleEn : game.titleBn}
                  allow="fullscreen; autoplay"
                  className="h-full w-full border-0"
                  onLoad={() => iframeRef.current?.focus()}
                />
              </div>
            </div>
          )}
        </>,
        document.body,
      )}
    </>
  );
}
