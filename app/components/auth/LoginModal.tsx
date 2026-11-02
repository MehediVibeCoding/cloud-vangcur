'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { showToast } from '@/lib/toast';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useAuthStore } from '@/lib/store/authStore';
import {
  signInWithPassword, signUp, signInWithGoogle, checkOAuthCallback,
  syncWishlistFromSupabase, saveWishlistToSupabase, mergeGuestOrdersToUser,
  requestPasswordReset,
} from '@/lib/authData';
import { checkPasswordStrength } from '@/lib/passwordStrength';
import {
  validateEmail, validatePhone, validateName, sanitizePlainName, sanitizeEmailInput,
  sanitizePhoneInput, PHONE_INPUT_MAX_CHARS,
} from '@/lib/security';
import { verifyTurnstileTokenDetailed } from '@/lib/turnstile';
import { checkPasswordResetLimitAction } from '@/app/actions/rateLimit';
import { useT } from '@/lib/i18n/useT';
import useHistoryModal, { suppressHistoryCleanup } from '@/lib/useHistoryModal';
import TurnstileWidget, { type TurnstileHandle } from './TurnstileWidget';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import type { CurrentUser } from '@/types';

const MAX_NAME_LEN = 30;
const MAX_PASS_LEN = 30;
const MAX_EMAIL_LEN = 254;

type Mode = 'login' | 'register' | 'forgot';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderMode?: boolean;
  initialMode?: Mode;
  onAuthSuccess?: (user: CurrentUser) => void;
}

const lineIcon = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function IconClose() {
  return (
    <svg {...lineIcon} width="16" height="16" strokeWidth={2.2}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg {...lineIcon} width="16" height="16" strokeWidth={1.7}>
      <path d="M4 6h16v12H4z" />
      <path d="M4.5 6.5L12 12.5l7.5-6" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg {...lineIcon} width="16" height="16" strokeWidth={1.7}>
      <rect x="5" y="10.5" width="14" height="9" rx="2" />
      <path d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg {...lineIcon} width="16" height="16" strokeWidth={1.7}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg {...lineIcon} width="16" height="16" strokeWidth={1.7}>
      <path d="M6 3.5h3.2l1.3 4-2 1.6a11 11 0 0 0 5.4 5.4l1.6-2 4 1.3V17c0 1.4-1.2 2.5-2.6 2.3C10.5 18.4 5.6 13.5 4.7 7.1 4.5 5.7 5.6 3.5 6 3.5z" />
    </svg>
  );
}
function IconEye({ off }: { off?: boolean }) {
  return (
    <svg {...lineIcon} width="17" height="17" strokeWidth={1.7}>
      <path d="M2.5 12S5.8 6 12 6s9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.6" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}
function IconAlert() {
  return (
    <svg {...lineIcon} width="15" height="15" strokeWidth={2} className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16" r=".6" fill="currentColor" />
    </svg>
  );
}
function IconMailCheck() {
  return (
    <svg {...lineIcon} width="26" height="26" strokeWidth={1.6}>
      <path d="M4 6h16v12H4z" />
      <path d="M4.5 6.5L12 12.5l7.5-6" />
      <path d="M9 16.3l1.8 1.8L15.5 14" />
    </svg>
  );
}

function IconGmail() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#fff" d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5z" />
      <path fill="none" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3.5 6.5L12 13l8.5-6.5" />
      <path fill="#4285F4" d="M2 8.2l2.2 1.7V20H4.5A2.5 2.5 0 0 1 2 17.5z" />
      <path fill="#34A853" d="M22 8.2l-2.2 1.7V20h-.3a2.5 2.5 0 0 0 2.5-2.5z" />
    </svg>
  );
}
function IconArrowLeft() {
  return (
    <svg {...lineIcon} width="12" height="12" strokeWidth={2.4}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}
function IconSpinner() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ইমেইল ঠিকানা দেখে ইনবক্সের সরাসরি লিংক — Gmail হলে সেই অ্যাকাউন্টের ইনবক্সই খোলে
function getInboxTarget(email: string): { href: string; isGmail: boolean } {
  const em = email.trim().toLowerCase();
  const domain = em.split('@')[1] || '';
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return { href: `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(em)}`, isGmail: true };
  }
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) {
    return { href: 'https://outlook.live.com/mail/', isGmail: false };
  }
  if (domain === 'yahoo.com' || domain === 'ymail.com') {
    return { href: 'https://mail.yahoo.com/', isGmail: false };
  }
  return { href: 'mailto:', isGmail: false };
}

interface CheckInboxScreenProps {
  email: string;
  message: React.ReactNode;
  openLabel: string;
  openOtherLabel: string;
  spamHint: string;
  backLabel?: string;
  onBack?: () => void;
}

function CheckInboxScreen({ email, message, openLabel, openOtherLabel, spamHint, backLabel, onBack }: CheckInboxScreenProps) {
  const target = getInboxTarget(email);
  return (
    <div className="pt-1 pb-3 text-center">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light/10 text-brand-light">
        <IconMailCheck />
      </div>
      <p className="font-body text-[14px] leading-relaxed text-ink">{message}</p>
      <a
        href={target.href}
        target={target.href.startsWith('http') ? '_blank' : undefined}
        rel="noopener noreferrer"
        className={`${primaryBtnClass} mt-5 flex items-center justify-center gap-2`}
      >
        {target.isGmail && <IconGmail />}
        {target.isGmail ? openLabel : openOtherLabel}
      </a>
      <p className="mt-3 font-body text-[12px] leading-snug text-muted">{spamHint}</p>
      {onBack && backLabel && (
        <button
          onClick={onBack}
          className="mx-auto mt-3 flex items-center gap-1 bg-transparent p-0 font-body text-[12px] font-semibold text-brand-light transition-brand duration-brand hover:opacity-75"
        >
          <IconArrowLeft />
          {backLabel}
        </button>
      )}
    </div>
  );
}

function HeaderDecor() {
  const deco = { ...lineIcon, strokeWidth: 1.4 };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]">
      <svg {...deco} width="34" height="34" className="absolute -left-1 top-3 -rotate-12" viewBox="0 0 24 24">
        <path d="M4 13a8 8 0 0 1 16 0" />
        <rect x="3" y="13" width="4" height="6" rx="1.5" />
        <rect x="17" y="13" width="4" height="6" rx="1.5" />
      </svg>
      <svg {...deco} width="26" height="26" className="absolute right-4 top-4 rotate-6" viewBox="0 0 24 24">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
      <svg {...deco} width="22" height="22" className="absolute bottom-3 left-8 rotate-[10deg]" viewBox="0 0 24 24">
        <path d="M9 18c1.5-3 1.5-9 0-12" />
        <path d="M15 18c-1.5-3-1.5-9 0-12" />
        <path d="M4.5 6h1.5M4.5 18h1.5M18 6h1.5M18 18h1.5" />
      </svg>
    </div>
  );
}

function ErrMsg({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2.5 font-body text-[12.5px] font-semibold text-[#B91C1C]">
      <IconAlert />
      <span>{text}</span>
    </div>
  );
}

function FieldError({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="mt-1 pl-1 font-body text-[12.5px] font-semibold text-[#DC2626]">{text}</p>;
}

function fieldClass(hasErr: boolean, extra = '') {
  const base =
    'w-full rounded-full border pl-11 pr-[18px] py-[13px] font-body text-sm text-ink outline-none transition-brand duration-brand placeholder:text-muted/70';
  const normal =
    'border-border-base bg-white focus:border-brand-light/50 focus:shadow-[0_0_0_3px_rgba(0,88,199,.12)]';
  const error =
    'border-[#FCA5A5] bg-[#FEF2F2] focus:border-[#DC2626] focus:bg-[#FEF2F2] focus:shadow-[0_0_0_3px_rgba(220,38,38,.12)]';
  return `${base} ${hasErr ? error : normal} ${extra}`;
}

const fieldIconWrapClass =
  'pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted';

const fieldLabelClass = 'mb-1.5 block font-body text-[12.5px] font-bold text-ink';

const primaryBtnClass =
  'w-full rounded-full bg-gradient-to-r from-brand-light to-brand-light-hover py-[13px] font-body text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,88,199,.28)] transition-[filter,box-shadow] duration-brand hover:brightness-[1.03] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/50 focus-visible:ring-offset-2';

const linkChipClass =
  'bg-transparent p-0 border-0 font-bold text-brand-light transition-brand duration-brand hover:opacity-75';

const rememberLabelClass = 'flex items-center gap-1.5 text-ink';

export default function LoginModal({
  isOpen, onClose, orderMode = false, initialMode = 'login', onAuthSuccess,
}: LoginModalProps) {
  const { t, lang } = useT();
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const turnstileRef = useRef<TurnstileHandle>(null);
  const turnstileEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useHistoryModal(isOpen, onClose, 'login-modal');

  const [mode, setMode] = useState<Mode>('login');
  const [lEmail, setLEmail] = useState('');
  const [lPass, setLPass] = useState('');
  const [showLPass, setShowLPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [lEmailErr, setLEmailErr] = useState('');
  const [lPassErr, setLPassErr] = useState('');

  const [rName, setRName] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPass, setRPass] = useState('');
  const [rHoneypot, setRHoneypot] = useState('');
  const [showRPass, setShowRPass] = useState(false);
  const [rErr, setRErr] = useState('');
  const [rEmailErr, setREmailErr] = useState('');
  const [rPassErr, setRPassErr] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);
  const oauthCheckedRef = useRef(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailErr, setForgotEmailErr] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSent, setRegisterSent] = useState(false);
  const [registerSentEmail, setRegisterSentEmail] = useState('');

  useEffect(() => {
    if (isOpen) lockBody();
    else unlockBody();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'login');
      setLEmailErr('');
      setLPassErr('');
      setRErr('');
      setREmailErr('');
      setRPassErr(false);
      setForgotEmailErr('');
      setForgotSubmitted(false);
      setForgotEmail('');
      setRHoneypot('');
      setRegisterSent(false);
      setRegisterSentEmail('');
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (oauthCheckedRef.current) return;
    oauthCheckedRef.current = true;
    (async () => {
      const safeUser = await checkOAuthCallback(supabase);
      if (!safeUser) return;
      // 🛡️ আগে গেস্ট-অর্ডার জোড়া লাগানোর কাজ সম্পূর্ণ শেষ করা হচ্ছে,
      // তারপর লগইন-স্টেট সেট করা হচ্ছে — যাতে "আমার অর্ডার" পেজ ডাটা আনার আগেই জোড়া লাগানো শেষ থাকে
      await mergeGuestOrdersToUser(supabase, safeUser.phone || '', safeUser.id || '');
      useAuthStore.getState().setCurrentUser(safeUser);
      await applyWishlistSync(safeUser.id || '');
      showToast(t('Google দিয়ে লগইন সফল হয়েছে'));

      try {
        const redirectPath = sessionStorage.getItem('vc_auth_redirect');
        if (redirectPath && window.location.pathname !== redirectPath) {
          router.push(redirectPath);
        }
      } catch {
        // ignore
      }
    })();
  // NOTE (audit): এই react-hooks/exhaustive-deps warning ইচ্ছা করেই ঠিক করা হয়নি — dependency আন্দাজে যোগ করলে অসীম লুপ বা অপ্রত্যাশিত রি-রান হতে পারে।
  // বদলানোর আগে আচরণ ভালো করে যাচাই করুন (এই hook-এর জন্য আলাদা করে ইচ্ছাকৃত কিনা যাচাই হয়নি)।
  }, [router, supabase, t]);

  useEffect(() => {
    const unsub = useWishlistStore.subscribe((state, prevState) => {
      if (state.wishlist === prevState.wishlist) return;
      const user = useAuthStore.getState().currentUser;
      if (!user?.id) return;
      saveWishlistToSupabase(supabase, user.id, state.wishlist);
    });
    return unsub;
  }, [supabase]);

  async function applyWishlistSync(userId: string) {
    const items = await syncWishlistFromSupabase(supabase, userId);
    if (items) {
      useWishlistStore.getState().setWishlist(items);
    } else {
      const local = useWishlistStore.getState().wishlist;
      if (local.length) saveWishlistToSupabase(supabase, userId, local);
    }
  }

  const switchToRegister = () => { setMode('register'); setRegisterSent(false); setRErr(''); setREmailErr(''); setRPassErr(false); };
  const switchToLogin = () => { setMode('login'); setRegisterSent(false); setLEmailErr(''); setLPassErr(''); };
  const switchToForgot = () => { setMode('forgot'); setForgotSubmitted(false); setForgotEmailErr(''); setForgotEmail(lEmail); };

  const handleForgotSubmit = async () => {
    const em = sanitizeEmailInput(forgotEmail.trim());
    if (!em || !validateEmail(em)) { setForgotEmailErr(t('সঠিক ইমেইল ঠিকানা দিন')); return; }
    if (forgotLoading) return;
    setForgotEmailErr('');
    setForgotLoading(true);
    try {
      const limit = await checkPasswordResetLimitAction(em);
      if (!limit.allowed) {
        setForgotEmailErr(t('আপনি দৈনিক ৩ বার পাসওয়ার্ড রিসেটের লিমিটে পৌঁছে গেছেন। আগামীকাল আবার চেষ্টা করুন।'));
        return;
      }
      await requestPasswordReset(supabase, em);
      setForgotSubmitted(true);
    } catch {
      setForgotEmailErr(t('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন'));
    } finally {
      // 🛡️ আগে নেটওয়ার্ক ত্রুটিতে exception হলে বাটন চিরকাল disabled থেকে যেত
      setForgotLoading(false);
    }
  };

  const finishAuthSuccess = async (safeUser: CurrentUser, successMsg: string) => {
    // 🛡️ আগে গেস্ট-অর্ডার জোড়া লাগানোর কাজ সম্পূর্ণ শেষ করা হচ্ছে,
    // তারপর লগইন-স্টেট সেট করা হচ্ছে — একই কারণে (উপরের OAuth অংশে বলা হয়েছে)
    await mergeGuestOrdersToUser(supabase, safeUser.phone || '', safeUser.id || '');
    useAuthStore.getState().setCurrentUser(safeUser);
    await applyWishlistSync(safeUser.id || '');
    showToast(successMsg);
    onClose();

    if (orderMode && onAuthSuccess) {
      onAuthSuccess(safeUser);
    }

    try {
      const redirectPath = sessionStorage.getItem('vc_auth_redirect');
      if (redirectPath && window.location.pathname !== redirectPath) {
        // মডাল বন্ধ হওয়ার (onClose() উপরে) effect cleanup যেন নিচের
        // router.push()-কে deferred history.back() দিয়ে উল্টে না দেয়।
        suppressHistoryCleanup();
        router.push(redirectPath);
      }
    } catch {
      // ignore
    }
  };

  // ফলাফল আলাদা রাখা হয়েছে — যাতে "টোকেন আসেনি/নেট ধীর", "সার্ভার সমস্যা", "রেট লিমিট" আর
  // "সত্যিই যাচাই ব্যর্থ" একই বার্তায় না মিশে যায়।
  type TurnstileOutcome = 'ok' | 'unavailable' | 'rejected' | 'rate_limited' | 'error';

  const runTurnstileCheck = async (): Promise<TurnstileOutcome> => {
    if (!turnstileEnabled) return 'ok';
    // ⏳ আগে টোকেন না থাকলে সাথে সাথে ব্যর্থ বলা হতো (ধীর মোবাইল নেটে স্ক্রিপ্ট/চ্যালেঞ্জ শেষ হওয়ার আগেই)।
    // এখন সর্বোচ্চ ১০ সেকেন্ড অপেক্ষা করে — বাটনে স্পিনার ঘুরতে থাকে।
    const token = await turnstileRef.current?.waitForToken(10000);
    if (!token) return 'unavailable';
    const result = await verifyTurnstileTokenDetailed(token);
    turnstileRef.current?.reset();
    return result;
  };

  const turnstileMessage = (outcome: Exclude<TurnstileOutcome, 'ok'>): string => {
    switch (outcome) {
      case 'unavailable':
        return t('নিরাপত্তা যাচাই শেষ হয়নি — ইন্টারনেট ধীর হতে পারে। একটু পরে আবার চেষ্টা করুন (চেকবক্স এলে টিক দিন)');
      case 'rate_limited':
        return t('অল্প সময়ে অনেকবার চেষ্টা হয়েছে, কয়েক সেকেন্ড পরে আবার চেষ্টা করুন');
      case 'error':
        return t('যাচাই সার্ভারে সাময়িক সমস্যা হচ্ছে, আবার চেষ্টা করুন');
      default:
        return t('বট-যাচাই ব্যর্থ হয়েছে, আবার চেষ্টা করুন');
    }
  };

  const runLogin = async () => {
    const em = sanitizeEmailInput(lEmail.trim());
    const pw = lPass;
    setLEmailErr('');
    setLPassErr('');

    let blocked = false;
    if (!em) { setLEmailErr(t('ইমেইল দিন')); blocked = true; }
    else if (!validateEmail(em)) { setLEmailErr(t('সঠিক ইমেইল ঠিকানা দিন')); blocked = true; }
    if (!pw) { setLPassErr(t('পাসওয়ার্ড দিন')); blocked = true; }
    if (blocked) return;

    const verified = await runTurnstileCheck();
    if (verified !== 'ok') {
      setLEmailErr(turnstileMessage(verified));
      return;
    }

    const { data, error } = await signInWithPassword(supabase, em, pw);
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('invalid login')) {
        setLEmailErr(t('ইমেইল বা পাসওয়ার্ড ভুল'));
        setLPassErr(t('ইমেইল বা পাসওয়ার্ড ভুল'));
      } else if (msg.includes('not confirmed')) {
        setLEmailErr(t('ইমেইল ভেরিফাই করা হয়নি — ইনবক্সে পাঠানো লিংকে ক্লিক করুন'));
      } else if (msg.includes('email')) {
        setLEmailErr(t('ইমেইল ঠিকানা ভুল'));
      } else {
        setLEmailErr(t('ইমেইল বা পাসওয়ার্ড ভুল'));
        setLPassErr(t('ইমেইল বা পাসওয়ার্ড ভুল'));
      }
      return;
    }
    if (!data.user) {
      setLEmailErr(t('ইমেইল বা পাসওয়ার্ড ভুল'));
      setLPassErr(t('ইমেইল বা পাসওয়ার্ড ভুল'));
      return;
    }

    const safeUser: CurrentUser = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name || 'Customer',
      phone: data.user.user_metadata?.phone || '',
    };
    await finishAuthSuccess(safeUser, t('লগইন সফল হয়েছে'));
  };

  const runRegister = async () => {
    if (rHoneypot) return;

    const nm = sanitizePlainName(rName.trim());
    const ph = sanitizePhoneInput(rPhone.trim());
    const em = sanitizeEmailInput(rEmail.trim());
    const pw = rPass;
    setRErr('');
    setREmailErr('');
    setRPassErr(false);

    if (!validateName(nm)) {
      setRErr(lang === 'en'
        ? `Enter a plain name of 3-${MAX_NAME_LEN} characters (no symbols/emoji)`
        : `৩-${MAX_NAME_LEN} অক্ষরের প্লেন নাম দিন (কোনো চিহ্ন/ইমোজি ছাড়া)`);
      return;
    }
    if (!ph || !validatePhone(ph)) { setRErr(t('সঠিক বাংলাদেশী মোবাইল নম্বর দিন (01XXXXXXXXX)')); return; }
    if (!em || !validateEmail(em)) { setREmailErr(t('সঠিক ইমেইল ঠিকানা দিন')); return; }
    const strength = await checkPasswordStrength(pw);
    if (!strength.minLenOk || !strength.ok) { setRPassErr(true); return; }

    const verified = await runTurnstileCheck();
    if (verified !== 'ok') { setRErr(turnstileMessage(verified)); return; }

    const { data, error } = await signUp(supabase, { name: nm, phone: ph, email: em, password: pw });
    if (error) {
      if (error.message?.includes('already registered')) {
        setREmailErr(t('এই ইমেইল ইতিমধ্যে নিবন্ধিত'));
      } else {
        setRErr(t('অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে'));
      }
      return;
    }
    if (!data.user) { setRErr(t('অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে')); return; }

    if (data.user.identities && data.user.identities.length === 0) {
      setREmailErr(t('এই ইমেইল ইতিমধ্যে নিবন্ধিত, লগইন করুন'));
      return;
    }

    if (!data.session) {
      // ইমেইল ভেরিফিকেশন বাধ্যতামূলক — মডাল বন্ধ না করে "ইমেইল চেক করুন" পর্দা দেখানো হচ্ছে
      setRegisterSentEmail(em);
      setRegisterSent(true);
      return;
    }

    const safeUser: CurrentUser = { id: data.user.id, email: data.user.email, name: nm, phone: ph, createdAt: new Date().toISOString() };
    await finishAuthSuccess(safeUser, t('অ্যাকাউন্ট তৈরি হয়েছে'));
  };

  const doLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    try {
      await runLogin();
    } catch {
      setLEmailErr(t('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন'));
    } finally {
      setLoginLoading(false);
    }
  };

  const doRegister = async () => {
    if (registerLoading) return;
    setRegisterLoading(true);
    try {
      await runRegister();
    } catch {
      setRErr(t('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন'));
    } finally {
      setRegisterLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle(supabase);
      if (error) { showToast(t('Google লগইন ব্যর্থ হয়েছে')); setGoogleLoading(false); }
    } catch {
      showToast(t('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন'));
      setGoogleLoading(false);
    }
  };

  const showLoginTitle = t('স্বাগতম!');
  const showLoginSub = t('আপনার একাউন্টে প্রবেশ করুন।');
  const title = mode === 'login'
    ? showLoginTitle
    : mode === 'register'
    ? (registerSent ? t('ইমেইল চেক করুন') : t('অ্যাকাউন্ট তৈরি করুন'))
    : forgotSubmitted
    ? t('ইমেইল চেক করুন')
    : t('পাসওয়ার্ড রিসেট করুন');
  const sub = mode === 'login'
    ? showLoginSub
    : mode === 'register'
    ? (registerSent ? t('ভেরিফিকেশন লিংক পাঠানো হয়েছে') : t('মাত্র কয়েক সেকেন্ডে নতুন অ্যাকাউন্ট খুলুন'))
    : forgotSubmitted
    ? t('রিসেট লিংক পাঠানো হয়েছে')
    : t('আপনার ইমেইল দিন, আমরা লিংক পাঠাব');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 bg-ink/55 backdrop-blur-[3px]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="no-scrollbar relative z-10 max-h-[92vh] w-full max-w-[400px] overflow-y-auto overflow-x-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white shadow-sh3 ring-1 ring-white/80"
          >
            <div className={`relative overflow-hidden px-7 pt-8 text-center ${(mode === 'forgot' && forgotSubmitted) || (mode === 'register' && registerSent) ? 'pb-3' : 'pb-5'}`}>
              <HeaderDecor />
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                onClick={onClose}
                title={t('বন্ধ করুন')}
                className="absolute right-3.5 top-3.5 z-[1] flex h-[32px] w-[32px] items-center justify-center rounded-full border border-white/60 bg-white/80 text-ink/60 shadow-sh1 backdrop-blur-[8px] transition-colors hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/50"
              >
                <IconClose />
              </motion.button>
              <h2 className="relative z-[1] font-body text-[21px] font-extrabold text-ink">{title}</h2>
              <p className="relative z-[1] mt-1.5 font-body text-[13px] text-muted">{sub}</p>
            </div>

            <div className="px-7 pb-8 pt-2">
              <TurnstileWidget ref={turnstileRef} active={isOpen} />
              {mode === 'register' && registerSent ? (
                <CheckInboxScreen
                  email={registerSentEmail}
                  message={lang === 'en'
                    ? <>Vangcur (mail@vangcur.com) has sent a verification link to <strong>{registerSentEmail}</strong>. Click the link to activate your account.</>
                    : <>Vangcur (mail@vangcur.com) থেকে আপনার <strong>{registerSentEmail}</strong> ইমেইলে একটি ভেরিফিকেশন লিংক পাঠানো হয়েছে। লিংকে ক্লিক করে আপনার অ্যাকাউন্ট চালু করুন।</>}
                  openLabel={t('Gmail খুলুন')}
                  openOtherLabel={t('ইমেইল অ্যাপ খুলুন')}
                  spamHint={t('মেইল না পেলে স্প্যাম বা প্রমোশনস ফোল্ডার দেখুন')}
                />
              ) : mode === 'login' ? (
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className={fieldLabelClass}>{t('ইমেইল')}</label>
                    <div className="relative">
                      <span className={fieldIconWrapClass}><IconMail /></span>
                      <input
                        type="email" placeholder="name@example.com" autoComplete="email" maxLength={MAX_EMAIL_LEN}
                        value={lEmail} onChange={(e) => { setLEmail(sanitizeEmailInput(e.target.value)); if (lEmailErr) setLEmailErr(''); }}
                        className={fieldClass(!!lEmailErr)}
                      />
                    </div>
                    <FieldError text={lEmailErr} />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{t('পাসওয়ার্ড')}</label>
                    <div className="relative">
                      <span className={fieldIconWrapClass}><IconLock /></span>
                      <input
                        type={showLPass ? 'text' : 'password'} placeholder={t('আপনার পাসওয়ার্ড দিন')}
                        autoComplete="current-password" value={lPass} maxLength={MAX_PASS_LEN}
                        onChange={(e) => { setLPass(e.target.value); if (lPassErr) setLPassErr(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }}
                        className={`${fieldClass(!!lPassErr)} pr-11`}
                      />
                      <button
                        type="button" title={showLPass ? t('পাসওয়ার্ড লুকান') : t('পাসওয়ার্ড দেখুন')} onClick={() => setShowLPass((v) => !v)}
                        className={`absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center p-1 text-muted transition-brand ${showLPass ? 'text-brand-light' : ''}`}
                      >
                        <IconEye off={showLPass} />
                      </button>
                    </div>
                    <FieldError text={lPassErr} />
                  </div>
                  <div className="flex items-center justify-between font-body text-[12.5px]">
                    <label className={rememberLabelClass}>
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 cursor-pointer rounded border-[1.5px] border-border-base accent-brand-light transition-brand duration-brand hover:border-brand-light/50" />
                      {t('মনে রাখুন')}
                    </label>
                    <button onClick={switchToForgot} className={linkChipClass}>{t('পাসওয়ার্ড ভুলে গেছেন?')}</button>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className={primaryBtnClass}
                    onClick={doLogin}
                    disabled={loginLoading}
                  >
                    {loginLoading
                      ? <span className="inline-flex items-center justify-center gap-2"><IconSpinner />{t('লগইন হচ্ছে…')}</span>
                      : t('লগইন করুন')}
                  </motion.button>

                  {!orderMode && (
                    <>
                      <div className="relative my-1 text-center font-body text-[12px] text-muted before:absolute before:left-0 before:top-1/2 before:h-px before:w-[42%] before:bg-border-base after:absolute after:right-0 after:top-1/2 after:h-px after:w-[42%] after:bg-border-base">{t('অথবা')}</div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className="flex w-full items-center justify-center gap-2.5 rounded-full border-[1.5px] border-brand-bg bg-brand-bg/70 py-3 font-body text-[13.5px] font-bold text-ink backdrop-blur-sm transition-colors hover:border-brand-light/25 hover:bg-brand-bg disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/40"
                        onClick={loginWithGoogle} disabled={googleLoading}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {t('Google দিয়ে লগইন করুন')}
                      </motion.button>
                    </>
                  )}
                  <div className="mt-1 text-center font-body text-[13px] text-muted">
                    {t('অ্যাকাউন্ট নেই?')} <button onClick={switchToRegister} className={linkChipClass}>{t('রেজিস্ট্রেশন করুন')}</button>
                  </div>
                </div>
              ) : mode === 'register' ? (
                <div className="flex flex-col gap-3.5">
                  <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
                    <label htmlFor="b_auth_extra_field">Security Extra</label>
                    <input
                      id="b_auth_extra_field"
                      name="b_auth_extra_field"
                      type="text"
                      tabIndex={-1}
                      autoComplete="new-password"
                      value={rHoneypot}
                      onChange={(e) => setRHoneypot(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{t('পূর্ণ নাম')}</label>
                    <div className="relative">
                      <span className={fieldIconWrapClass}><IconUser /></span>
                      <input placeholder={t('আপনার পূর্ণ নাম লিখুন')} maxLength={MAX_NAME_LEN} value={rName} onChange={(e) => setRName(sanitizePlainName(e.target.value))} className={fieldClass(false)} />
                    </div>
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{t('মোবাইল নম্বর')}</label>
                    <div className="relative">
                      <span className={fieldIconWrapClass}><IconPhone /></span>
                      <input
                        type="tel" placeholder="01XXXXXXXXX" maxLength={PHONE_INPUT_MAX_CHARS} inputMode="numeric"
                        value={rPhone} onChange={(e) => setRPhone(sanitizePhoneInput(e.target.value))}
                        className={fieldClass(false)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{t('ইমেইল')}</label>
                    <div className="relative">
                      <span className={fieldIconWrapClass}><IconMail /></span>
                      <input
                        type="email" placeholder="name@example.com" value={rEmail} maxLength={MAX_EMAIL_LEN}
                        onChange={(e) => { setREmail(sanitizeEmailInput(e.target.value)); if (rEmailErr) setREmailErr(''); }}
                        className={fieldClass(!!rEmailErr)}
                      />
                    </div>
                    <FieldError text={rEmailErr} />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>{t('পাসওয়ার্ড')}</label>
                    <div className="relative">
                      <span className={fieldIconWrapClass}><IconLock /></span>
                      <input
                        type={showRPass ? 'text' : 'password'} placeholder={t('কমপক্ষে ৮ অক্ষর, শক্তিশালী পাসওয়ার্ড')}
                        value={rPass} maxLength={MAX_PASS_LEN}
                        onChange={(e) => { setRPass(e.target.value); if (rPassErr) setRPassErr(false); }}
                        className={`${fieldClass(rPassErr)} pr-11`}
                      />
                      <button
                        type="button" title={showRPass ? t('পাসওয়ার্ড লুকান') : t('পাসওয়ার্ড দেখুন')} onClick={() => setShowRPass((v) => !v)}
                        className={`absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center p-1 text-muted transition-brand ${showRPass ? 'text-brand-light' : ''}`}
                      >
                        <IconEye off={showRPass} />
                      </button>
                    </div>
                    <PasswordStrengthMeter password={rPass} />
                  </div>
                  {rErr && <ErrMsg text={rErr} />}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className={`${primaryBtnClass} mt-1`}
                    onClick={doRegister}
                    disabled={registerLoading}
                  >
                    {registerLoading
                      ? <span className="inline-flex items-center justify-center gap-2"><IconSpinner />{t('অ্যাকাউন্ট তৈরি হচ্ছে…')}</span>
                      : t('অ্যাকাউন্ট তৈরি করুন')}
                  </motion.button>

                  <div className="mt-1 text-center font-body text-[13px] text-muted">
                    {t('ইতিমধ্যে অ্যাকাউন্ট আছে?')} <button onClick={switchToLogin} className={linkChipClass}>{t('লগইন করুন')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {forgotSubmitted ? (
                    <CheckInboxScreen
                      email={forgotEmail}
                      message={lang === 'en'
                        ? <>Vangcur (mail@vangcur.com) has sent a password reset link to <strong>{forgotEmail.trim()}</strong>. Please check your email.</>
                        : <>Vangcur (mail@vangcur.com) থেকে আপনার <strong>{forgotEmail.trim()}</strong> ইমেইলে একটি পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। অনুগ্রহ করে ইমেইল চেক করুন।</>}
                      openLabel={t('Gmail খুলুন')}
                      openOtherLabel={t('ইমেইল অ্যাপ খুলুন')}
                      spamHint={t('মেইল না পেলে স্প্যাম বা প্রমোশনস ফোল্ডার দেখুন')}
                      backLabel={t('লগইনে ফিরে যান')}
                      onBack={switchToLogin}
                    />
                  ) : (
                    <>
                      <div>
                        <label className={fieldLabelClass}>{t('ইমেইল')}</label>
                        <div className="relative">
                          <span className={fieldIconWrapClass}><IconMail /></span>
                          <input
                            type="email" placeholder="name@example.com" autoComplete="email" maxLength={MAX_EMAIL_LEN}
                            value={forgotEmail} onChange={(e) => { setForgotEmail(sanitizeEmailInput(e.target.value)); if (forgotEmailErr) setForgotEmailErr(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleForgotSubmit(); }}
                            className={fieldClass(!!forgotEmailErr)}
                          />
                        </div>
                        <FieldError text={forgotEmailErr} />
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        className={primaryBtnClass}
                        onClick={handleForgotSubmit}
                        disabled={forgotLoading}
                      >
                        {forgotLoading
                          ? <span className="inline-flex items-center justify-center gap-2"><IconSpinner />{t('পাঠানো হচ্ছে…')}</span>
                          : t('রিসেট লিংক পাঠান')}
                      </motion.button>
                      <div className="mt-1 text-center font-body text-[13px] text-muted">
                        {t('মনে পড়েছে?')} <button onClick={switchToLogin} className={linkChipClass}>{t('লগইন করুন')}</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
