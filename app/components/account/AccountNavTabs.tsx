'use client';

import { useState, type FC, type ReactNode } from 'react';
import { motion, LayoutGroup } from 'motion/react';

export interface AccountNavTabItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  /** true হলে ক্লিকে সক্রিয় পিল বসে না (যেমন থিম টগল — এটা কোনো "পেজ" নয়) */
  noActive?: boolean;
  onSelect: () => void;
}

interface AccountNavTabsProps {
  tabs: AccountNavTabItem[];
  className?: string;
}

/**
 * অ্যাকাউন্ট পেজের ডেস্কটপ ন্যাভবারের জন্য লেবেলযুক্ত ট্যাব-সুইচ (Wishlist,
 * Membership, ইত্যাদি)। প্রতিটা ট্যাব আসলে একটা অ্যাকশন বাটন (ড্রয়ার/মোডাল
 * খোলে) — তাই "active" পিলটা persistent কোনো পেজ-স্টেট বোঝায় না, বরং
 * সর্বশেষ ক্লিক করা আইটেমের উপর একটা ভিজ্যুয়াল হাইলাইট হিসেবে কাজ করে।
 */
export const AccountNavTabs: FC<AccountNavTabsProps> = ({ tabs, className = '' }) => {
  const [active, setActive] = useState<string | null>(null);

  const handleSelect = (tab: AccountNavTabItem) => {
    if (!tab.noActive) setActive(tab.id);
    tab.onSelect();
  };

  return (
    <LayoutGroup>
      <nav
        className={`relative flex items-center gap-0.5 rounded-full border border-border-base/70 bg-surface-muted/50 p-1 shadow-2xs backdrop-blur-md ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab)}
              title={tab.label}
              className="relative flex items-center gap-1.5 rounded-full px-3.5 py-2 outline-none"
            >
              {isActive && (
                <motion.div
                  layoutId="account-nav-active-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.9 }}
                  className="absolute inset-0 rounded-full bg-brand-light shadow-xs"
                />
              )}

              <motion.span
                layout="position"
                className={`relative z-10 flex h-4 w-4 items-center justify-center transition-colors duration-200 [&_svg]:!h-4 [&_svg]:!w-4 ${
                  isActive ? 'text-white' : 'text-ink/70'
                }`}
              >
                {tab.icon}
              </motion.span>

              <motion.span
                layout="position"
                className={`relative z-10 font-body text-[13px] font-bold whitespace-nowrap transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-ink'
                }`}
              >
                {tab.label}
              </motion.span>

              {!!tab.badge && tab.badge > 0 && (
                <motion.span
                  layout="position"
                  className="relative z-10 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-500 px-[5px] pt-px text-[10px] font-bold leading-none tabular-nums text-white"
                >
                  {tab.badge}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>
    </LayoutGroup>
  );
};

export default AccountNavTabs;
