'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MEMBERSHIP_TIERS,
  getTier,
  crownSVG,
  SILVER_SPIN_SLICES,
  GOLD_SPIN_SLICES,
  spinTierWheel,
  claimLegendaryReward,
  getLegendaryVoucherStatus,
  getMyTierRewards,
  reactivateTierReward,
  buildTierSpinUIState,
  patchTierRewardState,
  markTierRewardExpiredLocally,
  type SpinSlice,
  type LegendaryVoucherStatus,
  type MyTierRewards,
  type TierSpinUIState,
  type ActiveTierReward,
} from '@/lib/membershipData';
import { createClient } from '@/lib/supabase/client';
import { getTierCouponCodeAction } from '@/app/actions/coupon';
import { sanitizeSvgHtml } from '@/lib/sanitize';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { OPEN_MEMBERSHIP_EVENT } from '@/lib/uiEvents';
import { showToast } from '@/lib/toast';
import { useT } from '@/lib/i18n/useT';
import useHistoryModal from '@/lib/useHistoryModal';

interface MembershipModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  completedCount?: number;
}

const lineIcon = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function CrownBadgeIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

function HeaderDecor() {
  const deco = { ...lineIcon, strokeWidth: 1.4 };
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-brand-light/[0.14]" aria-hidden="true">
      <svg {...deco} width="34" height="34" className="absolute -left-1 top-2 -rotate-12" viewBox="0 0 24 24">
        <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
      </svg>
      <svg {...deco} width="26" height="26" className="absolute right-14 top-3 rotate-6" viewBox="0 0 24 24">
        <rect x="7" y="2.5" width="10" height="15" rx="3" />
        <path d="M10 5.5h4" />
        <circle cx="12" cy="20" r="1.6" />
      </svg>
    </div>
  );
}

function IconCopy() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

function TierEndedMessage({ lang, variant }: { lang: 'bn' | 'en'; variant: 'missed' | 'used' | 'disabled' }) {
  const copy: Record<typeof variant, { bn: string; en: string }> = {
    missed: { bn: 'এই লেভেলের সুযোগ শেষ হয়ে গেছে', en: "This tier's spin opportunity has ended" },
    used: { bn: 'এই পুরস্কারটি আপনি ইতিমধ্যে ব্যবহার করে ফেলেছেন', en: 'You have already used this reward' },
    disabled: { bn: 'এই মুহূর্তে এই সুবিধাটি ব্যবহারযোগ্য নয়', en: 'This reward is currently unavailable' },
  };
  return (
    <div className="rounded-[16px] border border-border-base bg-white/70 p-5 text-center shadow-xs">
      <div className="font-body text-[13px] font-bold text-muted">
        {lang === 'en' ? copy[variant].en : copy[variant].bn}
      </div>
    </div>
  );
}

function TierExpiredCard({
  lang,
  reward,
  isReactivating,
  onReactivate,
  accentFrom,
  accentTo,
}: {
  lang: 'bn' | 'en';
  reward: ActiveTierReward;
  isReactivating: boolean;
  onReactivate: () => void;
  accentFrom: string;
  accentTo: string;
}) {
  return (
    <div className="rounded-[16px] border border-amber-300/80 bg-amber-50/90 p-4 text-center shadow-xs animate-section-reveal">
      <div className="font-body text-[14px] font-extrabold text-amber-900">
        {lang === 'en' ? `Your ${reward.slice.labelEn} reward expired` : `আপনার ${reward.slice.label} পুরস্কারের মেয়াদ শেষ হয়ে গেছে`}
      </div>
      <p className="mt-1 font-body text-[12.5px] text-amber-800">
        {lang === 'en'
          ? 'Reactivate to get another 24 hours to use the same reward'
          : 'আবার চালু করলে একই পুরস্কার ব্যবহারের জন্য আরও ২৪ ঘণ্টা পাবেন'}
      </p>
      <motion.button
        whileTap={{ scale: 0.96 }}
        disabled={isReactivating}
        onClick={onReactivate}
        className={`mt-3.5 rounded-full bg-gradient-to-r ${accentFrom} ${accentTo} px-5 py-2 font-body text-xs font-extrabold text-white shadow-sh2 disabled:opacity-60`}
      >
        {isReactivating
          ? (lang === 'en' ? 'Reactivating…' : 'চালু হচ্ছে…')
          : (lang === 'en' ? 'Reactivate reward' : 'আবার চালু করুন')}
      </motion.button>
    </div>
  );
}

function formatCountdown(targetMs: number): string {
  const diff = Math.max(0, targetMs - Date.now());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function MembershipModal({
  isOpen: propsIsOpen,
  onClose: propsOnClose,
  completedCount: propsCompletedCount,
}: MembershipModalProps = {}) {
  const { t, lang } = useT();
  const supabase = useRef(createClient()).current;
  const [eventCompletedCount, setEventCompletedCount] = useState<number | null>(null);
  const [selectedTierKey, setSelectedTierKey] = useState<string>('regular');

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [tierRewards, setTierRewards] = useState<MyTierRewards | null>(null);
  const [countdownText, setCountdownText] = useState('');
  const [copyCodeLabel, setCopyCodeLabel] = useState('Copy');
  const [diamondCopyLabel, setDiamondCopyLabel] = useState('Copy');
  const [legendaryVoucher, setLegendaryVoucher] = useState<LegendaryVoucherStatus | null>(null);
  const [isClaimingLegendary, setIsClaimingLegendary] = useState(false);
  const [diamondCode, setDiamondCode] = useState<string | null>(null);
  const [reactivatingTier, setReactivatingTier] = useState<'silver' | 'gold' | null>(null);

  const isControlled = typeof propsIsOpen === 'boolean';
  const isEventOpen = eventCompletedCount !== null;
  const isModalOpen = isControlled ? propsIsOpen : isEventOpen;
  const effectiveCount = isControlled ? (propsCompletedCount ?? 0) : (eventCompletedCount ?? 0);

  useEffect(() => {
    // মডাল খোলার সময় একবারই ভাউচারের বর্তমান অবস্থা পড়ে নেওয়া হচ্ছে (RLS
    // নিজের সারি ছাড়া কিছু ফেরত দেয় না) — Legendary ট্যাবে না গেলেও ঠিক
    // আছে, খরচ নগণ্য আর ট্যাব বদলালে আলাদা করে আর কল করতে হয় না।
    if (!isModalOpen) {
      setLegendaryVoucher(null);
      setTierRewards(null);
      return;
    }
    let cancelled = false;
    getLegendaryVoucherStatus(supabase).then((res) => {
      if (!cancelled) setLegendaryVoucher(res);
    });
    // 🛡️ সিলভার/গোল্ড স্পিনের আসল অবস্থা (জিতেছে/সক্রিয়/মেয়াদ শেষ/ব্যবহৃত/
    // সুযোগ শেষ) মডাল খোলার সাথে সাথেই ডাটাবেজ থেকে আনা হচ্ছে — localStorage
    // আর নয়, তাই ডিভাইস বদলালে বা ক্যাশ মুছলেও সঠিক অবস্থাই দেখাবে।
    getMyTierRewards(supabase).then((res) => {
      if (!cancelled) setTierRewards(res);
    });
    return () => {
      cancelled = true;
    };
  }, [isModalOpen, supabase]);

  const handleClaimLegendary = async () => {
    if (isClaimingLegendary) return;
    setIsClaimingLegendary(true);
    const res = await claimLegendaryReward(supabase);
    setIsClaimingLegendary(false);
    if (!res.ok) {
      showToast(res.error || (lang === 'en' ? 'Something went wrong, please try again' : 'একটু সমস্যা হয়েছে, আবার চেষ্টা করুন'));
      return;
    }
    setLegendaryVoucher(res);
    showToast(
      lang === 'en'
        ? 'Claimed! Your next order will be 100% Cash on Delivery.'
        : 'ক্লেইম সফল হয়েছে! আপনার পরবর্তী অর্ডারটি সম্পূর্ণ ক্যাশ অন ডেলিভারিতে হবে।',
    );
  };

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ completedCount: number }>).detail;
      const count = d?.completedCount ?? 0;
      setEventCompletedCount(count);
      const userTier = getTier(count);
      setSelectedTierKey(userTier.key);
    };
    window.addEventListener(OPEN_MEMBERSHIP_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MEMBERSHIP_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (isModalOpen) lockBody();
    else unlockBody();
    return () => unlockBody();
  }, [isModalOpen]);

  const userCurrentTier = useMemo(
    () => getTier(effectiveCount),
    [effectiveCount]
  );

  useEffect(() => {
    if (isModalOpen) {
      setSelectedTierKey(userCurrentTier.key);
      setSpinRotation(0);
    }
  }, [isModalOpen, userCurrentTier.key]);

  const selectedTier = useMemo(
    () => MEMBERSHIP_TIERS.find((tier) => tier.key === selectedTierKey) || MEMBERSHIP_TIERS[0],
    [selectedTierKey]
  );

  const isSelectedTierUnlocked = useMemo(() => {
    return effectiveCount >= selectedTier.min;
  }, [effectiveCount, selectedTier]);

  useEffect(() => {
    if (!isModalOpen || selectedTierKey !== 'diamond' || !isSelectedTierUnlocked) {
      setDiamondCode(null);
      return;
    }
    let cancelled = false;
    getTierCouponCodeAction('diamond').then((res) => {
      if (!cancelled) setDiamondCode(res.ok && res.code ? res.code : null);
    });
    return () => {
      cancelled = true;
    };
  }, [isModalOpen, selectedTierKey, isSelectedTierUnlocked]);

  useEffect(() => {
    if (!selectedTierKey) return;
    setSpinRotation(0);
  }, [selectedTierKey]);

  const silverUIState: TierSpinUIState = useMemo(
    () => buildTierSpinUIState('silver', SILVER_SPIN_SLICES, tierRewards?.silver),
    [tierRewards]
  );
  const goldUIState: TierSpinUIState = useMemo(
    () => buildTierSpinUIState('gold', GOLD_SPIN_SLICES, tierRewards?.gold),
    [tierRewards]
  );
  const currentTierUIState: TierSpinUIState | null =
    selectedTier.key === 'silver' ? silverUIState : selectedTier.key === 'gold' ? goldUIState : null;

  useEffect(() => {
    if (!currentTierUIState || currentTierUIState.status !== 'active' || !currentTierUIState.reward) {
      setCountdownText('');
      return;
    }
    const expiresAt = currentTierUIState.reward.expiresAt;
    const tierKey = selectedTier.key as 'silver' | 'gold';
    setCountdownText(formatCountdown(expiresAt));
    const timer = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setTierRewards((prev) => markTierRewardExpiredLocally(prev, tierKey));
        clearInterval(timer);
      } else {
        setCountdownText(formatCountdown(expiresAt));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentTierUIState?.status, currentTierUIState?.reward?.expiresAt, selectedTier.key]);

  const close = useCallback(() => {
    if (propsOnClose) propsOnClose();
    setEventCompletedCount(null);
    setIsSpinning(false);
    setSpinRotation(0);
  }, [propsOnClose]);

  useHistoryModal(Boolean(isModalOpen), close, 'membership-modal');

  const handleSelectTier = (key: string) => {
    if (isSpinning) return;
    setSelectedTierKey(key);
  };

  const handleCopyCode = useCallback(async (codeToCopy: string, isDiamond = false) => {
    try {
      await navigator.clipboard.writeText(codeToCopy);
    } catch {
      // ignore
    }
    showToast(lang === 'en' ? `Coupon ${codeToCopy} copied!` : `কুপন কোড "${codeToCopy}" কপি হয়েছে!`);
    if (isDiamond) {
      setDiamondCopyLabel(t('কপি হয়েছে!'));
      setTimeout(() => setDiamondCopyLabel('Copy'), 2000);
    } else {
      setCopyCodeLabel(t('কপি হয়েছে!'));
      setTimeout(() => setCopyCodeLabel('Copy'), 2000);
    }
  }, [lang, t]);

  const handleTriggerSpin = async (slices: SpinSlice[]) => {
    const tierKey = selectedTier.key as 'silver' | 'gold';
    if (isSpinning || currentTierUIState?.status !== 'available') return;

    setIsSpinning(true);

    // বিজয়ী স্লাইস ও কুপন সার্ভার (spin_tier_wheel RPC) ঠিক করে; client শুধু ফেরত-আসা index অনুযায়ী চাকা ঘোরায়।
    const result = await spinTierWheel(supabase, selectedTier.key);

    if (!result.ok || result.index === undefined || !result.code) {
      setIsSpinning(false);
      showToast(lang === 'en' ? 'Something went wrong, please try again' : 'একটু সমস্যা হয়েছে, আবার চেষ্টা করুন');
      return;
    }

    const index = result.index;
    const slice = slices[index] || slices[0];

    const sliceAngle = 360 / slices.length;
    const targetDegree = 360 * 5 + (360 - (index * sliceAngle + sliceAngle / 2));

    setSpinRotation(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSpinRotation(targetDegree);
      });
    });

    setTimeout(() => {
      setIsSpinning(false);
      setTierRewards((prev) => patchTierRewardState(prev, tierKey, result));
      showToast(lang === 'en' ? `Congratulations! You won ${slice.labelEn}!` : `অভিনন্দন! আপনি ${slice.label} জিতেছেন!`);
    }, 3900);
  };

  const handleReactivate = async (tierKey: 'silver' | 'gold') => {
    if (reactivatingTier) return;
    setReactivatingTier(tierKey);
    const result = await reactivateTierReward(supabase, tierKey);
    setReactivatingTier(null);
    if (!result.ok) {
      showToast(result.error || (lang === 'en' ? 'Something went wrong, please try again' : 'একটু সমস্যা হয়েছে, আবার চেষ্টা করুন'));
      return;
    }
    setTierRewards((prev) => patchTierRewardState(prev, tierKey, result));
    showToast(
      lang === 'en'
        ? 'Reactivated! You have 24 more hours to use it.'
        : 'আবার চালু হয়েছে! ব্যবহারের জন্য আরও ২৪ ঘণ্টা পাবেন।',
    );
  };

  return (
    <AnimatePresence>
      {isModalOpen && userCurrentTier && (
        <div className="fixed inset-0 z-[1205] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 bg-ink/55 backdrop-blur-[3px]"
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white shadow-sh3 ring-1 ring-white/80"
          >
            <div className="relative shrink-0 overflow-hidden border-b border-ink/10 px-6 pb-3.5 pt-5 text-left">
              <HeaderDecor />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
                    <CrownBadgeIcon />
                  </span>
                  <div>
                    <h3 className="font-body text-[17px] font-extrabold text-ink leading-none">
                      {lang === 'en' ? 'VIP Membership Club' : 'ভিআইপি মেম্বারশিপ ক্লাব'}
                    </h3>
                    <p className="mt-1 font-body text-[12.5px] font-bold text-brand-light">
                      {lang === 'en' ? `Your Level: ${userCurrentTier.en}` : `আপনার বর্তমান লেভেল: ${userCurrentTier.bn}`}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                  onClick={close}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-ink/60 shadow-sh1 backdrop-blur-[8px] transition-colors hover:bg-white hover:text-ink focus-visible:outline-none"
                  aria-label={t('বন্ধ করুন')}
                >
                  ✕
                </motion.button>
              </div>
            </div>

            <div className="no-scrollbar relative z-10 flex gap-2 overflow-x-auto overscroll-x-contain border-b border-ink/10 bg-white/60 px-4 py-2.5 [touch-action:pan-x]">
              {MEMBERSHIP_TIERS.map((tier) => {
                const isSelected = tier.key === selectedTierKey;
                const isUnlocked = effectiveCount >= tier.min;

                return (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    key={tier.key}
                    onClick={() => handleSelectTier(tier.key)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-[11.5px] font-bold transition-all shadow-2xs ${
                      isSelected
                        ? 'border border-brand-light bg-brand-light text-white shadow-xs'
                        : isUnlocked
                        ? 'border border-border-base bg-white/90 text-ink hover:border-brand-light/40'
                        : 'border border-border-base/60 bg-white/50 text-muted/70 hover:text-ink'
                    }`}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:!h-4 [&_svg]:!w-4"
                      dangerouslySetInnerHTML={{ __html: sanitizeSvgHtml(crownSVG(tier.crown)) }}
                    />
                    <span>{lang === 'en' ? tier.en.replace(' Member', '') : tier.bn}</span>
                    {isUnlocked && <span className="text-[10.5px] font-bold">✓</span>}
                  </motion.button>
                );
              })}
            </div>

            <div className="sleek-scrollbar flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="rounded-[18px] border border-white/90 bg-white/85 p-4 text-center shadow-xs backdrop-blur-md">
                <div
                  className="mx-auto mb-2 flex h-11 w-11 items-center justify-center drop-shadow-md"
                  dangerouslySetInnerHTML={{ __html: sanitizeSvgHtml(crownSVG(selectedTier.crown)) }}
                />
                <div
                  className="font-body text-base font-extrabold"
                  style={{ color: selectedTier.key === 'silver' ? '#475569' : selectedTier.key === 'gold' ? '#92400E' : selectedTier.key === 'diamond' ? '#44A7FC' : '#D97706' }}
                >
                  {lang === 'en' ? selectedTier.en : selectedTier.bn}
                </div>
                <div className="mt-0.5 font-body text-[12.5px] text-muted">
                  {lang === 'en'
                    ? selectedTier.max === Infinity
                      ? `Requirement: ${selectedTier.min}+ Delivered Orders`
                      : `Requirement: ${selectedTier.min}–${selectedTier.max} Delivered Orders`
                    : selectedTier.max === Infinity
                    ? `শর্ত: ${selectedTier.min}+ টি সফল ডেলিভারি সম্পন্ন অর্ডার`
                    : `শর্ত: ${selectedTier.min}–${selectedTier.max}টি সফল ডেলিভারি সম্পন্ন অর্ডার`}
                </div>

                {isSelectedTierUnlocked ? (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50/90 px-3.5 py-1 font-body text-[11px] font-extrabold text-emerald-800 shadow-2xs">
                    <span>✓</span>
                    <span>{lang === 'en' ? 'Unlocked & Active' : 'আনলকড ও সক্রিয়'}</span>
                  </div>
                ) : (
                  <div className="mt-2.5 rounded-[12px] border border-amber-300/80 bg-amber-50/90 px-3 py-1.5 font-body text-[11px] font-extrabold text-amber-900 shadow-2xs">
                    {lang === 'en'
                      ? `Complete ${Math.max(0, selectedTier.min - effectiveCount)} more ${Math.max(0, selectedTier.min - effectiveCount) === 1 ? 'order' : 'orders'} to unlock these rewards!`
                      : `এই রিওয়ার্ডগুলো আনলক করতে আপনার আর মাত্র ${Math.max(0, selectedTier.min - effectiveCount)}টি সফল অর্ডার প্রয়োজন!`}
                  </div>
                )}
              </div>

              {selectedTier.key === 'regular' && (
                <div className="rounded-[18px] border border-dashed border-border-base bg-white/70 p-5 text-center shadow-xs backdrop-blur-md">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-bg/50 text-xl text-brand-light shadow-xs">
                    🎁
                  </div>
                  <h4 className="font-body text-[14.5px] font-bold text-ink">
                    {lang === 'en' ? 'Welcome to Vangcur!' : 'ভাঙচুর ক্লাবে স্বাগতম!'}
                  </h4>
                  <p className="mt-1 font-body text-[13px] leading-relaxed text-muted">
                    {lang === 'en'
                      ? 'Place your 1st order to step up to the Silver Tier and unlock the Lucky Cash Spin Wheel!'
                      : 'আপনার ১ম অর্ডারটি রিসিভ করলেই পদোন্নতি পাবেন সিলভার লেভেলে এবং আনলক হবে লাকি ক্যাশ স্পিনার!'}
                  </p>
                </div>
              )}

              {selectedTier.key === 'silver' && (
                <div className="rounded-[18px] border border-white/90 bg-white/85 p-4 text-center shadow-xs backdrop-blur-md">
                  <div className="mb-2.5 flex items-center justify-center gap-1.5 font-body text-[13px] font-extrabold text-brand-light">
                    <IconSparkles />
                    <span>{lang === 'en' ? 'Silver Lucky Cash Spin Wheel' : 'সিলভার লাকি ক্যাশ স্পিন হুইল'}</span>
                  </div>

                  {!tierRewards ? (
                    <div className="py-8 text-center font-body text-[12px] text-muted">
                      {lang === 'en' ? 'Loading…' : 'লোড হচ্ছে…'}
                    </div>
                  ) : silverUIState.status === 'locked' || silverUIState.status === 'available' ? (
                    <div className="flex flex-col items-center">
                      <div className="relative my-2 flex h-[210px] w-[210px] items-center justify-center">
                        <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 drop-shadow-md">
                          <svg width="18" height="22" viewBox="0 0 24 28" fill="#44A7FC">
                            <polygon points="12 28 0 4 24 4" />
                          </svg>
                        </div>

                        <div
                          className="h-full w-full rounded-full border-4 border-white shadow-sh2 overflow-hidden"
                          style={{
                            transform: `rotate(${spinRotation}deg)`,
                            transition: isSpinning ? 'transform 3.8s cubic-bezier(0.15, 0.85, 0.25, 1)' : 'none',
                          }}
                        >
                          <svg viewBox="0 0 100 100" className="h-full w-full">
                            {SILVER_SPIN_SLICES.map((slice, i) => {
                              const angle = 360 / SILVER_SPIN_SLICES.length;
                              const startAngle = i * angle;
                              const endAngle = (i + 1) * angle;
                              const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                              const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                              const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                              const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);
                              const textAngle = startAngle + angle / 2;

                              return (
                                <g key={slice.id}>
                                  <path
                                    d={`M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`}
                                    fill={slice.bg}
                                    stroke="#E2E8F0"
                                    strokeWidth="0.8"
                                  />
                                  <text
                                    x="74"
                                    y="52"
                                    fill={slice.color}
                                    fontSize="7.5"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    transform={`rotate(${textAngle}, 50, 50)`}
                                  >
                                    {slice.label}
                                  </text>
                                </g>
                              );
                            })}
                            <circle cx="50" cy="50" r="11" fill="#FFFFFF" stroke="#44A7FC" strokeWidth="2.5" />
                            <circle cx="50" cy="50" r="4" fill="#44A7FC" />
                          </svg>
                        </div>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        onClick={() => handleTriggerSpin(SILVER_SPIN_SLICES)}
                        disabled={isSpinning || silverUIState.status !== 'available'}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-info to-brand-light py-2.5 font-body text-xs sm:text-sm font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSpinning
                          ? t('চাকা ঘুরছে...')
                          : silverUIState.status === 'locked'
                          ? (lang === 'en' ? `Locked (${Math.max(0, selectedTier.min - effectiveCount)} orders left)` : `লকড (আর ${Math.max(0, selectedTier.min - effectiveCount)}টি অর্ডার প্রয়োজন)`)
                          : (lang === 'en' ? 'Spin & Win Discount' : 'স্পিন করে ডিসকাউন্ট জিতুন')}
                      </motion.button>
                    </div>
                  ) : silverUIState.status === 'active' && silverUIState.reward ? (
                    <div className="rounded-[16px] border border-emerald-300/80 bg-emerald-50/90 p-4 text-center shadow-xs animate-section-reveal">
                      <div className="font-body text-[15px] font-extrabold text-emerald-900">
                        {lang === 'en' ? `You Won ${silverUIState.reward.slice.labelEn}!` : `আপনি জিতেছেন ${silverUIState.reward.slice.label}!`}
                      </div>
                      <p className="mt-0.5 font-body text-[12px] text-emerald-800">
                        {lang === 'en'
                          ? `Valid on orders above ৳${silverUIState.reward.slice.minOrder}`
                          : `সর্বনিম্ন ৳${silverUIState.reward.slice.minOrder} টাকার অর্ডারে প্রযোজ্য`}
                      </p>

                      <div className="my-3 flex items-center justify-between rounded-xl border border-dashed border-emerald-400 bg-white/95 px-3.5 py-2">
                        <span className="font-body text-sm font-extrabold tracking-wider text-emerald-800">
                          {silverUIState.reward.code}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopyCode(silverUIState.reward!.code)}
                          className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 font-body text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700"
                        >
                          {copyCodeLabel === 'Copy' ? <IconCopy /> : <IconCheck />}
                          <span>{copyCodeLabel}</span>
                        </motion.button>
                      </div>

                      <div className="font-body text-[10.5px] font-bold text-amber-700">
                        {lang === 'en' ? `Expires in: ${countdownText}` : `মেয়াদ আর মাত্র: ${countdownText}`}
                      </div>
                    </div>
                  ) : silverUIState.status === 'expired' && silverUIState.reward ? (
                    <TierExpiredCard
                      lang={lang}
                      reward={silverUIState.reward}
                      isReactivating={reactivatingTier === 'silver'}
                      onReactivate={() => handleReactivate('silver')}
                      accentFrom="from-info"
                      accentTo="to-brand-light"
                    />
                  ) : (
                    <TierEndedMessage
                      lang={lang}
                      variant={silverUIState.status === 'used' ? 'used' : silverUIState.status === 'disabled' ? 'disabled' : 'missed'}
                    />
                  )}
                </div>
              )}

              {selectedTier.key === 'gold' && (
                <div className="rounded-[18px] border border-white/90 bg-white/85 p-4 text-center shadow-xs backdrop-blur-md">
                  <div className="mb-2.5 flex items-center justify-center gap-1.5 font-body text-[13px] font-extrabold text-amber-700">
                    <IconSparkles />
                    <span>{lang === 'en' ? 'Gold VIP Magic Spinner' : 'গোল্ড ভিআইপি ম্যাজিক স্পিনার'}</span>
                  </div>

                  {!tierRewards ? (
                    <div className="py-8 text-center font-body text-[12px] text-muted">
                      {lang === 'en' ? 'Loading…' : 'লোড হচ্ছে…'}
                    </div>
                  ) : goldUIState.status === 'locked' || goldUIState.status === 'available' ? (
                    <div className="flex flex-col items-center">
                      <div className="relative my-2 flex h-[210px] w-[210px] items-center justify-center">
                        <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 drop-shadow-md">
                          <svg width="18" height="22" viewBox="0 0 24 28" fill="#D97706">
                            <polygon points="12 28 0 4 24 4" />
                          </svg>
                        </div>

                        <div
                          className="h-full w-full rounded-full border-4 border-white shadow-sh2 overflow-hidden"
                          style={{
                            transform: `rotate(${spinRotation}deg)`,
                            transition: isSpinning ? 'transform 3.8s cubic-bezier(0.15, 0.85, 0.25, 1)' : 'none',
                          }}
                        >
                          <svg viewBox="0 0 100 100" className="h-full w-full">
                            {GOLD_SPIN_SLICES.map((slice, i) => {
                              const angle = 360 / GOLD_SPIN_SLICES.length;
                              const startAngle = i * angle;
                              const endAngle = (i + 1) * angle;
                              const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                              const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                              const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                              const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);
                              const textAngle = startAngle + angle / 2;

                              return (
                                <g key={slice.id}>
                                  <path
                                    d={`M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`}
                                    fill={slice.bg}
                                    stroke="#E2E8F0"
                                    strokeWidth="0.8"
                                  />
                                  <text
                                    x="74"
                                    y="52"
                                    fill={slice.color}
                                    fontSize="7"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    transform={`rotate(${textAngle}, 50, 50)`}
                                  >
                                    {slice.label}
                                  </text>
                                </g>
                              );
                            })}
                            <circle cx="50" cy="50" r="11" fill="#FFFFFF" stroke="#D97706" strokeWidth="2.5" />
                            <circle cx="50" cy="50" r="4" fill="#D97706" />
                          </svg>
                        </div>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        onClick={() => handleTriggerSpin(GOLD_SPIN_SLICES)}
                        disabled={isSpinning || goldUIState.status !== 'available'}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 font-body text-xs sm:text-sm font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSpinning
                          ? t('চাকা ঘুরছে...')
                          : goldUIState.status === 'locked'
                          ? (lang === 'en' ? `Locked (${Math.max(0, selectedTier.min - effectiveCount)} orders left)` : `লকড (আর ${Math.max(0, selectedTier.min - effectiveCount)}টি অর্ডার প্রয়োজন)`)
                          : (lang === 'en' ? 'Spin Gold Wheel' : 'গোল্ড স্পিন করুন')}
                      </motion.button>
                    </div>
                  ) : goldUIState.status === 'active' && goldUIState.reward ? (
                    <div className="rounded-[16px] border border-emerald-300/80 bg-emerald-50/90 p-4 text-center shadow-xs animate-section-reveal">
                      <div className="font-body text-[15px] font-extrabold text-emerald-900">
                        {lang === 'en' ? `You Won ${goldUIState.reward.slice.labelEn}!` : `আপনি জিতেছেন ${goldUIState.reward.slice.label}!`}
                      </div>
                      <p className="mt-0.5 font-body text-[12px] text-emerald-800">
                        {goldUIState.reward.slice.type === 'free_shipping'
                          ? (lang === 'en' ? 'Free delivery on your next order' : 'পরবর্তী অর্ডারে সম্পূর্ণ ফ্রি ডেলিভারি')
                          : (lang === 'en' ? `Valid on orders above ৳${goldUIState.reward.slice.minOrder}` : `সর্বনিম্ন ৳${goldUIState.reward.slice.minOrder} টাকার অর্ডারে প্রযোজ্য`)}
                      </p>

                      <div className="my-3 flex items-center justify-between rounded-xl border border-dashed border-emerald-400 bg-white/95 px-3.5 py-2">
                        <span className="font-body text-sm font-extrabold tracking-wider text-emerald-800">
                          {goldUIState.reward.code}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopyCode(goldUIState.reward!.code)}
                          className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 font-body text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700"
                        >
                          {copyCodeLabel === 'Copy' ? <IconCopy /> : <IconCheck />}
                          <span>{copyCodeLabel}</span>
                        </motion.button>
                      </div>

                      <div className="font-body text-[10.5px] font-bold text-amber-700">
                        {lang === 'en' ? `Expires in: ${countdownText}` : `মেয়াদ আর মাত্র: ${countdownText}`}
                      </div>
                    </div>
                  ) : goldUIState.status === 'expired' && goldUIState.reward ? (
                    <TierExpiredCard
                      lang={lang}
                      reward={goldUIState.reward}
                      isReactivating={reactivatingTier === 'gold'}
                      onReactivate={() => handleReactivate('gold')}
                      accentFrom="from-amber-500"
                      accentTo="to-amber-600"
                    />
                  ) : (
                    <TierEndedMessage
                      lang={lang}
                      variant={goldUIState.status === 'used' ? 'used' : goldUIState.status === 'disabled' ? 'disabled' : 'missed'}
                    />
                  )}
                </div>
              )}

              {selectedTier.key === 'diamond' && (
                <div className="rounded-[18px] border border-brand-light/35 bg-white/90 p-4 text-left shadow-xs backdrop-blur-md space-y-3 animate-section-reveal">
                  <div className="text-center pb-2 border-b border-ink/10">
                    <span className="inline-block font-body text-[14px] font-extrabold text-brand-light">
                      {lang === 'en' ? 'Diamond VIP Guaranteed Perks' : 'ডায়মন্ড মেম্বার ডাবল প্রিভিলেজ'}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-[12px] border border-brand-light/25 bg-brand-bg/25 p-3">
                    <span className="mt-0.5 text-base">🎁</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-body text-[13px] font-bold text-ink">
                        {lang === 'en' ? 'Flat ৳150 OFF Guaranteed Coupon' : 'ফ্ল্যাট ৳১৫০ ছাড়ের এক্সক্লুসিভ কুপন'}
                      </div>

                      <div className="mt-2 flex items-center justify-between rounded-xl border border-dashed border-brand-light/50 bg-white px-3.5 py-2">
                        {isSelectedTierUnlocked ? (
                          <span className="font-body text-sm font-extrabold tracking-wider text-brand-light">
                            {diamondCode ?? '••••••••••'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-body text-sm font-extrabold tracking-wider text-brand-light/60 blur-[3px] select-none" aria-hidden="true">
                              ••••••••••
                            </span>
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 font-body text-[10px] font-bold text-amber-800">
                              🔒 {lang === 'en' ? 'Locked' : 'লকড'}
                            </span>
                          </div>
                        )}

                        {isSelectedTierUnlocked ? (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => diamondCode && handleCopyCode(diamondCode, true)}
                            disabled={!diamondCode}
                            className="flex items-center gap-1 rounded-full bg-brand-light px-3 py-1 font-body text-[11px] font-bold text-white shadow-xs hover:bg-brand-light-hover disabled:opacity-50"
                          >
                            {diamondCopyLabel === 'Copy' ? <IconCopy /> : <IconCheck />}
                            <span>{diamondCopyLabel}</span>
                          </motion.button>
                        ) : (
                          <span className="font-body text-[11px] font-semibold text-muted">
                            {lang === 'en' ? 'Unlock to view' : 'আনলক করে দেখুন'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-[12px] border border-white/80 bg-white/80 p-3 shadow-2xs">
                    <span className="text-base">⚡</span>
                    <div className="font-body text-[13px] font-bold text-ink">
                      {lang === 'en' ? 'Priority 1-Day Dispatch & Courier Handover' : 'সবার আগে ১ দিনে কুরিয়ারে অগ্রাধিকার হ্যান্ডওভার'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-[12px] border border-white/80 bg-white/80 p-3 shadow-2xs">
                    <span className="text-base">✨</span>
                    <div className="font-body text-[13px] font-bold text-ink">
                      {lang === 'en' ? 'Free Mystery Tech Accessory with every parcel' : 'প্রতিটি অর্ডারের সাথে সারপ্রাইজ গ্যাজেট গিফট'}
                    </div>
                  </div>
                </div>
              )}

              {selectedTier.key === 'legendary' && (
                <div className="rounded-[18px] border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-[#FFFBEB] p-5 text-center shadow-xs backdrop-blur-md animate-section-reveal">
                  <div
                    className="mx-auto mb-2 flex h-12 w-12 items-center justify-center drop-shadow-md"
                    dangerouslySetInnerHTML={{ __html: sanitizeSvgHtml(crownSVG(selectedTier.crown)) }}
                  />
                  <h4 className="font-body text-[16px] font-extrabold text-amber-900">
                    {lang === 'en' ? '100% Cash on Delivery (Zero Advance)' : '১০০% ক্যাশ অন ডেলিভারি (Zero Advance)'}
                  </h4>
                  <p className="mt-1.5 font-body text-[13px] leading-relaxed text-amber-800/90">
                    {lang === 'en'
                      ? 'As a Legendary customer, claim your one-time reward: your very next order needs ZERO advance payment!'
                      : 'আপনি আমাদের সর্বোচ্চ সম্মানিত লিজেন্ডারি কাস্টমার! একবার ক্লেইম করলে আপনার পরবর্তী একটি অর্ডার সম্পূর্ণ ক্যাশ অন ডেলিভারিতে হবে — কোনো অগ্রিম লাগবে না।'}
                  </p>

                  {!isSelectedTierUnlocked ? (
                    <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/80 px-4 py-1.5 font-body text-xs font-extrabold text-amber-900 shadow-2xs">
                      <span>✓</span>
                      <span>{lang === 'en' ? 'Legendary Locked' : 'লিজেন্ডারি লকড'}</span>
                    </div>
                  ) : !legendaryVoucher ? (
                    <div className="mt-3.5 font-body text-xs text-amber-700/70">{lang === 'en' ? 'Loading…' : 'লোড হচ্ছে…'}</div>
                  ) : legendaryVoucher.used ? (
                    <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/80 px-4 py-1.5 font-body text-xs font-extrabold text-amber-900 shadow-2xs">
                      <span>✓</span>
                      <span>{lang === 'en' ? 'One-time reward already used' : 'এই বিশেষ সুবিধাটি আপনি ইতিমধ্যে ব্যবহার করেছেন'}</span>
                    </div>
                  ) : legendaryVoucher.isAvailable ? (
                    <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/80 px-4 py-1.5 font-body text-xs font-extrabold text-emerald-900 shadow-2xs">
                      <span>✓</span>
                      <span>{lang === 'en' ? 'Ready — your next order will be full COD' : 'প্রস্তুত — আপনার পরবর্তী অর্ডার সম্পূর্ণ COD হবে'}</span>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      disabled={isClaimingLegendary}
                      onClick={handleClaimLegendary}
                      className="mt-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-2 font-body text-xs font-extrabold text-white shadow-sh2 disabled:opacity-60"
                    >
                      {isClaimingLegendary
                        ? (lang === 'en' ? 'Claiming…' : 'ক্লেইম হচ্ছে…')
                        : (lang === 'en' ? 'Claim your reward' : 'রিওয়ার্ড ক্লেইম করুন')}
                    </motion.button>
                  )}
                </div>
              )}

            </div>

            <div className="shrink-0 px-6 pb-6 pt-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                onClick={close}
                className="w-full rounded-full bg-gradient-to-r from-info to-brand-light py-[12.5px] font-body text-[14px] font-bold text-white shadow-sh2 transition-[filter] duration-brand hover:brightness-[1.03]"
              >
                {lang === 'en' ? 'Got It' : 'বুঝেছি'}
              </motion.button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
