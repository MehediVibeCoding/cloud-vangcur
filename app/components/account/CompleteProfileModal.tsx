'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';
import { useT } from '@/lib/i18n/useT';
import { showToast } from '@/lib/toast';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { PROFILE_UPDATED_EVENT } from '@/lib/uiEvents';
import useHistoryModal from '@/lib/useHistoryModal';
import {
  fetchMyProfile, updateMyProfile, isProfileComplete, type MyProfileData,
} from '@/lib/profileData';
import { DISTRICTS, getDistrictLabel } from '@/lib/checkoutData';
import {
  MAX_NAME_LEN, MAX_ADDR_LEN,
  sanitizePlainName, sanitizePhoneInput, sanitizeAddressInput, PHONE_INPUT_MAX_CHARS,
} from '@/lib/security';

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function ShieldCheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function LockIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function CompleteProfileModal({ isOpen, onClose, onSaved }: CompleteProfileModalProps) {
  const { t, lang } = useT();
  const supabase = useRef(createClient()).current;
  const currentUser = useAuthStore((s) => s.currentUser);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<MyProfileData | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [error, setError] = useState('');

  useHistoryModal(isOpen, onClose, 'complete-profile-modal');

  useEffect(() => {
    if (isOpen) lockBody();
    else unlockBody();
    return () => unlockBody();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;
    setLoading(true);
    fetchMyProfile(supabase, currentUser.id).then((p) => {
      if (p) {
        setProfile(p);
        setName(p.name);
        setPhone(p.phone);
        setAddress(p.address);
        setDistrict(p.district);
      }
      setLoading(false);
    });
  }, [isOpen, currentUser?.id, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setError('');
    setSaving(true);

    const res = await updateMyProfile(supabase, currentUser.id, { name, phone, address, district });

    setSaving(false);
    if (!res.ok) {
      setError(res.error || t('প্রোফাইল সংরক্ষণ করা যায়নি'));
      return;
    }

    showToast(t('✅ আপনার প্রোফাইল সম্পূর্ণ হয়েছে!'));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
    onSaved?.();
    onClose();
  };

  const complete = isProfileComplete({ phone, address, district });

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[1150] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[440px] flex-col rounded-[22px] bg-white p-6 shadow-sh3"
          >
            <div className="mb-4 flex shrink-0 items-center justify-between border-b border-border-base pb-3">
              <h3 className="flex items-center gap-2 font-body text-base font-bold text-ink">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-light text-white">
                  <ShieldCheckIcon />
                </span>
                {t('আপনার প্রোফাইল সম্পূর্ণ করুন')}
              </h3>
              <motion.button
                onClick={onClose}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-ink"
              >
                ✕
              </motion.button>
            </div>

            {loading ? (
              <div className="py-8 text-center font-body text-xs text-muted">{t('লোড হচ্ছে...')}</div>
            ) : (
              <form onSubmit={handleSubmit} className="sleek-scrollbar -mr-2 flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain pr-2">
                {/* 🛠️ ফিক্স: আগে এই বক্সটা সবসময় দেখাত, প্রোফাইল আগে থেকে
                    সম্পূর্ণ থাকলেও — যেটা ইতিমধ্যে ভেরিফায়েড ইউজারের কাছে
                    অপ্রাসঙ্গিক (সে তো সুবিধাটা আগেই পেয়ে গেছে)। এখন নিচের
                    "✓ সম্পূর্ণ" মেসেজের মতোই complete স্টেট চেক করে শুধু
                    অসম্পূর্ণ থাকলেই দেখাবে। */}
                {!complete && (
                  <div className="-mt-1 mb-1 rounded-lg bg-emerald-50 p-2.5 font-body text-[12px] leading-relaxed text-emerald-700">
                    <p className="font-bold">
                      ✨ {t('প্রোফাইল সম্পূর্ণ করলে যা পাবেন')}
                    </p>
                    <p className="mt-1">
                      {t('একটি সবুজ ভেরিফাইড ব্যাজ, যা আপনার প্রশ্ন ও রিভিউয়ের পাশে সবাই দেখতে পাবে — আর পরের যেকোনো অর্ডারে আপনার তথ্য নিজে থেকেই পূরণ হয়ে যাবে, তাই বারবার টাইপ করতে হবে না।')}
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-1 block font-body text-xs font-bold text-ink">{t('আপনার নাম')}</label>
                  <input
                    type="text"
                    required
                    maxLength={MAX_NAME_LEN}
                    value={name}
                    onChange={(e) => setName(sanitizePlainName(e.target.value))}
                    placeholder={t('আপনার পূর্ণ নাম লিখুন')}
                    className="w-full rounded-xl border border-border-base bg-white px-3.5 py-2.5 font-body text-[13.5px] text-ink outline-none transition-brand focus:border-brand-light"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-body text-xs font-bold text-ink">{t('মোবাইল নম্বর')}</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={PHONE_INPUT_MAX_CHARS}
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                    placeholder="01XXXXXXXXX"
                    className="w-full rounded-xl border border-border-base bg-white px-3.5 py-2.5 font-body text-[13.5px] text-ink outline-none transition-brand focus:border-brand-light"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-body text-xs font-bold text-ink">{t('জেলা')}</label>
                  <div className="relative">
                    <select
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border-base bg-white px-3.5 py-2.5 pr-9 font-body text-[13.5px] text-ink outline-none transition-brand focus:border-brand-light"
                    >
                      <option value="">{t('জেলা সিলেক্ট করুন')}</option>
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>{getDistrictLabel(d, lang)}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="font-body text-xs font-bold text-ink">{t('ডেলিভারি ঠিকানা')}</label>
                    <span className="font-body text-[11px] text-muted">{address.length}/{MAX_ADDR_LEN}</span>
                  </div>
                  <textarea
                    required
                    rows={3}
                    maxLength={MAX_ADDR_LEN}
                    value={address}
                    onChange={(e) => setAddress(sanitizeAddressInput(e.target.value))}
                    placeholder={t('বাসা/হোল্ডিং নম্বর, রোড, এলাকা, থানা')}
                    className="w-full rounded-xl border border-border-base bg-white p-3 font-body text-[13.5px] text-ink outline-none transition-brand focus:border-brand-light"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1.5 font-body text-xs font-bold text-muted">
                    <LockIcon /> {t('ইমেইল')}
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-border-base bg-surface-muted px-3.5 py-2.5 font-body text-[13.5px] text-muted outline-none"
                  />
                  <p className="mt-1 font-body text-[10.5px] text-muted">
                    {t('আপনার লগইন অ্যাকাউন্টের সাথে যুক্ত, পরিবর্তন করা যাবে না')}
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-2.5 font-body text-xs font-semibold text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="mt-1 w-full rounded-full bg-brand-light py-3 font-body text-sm font-bold text-white shadow-sh1 transition-brand hover:bg-brand-light-hover disabled:opacity-50"
                >
                  {saving ? t('সংরক্ষণ হচ্ছে...') : t('সংরক্ষণ করুন')}
                </button>

                {complete && (
                  <p className="text-center font-body text-[12px] font-semibold text-emerald-600">
                    {t('✓ আপনার প্রোফাইল সম্পূর্ণ — ভেরিফিকেশন ব্যাজ পেয়েছেন')}
                  </p>
                )}
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
