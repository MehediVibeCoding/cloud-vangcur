// GitHub পাথ: app/components/ui/PremiumButton.tsx — নতুন ফাইল
'use client';

/**
 * PremiumButton
 * ─────────────────────────────────────────────────────────────────────
 * প্রতিটা অ্যাকশন বাটনে (অর্ডার/লগইন/সাবমিট) বারবার হাতে স্পিনার-স্টেট
 * লেখার বদলে এই একটা কম্পোনেন্ট ব্যবহার করা যাবে। এতে আছে:
 *
 *  ১. Press spring physics — whileTap দিয়ে হালকা দেবে-গিয়ে-ফেরত-আসা,
 *     CSS active:scale-95-এর চেয়ে অনেক বেশি "জীবন্ত" অনুভূতি দেয়।
 *  ২. Desktop-only hover glow + keyboard-only focus ring — globals.css-এর
 *     card-hover-glow ও :focus-visible নিয়ম এখানে বিল্ট-ইন।
 *  ৩. status prop দিয়ে idle → loading → success/error state machine:
 *     ক্লিক করামাত্র বাটন disabled হয়ে যায় (ডবল-সাবমিট আটকাতে), ভেতরে
 *     স্পিনার/টেক্সট বদলায়, সফল হলে টিকমার্ক দেখায়, ব্যর্থ হলে আবার
 *     ক্লিকযোগ্য হয়ে যায়।
 *
 * ব্যবহার:
 *   const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
 *   <PremiumButton
 *     status={status}
 *     idleLabel="অর্ডার করুন"
 *     loadingLabel="প্রসেস হচ্ছে..."
 *     successLabel="সফল হয়েছে!"
 *     onClick={handleSubmit}
 *     shimmer
 *   />
 */

import { motion } from 'motion/react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

type ButtonStatus = 'idle' | 'loading' | 'success' | 'error';

interface PremiumButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  status?: ButtonStatus;
  idleLabel: ReactNode;
  loadingLabel?: ReactNode;
  successLabel?: ReactNode;
  errorLabel?: ReactNode;
  /** CTA বাটনের ওপর দিয়ে প্রতি ৬ সেকেন্ডে হালকা শিমার বিম চালাতে চাইলে true দাও */
  shimmer?: boolean;
  className?: string;
}

function IconSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.75" opacity="0.22" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12.5 9.5 17.5 19.5 6" />
    </svg>
  );
}

export default function PremiumButton({
  status = 'idle',
  idleLabel,
  loadingLabel,
  successLabel,
  errorLabel,
  shimmer = false,
  className = '',
  disabled,
  ...rest
}: PremiumButtonProps) {
  const isBusy = status === 'loading' || status === 'success';

  return (
    <motion.button
      // ক্লিক করামাত্র হালকা দেবে যাওয়া (স্প্রিং), ছেড়ে দিলে হালকা বাউন্স করে ফেরত
      whileTap={disabled || isBusy ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      disabled={disabled || isBusy}
      aria-busy={status === 'loading'}
      className={[
        'card-hover-glow flex items-center justify-center gap-2 rounded-full',
        'transition-[filter] duration-brand ease-brand',
        shimmer ? 'shimmer-sheen' : '',
        disabled || isBusy ? 'cursor-not-allowed opacity-90' : 'hover:brightness-[1.03]',
        className,
      ].join(' ')}
      {...rest}
    >
      {status === 'loading' ? (
        <>
          <IconSpinner />
          <span>{loadingLabel ?? idleLabel}</span>
        </>
      ) : status === 'success' ? (
        <>
          <IconCheck />
          <span>{successLabel ?? idleLabel}</span>
        </>
      ) : status === 'error' ? (
        <span>{errorLabel ?? idleLabel}</span>
      ) : (
        <span>{idleLabel}</span>
      )}
    </motion.button>
  );
}
