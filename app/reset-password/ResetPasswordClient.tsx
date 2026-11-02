'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { showToast } from '@/lib/toast';
import { updatePassword } from '@/lib/authData';
import { useAuthStore } from '@/lib/store/authStore';
import { checkPasswordStrength } from '@/lib/passwordStrength';
import PasswordStrengthMeter from '@/app/components/auth/PasswordStrengthMeter';
import { useT } from '@/lib/i18n/useT';
import { DesktopBackdrop } from '@/app/components/ui/DesktopBackdrop';

type Status = 'checking' | 'ready' | 'invalid' | 'done';

const MAX_PASS_LEN = 30;

const lineIcon = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function IconLock() {
  return (
    <svg {...lineIcon} width="16" height="16" strokeWidth={1.7}>
      <rect x="5" y="10.5" width="14" height="9" rx="2" />
      <path d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" />
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
function IconCheck() {
  return (
    <svg {...lineIcon} width="26" height="26" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.3l2.4 2.4 4.8-5.4" />
    </svg>
  );
}

function HeaderDecor() {
  const deco = { ...lineIcon, strokeWidth: 1.4 };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]">
      <svg {...deco} width="34" height="34" className="absolute -left-1 top-3 -rotate-12" viewBox="0 0 24 24">
        <rect x="5" y="10.5" width="14" height="9" rx="2" />
        <path d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" />
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

function FieldError({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="mt-1 pl-1 font-body text-[11.5px] font-semibold text-[#DC2626]">{text}</p>;
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

const fieldIconWrapClass = 'pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted';
const fieldLabelClass = 'mb-1.5 block font-body text-[12.5px] font-bold text-ink';
const primaryBtnClass =
  'w-full rounded-full bg-gradient-to-r from-brand-light to-brand-light-hover py-[13px] font-body text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,88,199,.28)] transition-brand duration-brand hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,88,199,.38)] active:translate-y-0 active:shadow-[0_2px_10px_rgba(0,88,199,.28)] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/50 focus-visible:ring-offset-2';

export default function ResetPasswordClient() {
  const { t } = useT();
  const supabase = useRef(createClient()).current;
  const [status, setStatus] = useState<Status>('checking');
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passErr, setPassErr] = useState(false);
  const [confirmErr, setConfirmErr] = useState('');
  const [genErr, setGenErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 300));
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setStatus(data?.session ? 'ready' : 'invalid');
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleSubmit = async () => {
    setPassErr(false);
    setConfirmErr('');
    setGenErr('');

    const strength = await checkPasswordStrength(pass);
    if (!strength.minLenOk || !strength.ok) {
      setPassErr(true);
      return;
    }
    if (pass !== confirmPass) {
      setConfirmErr(t('দুটো পাসওয়ার্ড মিলছে না'));
      showToast(t('উভয় পাসওয়ার্ড একই হতে হবে'), 'error');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(supabase, pass);
    if (error) {
      setLoading(false);
      setGenErr(t('পাসওয়ার্ড পরিবর্তন করা যায়নি, লিংকের মেয়াদ শেষ হয়ে থাকতে পারে'));
      showToast(t('পাসওয়ার্ড পরিবর্তন করা যায়নি, লিংকের মেয়াদ শেষ হয়ে থাকতে পারে'), 'error');
      return;
    }

    await supabase.auth.signOut();
    useAuthStore.getState().setCurrentUser(null);
    setLoading(false);
    setStatus('done');
    showToast(t('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে'), 'success');
    setTimeout(() => router.push('/'), 1500);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white p-4 lg:bg-none">
      {/* 💻 শুধু ল্যাপটপ: ফিক্সড প্রিমিয়াম ব্যাকগ্রাউন্ড */}
      <DesktopBackdrop />
      <div className="relative z-10 w-full max-w-[400px] overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white shadow-sh3 lg:shadow-[0_0_0_6px_#fff,0_0_0_7px_rgba(68,167,252,0.16),0_30px_70px_-24px_rgba(0,88,199,0.32)] dark:lg:shadow-[0_0_0_6px_rgba(255,255,255,0.07),0_0_0_7px_rgba(68,167,252,0.14),0_30px_70px_-24px_rgba(0,0,0,0.6)] lg:ring-0">
        <div className={`relative overflow-hidden px-7 text-center ${status === 'done' ? 'pb-2 pt-6' : 'pb-5 pt-8'}`}>
          <HeaderDecor />
          {status !== 'done' && (
            <h2 className="relative z-[1] font-body text-[21px] font-extrabold text-ink">{t('নতুন পাসওয়ার্ড সেট করুন')}</h2>
          )}
          {status === 'ready' && (
            <p className="relative z-[1] mt-1.5 font-body text-[13px] text-muted">
              {t('আপনার অ্যাকাউন্টের জন্য একটি নতুন, শক্তিশালী পাসওয়ার্ড দিন')}
            </p>
          )}
        </div>

        <div className="px-7 pb-8 pt-2">
          {status === 'checking' && (
            <p className="py-4 text-center font-body text-[13.5px] text-muted">{t('লিংক যাচাই করা হচ্ছে...')}</p>
          )}

          {status === 'invalid' && (
            <div className="py-2 text-center">
              <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
                <IconAlert />
              </div>
              <p className="mb-4 font-body text-[13.5px] leading-relaxed text-ink">
                {t('এই লিংকের মেয়াদ শেষ হয়ে গেছে বা এটি অবৈধ। আবার পাসওয়ার্ড রিসেট রিকোয়েস্ট করুন।')}
              </p>
              <button onClick={() => router.push('/')} className={primaryBtnClass}>{t('হোমপেজে ফিরে যান')}</button>
            </div>
          )}

          {status === 'ready' && (
            <div className="flex flex-col gap-3.5">
              <div>
                <label className={fieldLabelClass}>{t('নতুন পাসওয়ার্ড')}</label>
                <div className="relative">
                  <span className={fieldIconWrapClass}><IconLock /></span>
                  <input
                    type={showPass ? 'text' : 'password'} value={pass} maxLength={MAX_PASS_LEN}
                    onChange={(e) => { setPass(e.target.value); if (passErr) setPassErr(false); }}
                    placeholder={t('কমপক্ষে ৮ অক্ষর, শক্তিশালী পাসওয়ার্ড')}
                    className={`${fieldClass(passErr)} pr-11`}
                  />
                  <button
                    type="button" title={showPass ? t('পাসওয়ার্ড লুকান') : t('পাসওয়ার্ড দেখুন')} onClick={() => setShowPass((v) => !v)}
                    className={`absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center p-1 text-muted transition-brand ${showPass ? 'text-brand-light' : ''}`}
                  >
                    <IconEye off={showPass} />
                  </button>
                </div>
                <PasswordStrengthMeter password={pass} />
              </div>
              <div>
                <label className={fieldLabelClass}>{t('পাসওয়ার্ড আবার লিখুন')}</label>
                <div className="relative">
                  <span className={fieldIconWrapClass}><IconLock /></span>
                  <input
                    type={showConfirmPass ? 'text' : 'password'} value={confirmPass} maxLength={MAX_PASS_LEN}
                    onChange={(e) => { setConfirmPass(e.target.value); if (confirmErr) setConfirmErr(''); }}
                    placeholder={t('পাসওয়ার্ড আবার লিখুন')}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    className={`${fieldClass(!!confirmErr)} pr-11`}
                  />
                  <button
                    type="button" title={showConfirmPass ? t('পাসওয়ার্ড লুকান') : t('পাসওয়ার্ড দেখুন')} onClick={() => setShowConfirmPass((v) => !v)}
                    className={`absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center p-1 text-muted transition-brand ${showConfirmPass ? 'text-brand-light' : ''}`}
                  >
                    <IconEye off={showConfirmPass} />
                  </button>
                </div>
                <FieldError text={confirmErr} />
              </div>
              {genErr && (
                <div className="flex items-center gap-2 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2.5 font-body text-[12.5px] font-semibold text-[#B91C1C]">
                  <IconAlert />
                  <span>{genErr}</span>
                </div>
              )}
              <button onClick={handleSubmit} disabled={loading} className={`${primaryBtnClass} mt-1`}>
                {t('পাসওয়ার্ড সেভ করুন')}
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-light/10 text-brand-light">
                <IconCheck />
              </div>
              <p className="font-body text-[14px] font-bold leading-relaxed text-ink">
                {t('পাসওয়ার্ড পরিবর্তন হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করতে হোমপেজে নিয়ে যাওয়া হচ্ছে...')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
        }
