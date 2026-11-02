'use client';

import { motion, AnimatePresence } from 'motion/react';
import useHistoryModal from '@/lib/useHistoryModal';
import { useT } from '@/lib/i18n/useT';

interface PreConfirmLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onGoogle?: () => void;
  googleLoading?: boolean;
  onSkip: () => void;
}

const lineIcon = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function HeaderDecor() {
  const deco = { ...lineIcon, strokeWidth: 1.4 };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]" aria-hidden="true">
      <svg {...deco} width="34" height="34" className="absolute -left-1 top-2 -rotate-12" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <svg {...deco} width="26" height="26" className="absolute right-14 top-3 rotate-6" viewBox="0 0 24 24">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
    </div>
  );
}

function SecurityShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8.25" x2="12" y2="12.75" />
      <circle cx="12" cy="15.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CheckPerkIcon() {
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-light text-white shadow-2xs">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

export default function PreConfirmLoginModal({
  isOpen, onClose, onLogin, onGoogle, googleLoading = false, onSkip,
}: PreConfirmLoginModalProps) {
  const { lang } = useT();

  useHistoryModal(isOpen, onClose, 'pre-confirm-login-modal');

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
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="sleek-scrollbar relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[430px] flex-col overflow-y-auto overflow-x-hidden rounded-[24px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white px-6 pb-6 pt-7 sm:px-8 sm:pb-7 sm:pt-8 [@media(max-height:760px)]:pb-5 [@media(max-height:760px)]:pt-5 text-center shadow-sh3 ring-1 ring-white/80"
          >
            <HeaderDecor />

            <div className="relative z-10 mx-auto mb-3.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-white ring-4 ring-white/80 [@media(max-height:760px)]:mb-2.5">
              <SecurityShieldIcon />
            </div>

            <div className="relative z-10 mx-auto mb-3 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50/90 px-3 py-1 font-body text-[11px] font-bold text-amber-900 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>{lang === 'en' ? 'Currently Not Logged In' : 'আপনি এই মুহূর্তে আনলগইন অবস্থায় আছেন'}</span>
            </div>

            <h3 className="relative z-10 shrink-0 font-body text-[18px] font-extrabold text-ink leading-snug">
              {lang === 'en' ? 'Log in to secure your order and information' : 'আপনার তথ্য ও অর্ডার সুরক্ষার জন্য লগইন করুন'}
            </h3>

            <p className="relative z-10 mt-2 shrink-0 font-body text-[13px] leading-relaxed text-muted">
              {lang === 'en'
                ? 'Logging in or creating an account unlocks these convenient benefits:'
                : 'লগইন বা সাইন-আপ করলে কেনাকাটায় আপনার জন্য যা যা সহজ হবে:'}
            </p>

            <div className="relative z-10 my-4 shrink-0 rounded-[14px] [@media(max-height:760px)]:my-3 border border-white/90 bg-white/85 p-4 text-left shadow-xs backdrop-blur-md space-y-3.5">
              <div className="flex items-start gap-2.5">
                <CheckPerkIcon />
                <div className="min-w-0 flex-1 font-body text-[13px] leading-snug text-ink/85">
                  <strong>{lang === 'en' ? 'Live Order Tracking & Invoices:' : 'লাইভ অর্ডার ট্র্যাকিং ও মেমো:'}</strong>{' '}
                  {lang === 'en' ? 'Track order status live from any device & save invoice history.' : 'যেকোনো ডিভাইস থেকে অর্ডার ট্র্যাক ও আজীবন মেমো সংরক্ষণ।'}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckPerkIcon />
                <div className="min-w-0 flex-1 font-body text-[13px] leading-snug text-ink/85">
                  <strong>{lang === 'en' ? 'Coupons & Free Delivery Deals:' : 'কুপন ডিসকাউন্ট ও ফ্রি ডেলিভারি:'}</strong>{' '}
                  {lang === 'en' ? 'Get special coupon discounts and free delivery deals on future orders.' : 'ভবিষ্যতে কেনাকাটায় বিশেষ কুপন ছাড় ও ফ্রি ডেলিভারি সুবিধা।'}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckPerkIcon />
                <div className="min-w-0 flex-1 font-body text-[13px] leading-snug text-ink/85">
                  <strong>{lang === 'en' ? 'Language Toggle & Priority Support:' : 'ভাষা পরিবর্তন ও দ্রুত সাপোর্ট:'}</strong>{' '}
                  {lang === 'en' ? 'Switch between Bangla & English easily with priority customer care.' : 'বাংলা/English মোড পরিবর্তন ও দ্রুত কাস্টমার কেয়ার সহায়তা।'}
                </div>
              </div>
            </div>

            <div className="relative z-10 flex shrink-0 flex-col gap-2.5 pt-0.5">
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                onClick={onLogin}
                className="shimmer-sheen w-full rounded-full bg-gradient-to-r from-info to-brand-light py-[13px] font-body text-[14px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03]"
              >
                {lang === 'en' ? 'Login / Sign Up' : 'লগইন / সাইন আপ করুন'}
              </motion.button>

              {onGoogle && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  onClick={onGoogle}
                  disabled={googleLoading}
                  className="flex w-full items-center justify-center gap-2.5 rounded-full border border-brand-light/40 bg-white/90 py-[12.5px] font-body text-[13.5px] font-bold text-ink shadow-2xs transition-colors duration-brand hover:border-brand-light hover:bg-white disabled:cursor-wait disabled:opacity-70"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {googleLoading
                    ? (lang === 'en' ? 'Redirecting to Google...' : 'Google-এ নেওয়া হচ্ছে...')
                    : (lang === 'en' ? 'Sign Up with Google' : 'Google দিয়ে সাইন আপ করুন')}
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onSkip}
                className="w-full rounded-full border border-border-base bg-white/80 py-[11.5px] font-body text-[13px] font-bold text-ink/80 shadow-2xs transition-colors hover:bg-white hover:text-ink"
              >
                {lang === 'en' ? 'Skip & Place Order Directly →' : 'পরে করব, সরাসরি অর্ডার সম্পন্ন করুন →'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
