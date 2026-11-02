'use client';

// ফাইলের পাথ: app/search/SearchFilterPanel.tsx
// [NEW] সার্চ হেডারের ডান পাশের ফিল্টার বাটন + প্যানেল।
// ডেস্কটপে বাটনের নিচে পপওভার, মোবাইলে নিচ থেকে ওঠা শিট। প্যানেল document.body-তে (portal) রেন্ডার হয়,
// কারণ হেডারের backdrop-blur তার ভেতরের `fixed` এলিমেন্টের পজিশন ভেঙে দেয়।
// নতুন ডিজাইন: সর্ট রেডিও-কার্ড (আইকন + তীর), দামের ৬টা প্রিসেট, ফ্লোটিং-লেবেলের মূল্য ঘর, মোবাইলে হ্যান্ডেলসহ শিট।
// প্রতিটা বদলে সাথে সাথে প্রয়োগ হয় (আলাদা "Apply" নেই) — ফলাফল ইন-মেমোরি ফিল্টার হয়, তাই তাৎক্ষণিক।

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  EMPTY_FILTERS,
  countActiveFilters,
  type BrandFacet,
  type SearchFilters,
  type SortKey,
} from '@/lib/searchFilters';

interface Props {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  brands: BrandFacet[];
  priceBounds: { min: number; max: number } | null;
  resultCount: number;
  lang: string;
  hidden?: boolean; // কোয়েরি না থাকলে লুকানো (লেআউট জায়গা ধরে রাখে, যাতে হেডার লাফ না দেয়)
}

type SortIcon = 'relevance' | 'asc' | 'desc' | 'newest';

const SORTS: { key: SortKey; icon: SortIcon; bn: [string, string?]; en: [string, string?] }[] = [
  { key: 'relevance', icon: 'relevance', bn: ['সবচেয়ে প্রাসঙ্গিক'], en: ['Most relevant'] },
  { key: 'price_asc', icon: 'asc', bn: ['দাম: কম', 'বেশি'], en: ['Price: Low', 'High'] },
  { key: 'price_desc', icon: 'desc', bn: ['দাম: বেশি', 'কম'], en: ['Price: High', 'Low'] },
  { key: 'newest', icon: 'newest', bn: ['নতুন পণ্য আগে'], en: ['Newest first'] },
];

const PRESETS: { min: number | null; max: number | null; bn: string; en: string }[] = [
  { min: null, max: 500, bn: '৳৫০০ এর নিচে', en: 'Under ৳500' },
  { min: 500, max: 1000, bn: '৳৫০০ – ১,০০০', en: '৳500 – 1,000' },
  { min: 1000, max: 2000, bn: '৳১,০০০ – ২,০০০', en: '৳1,000 – 2,000' },
  { min: 2000, max: 5000, bn: '৳২,০০০ – ৫,০০০', en: '৳2,000 – 5,000' },
  { min: 5000, max: 10000, bn: '৳৫,০০০ – ১০,০০০', en: '৳5,000 – 10,000' },
  { min: 10000, max: null, bn: '৳১০,০০০ এর উপরে', en: 'Over ৳10,000' },
];

const fmt = (n: number) => n.toLocaleString('en-US');

function FilterIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </svg>
  );
}

function ArrowRight({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </svg>
  );
}

function SortGlyph({ kind }: { kind: SortIcon }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (kind === 'asc')
    return <svg {...common}><path d="M7 19V5M7 5l-3.5 3.5M7 5l3.5 3.5" /><path d="M14 7h6M14 12h4M14 17h2" /></svg>;
  if (kind === 'desc')
    return <svg {...common}><path d="M7 5v14M7 19l-3.5-3.5M7 19l3.5-3.5" /><path d="M14 17h6M14 12h4M14 7h2" /></svg>;
  if (kind === 'newest')
    return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
  return <svg {...common}><path d="M12 3.5l2.4 5.1 5.6.7-4.1 3.9 1 5.5L12 16l-4.9 2.7 1-5.5L4 9.3l5.6-.7z" /></svg>;
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <h3 className="font-body text-[13px] font-extrabold tracking-[0.1px] text-ink">{children}</h3>
      {hint}
    </div>
  );
}

const chipBase = 'rounded-full border px-3.5 py-2 font-body text-[12.5px] font-semibold transition-colors duration-brand';
const chipOff = 'border-border-base bg-white text-ink hover:border-brand-light hover:text-brand-light';
const chipOn = 'border-brand-light bg-brand-bg text-brand-light';

export default function SearchFilterPanel({ filters, onChange, brands, priceBounds, resultCount, lang, hidden }: Props) {
  const en = lang === 'en';
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null); // null = মোবাইল শিট
  const btnRef = useRef<HTMLButtonElement>(null);
  const active = countActiveFilters(filters);

  // মূল্যের ইনপুট টাইপ করার সময় লোকাল স্টেট — ফোকাস হারালে/Enter-এ প্রয়োগ, যাতে প্রতি অক্ষরে লিস্ট নড়ে না
  const [minTxt, setMinTxt] = useState('');
  const [maxTxt, setMaxTxt] = useState('');
  useEffect(() => {
    setMinTxt(filters.min != null ? String(filters.min) : '');
    setMaxTxt(filters.max != null ? String(filters.max) : '');
  }, [filters.min, filters.max]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    // ব্যাচ ৯.৪-ফিক্স: মোবাইলে আগে যেকোনো `resize`-এ প্যানেল বন্ধ হতো। সার্চ-বক্সে ফোকাস থাকা অবস্থায় ফিল্টার চাপলে
    // কীবোর্ড নেমে যায়, আর অ্যাড্রেস-বার ওঠানামা করে — দুটোতেই `resize` ফায়ার হয় (শুধু উচ্চতা বদলায়)।
    // ফলে শিট খুলেই সাথে সাথে বন্ধ হয়ে যেত ("বাড়ি খেয়ে ফিরে যাওয়া")। এখন শুধু প্রস্থ বদলালেই
    // (ডেস্কটপে রিসাইজ/ফোন ঘোরানো) বন্ধ হয়, কারণ তখন পপওভারের পজিশন ভুল হয়ে যায়।
    const openWidth = window.innerWidth;
    const onResize = () => { if (window.innerWidth !== openWidth) setOpen(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const openedAtRef = useRef(0);
  const toggleOpen = () => {
    if (open) { setOpen(false); return; }
    // সার্চ-বক্সের কীবোর্ড আগে নামিয়ে দিই — শিট খোলার পরে কীবোর্ড নামলে লেআউট লাফিয়ে উঠত
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && typeof active.blur === 'function') active.blur();
    openedAtRef.current = Date.now();
    const el = btnRef.current;
    if (el && window.innerWidth >= 640) {
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 10, right: Math.max(8, window.innerWidth - r.right) });
    } else {
      setPos(null);
    }
    setOpen(true);
  };

  const commitPrice = () => {
    const toN = (s: string) => {
      const n = parseInt(s.replace(/[^\d]/g, ''), 10);
      return Number.isFinite(n) ? n : null;
    };
    let min = toN(minTxt);
    let max = toN(maxTxt);
    if (min != null && max != null && min > max) [min, max] = [max, min];
    if (min !== filters.min || max !== filters.max) onChange({ ...filters, min, max });
  };

  const toggleBrand = (key: string) => {
    const has = filters.brands.includes(key);
    onChange({ ...filters, brands: has ? filters.brands.filter((b) => b !== key) : [...filters.brands, key] });
  };

  const presetsToShow = PRESETS.filter((p) => {
    if (!priceBounds) return true;
    const lo = p.min ?? 0;
    const hi = p.max ?? Infinity;
    return priceBounds.max >= lo && priceBounds.min <= hi;
  });

  const priceField = (
    value: string, setValue: (v: string) => void, label: string, placeholder: string,
  ) => (
    <label className="flex h-[52px] min-w-0 flex-1 flex-col justify-center rounded-[14px] border border-border-base bg-white px-3.5 transition-colors duration-brand focus-within:border-brand-light">
      <span className="font-body text-[10.5px] font-bold uppercase tracking-[0.4px] text-muted">{label}</span>
      <span className="flex items-center gap-1">
        <span className="text-[13.5px] font-bold text-muted">৳</span>
        <input
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, '').slice(0, 7))}
          onBlur={commitPrice}
          onKeyDown={(e) => { if (e.key === 'Enter') commitPrice(); }}
          className="w-full min-w-0 bg-transparent text-[14.5px] font-bold text-ink outline-none placeholder:font-medium placeholder:text-muted/60"
          aria-label={label}
        />
      </span>
    </label>
  );

  const panel = (
    <>
      <div
        className={`fixed inset-0 z-[1290] ${pos ? 'bg-transparent' : 'bg-black/40'}`}
        // খোলার ঠিক পরের ~৩৫০ms-এর ট্যাপ (মোবাইলের ghost click) ব্যাকড্রপ ধরে বন্ধ করে দিত — তাই উপেক্ষা
        onClick={() => { if (Date.now() - openedAtRef.current > 350) setOpen(false); }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label={en ? 'Filter and sort' : 'ফিল্টার ও সর্ট'}
        style={pos ? { top: pos.top, right: pos.right } : undefined}
        className={`fixed z-[1300] flex flex-col overflow-hidden border border-border-base bg-white shadow-sh2 ${
          pos
            ? 'max-h-[calc(100vh-110px)] w-[400px] rounded-[24px]'
            : 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-[28px] border-b-0'
        }`}
      >
        {!pos && <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border-base" aria-hidden />}

        <div className="flex items-center justify-between px-5 pb-3 pt-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-bg text-brand-light">
              <FilterIcon />
            </span>
            <h2 className="font-body text-[16px] font-extrabold text-ink">{en ? 'Filter & Sort' : 'ফিল্টার ও সর্ট'}</h2>
          </div>
          <div className="flex items-center gap-1">
            {(active > 0 || filters.sort !== 'relevance') && (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="rounded-full px-3 py-1.5 font-body text-[12.5px] font-bold text-brand-light hover:bg-brand-bg"
              >
                {en ? 'Reset all' : 'সব রিসেট'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={en ? 'Close' : 'বন্ধ করুন'}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain border-t border-border-base px-5 py-5">
          {/* সর্ট — রেডিও-স্টাইল তালিকা, প্রতিটার সামনে আইকন, দামের লাইনে স্পষ্ট তীর */}
          <section>
            <SectionTitle>{en ? 'Sort by' : 'সাজান'}</SectionTitle>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              {SORTS.map((o) => {
                const on = filters.sort === o.key;
                const [first, second] = en ? o.en : o.bn;
                return (
                  <button
                    key={o.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onChange({ ...filters, sort: o.key })}
                    className={`flex min-h-[48px] items-center gap-2.5 rounded-[14px] border px-3 py-2.5 text-left transition-colors duration-brand ${
                      on ? 'border-brand-light bg-brand-bg' : 'border-border-base bg-white hover:border-brand-light'
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${on ? 'bg-white text-brand-light' : 'bg-surface-muted text-muted'}`}>
                      <SortGlyph kind={o.icon} />
                    </span>
                    <span className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 font-body text-[13px] font-bold leading-tight ${on ? 'text-brand-light' : 'text-ink'}`}>
                      <span>{first}</span>
                      {second && (
                        <>
                          <ArrowRight />
                          <span>{second}</span>
                        </>
                      )}
                    </span>
                    <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-brand-light bg-brand-light' : 'border-border-base'}`}>
                      {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* দাম */}
          <section>
            <SectionTitle>{en ? 'Price range' : 'দামের রেঞ্জ'}</SectionTitle>
            <div className="flex items-center gap-2">
              {priceField(minTxt, setMinTxt, en ? 'Min' : 'সর্বনিম্ন', priceBounds ? fmt(priceBounds.min) : '0')}
              <span className="text-muted" aria-hidden><ArrowRight size={14} /></span>
              {priceField(maxTxt, setMaxTxt, en ? 'Max' : 'সর্বোচ্চ', priceBounds ? fmt(priceBounds.max) : '∞')}
            </div>
            {presetsToShow.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {presetsToShow.map((p) => {
                  const on = filters.min === p.min && filters.max === p.max;
                  return (
                    <button
                      key={`${p.min}-${p.max}`}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onChange({ ...filters, min: on ? null : p.min, max: on ? null : p.max })}
                      className={`${chipBase} ${on ? chipOn : chipOff}`}
                    >
                      {en ? p.en : p.bn}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ব্র্যান্ড — ফলাফলে অন্তত একটা ব্র্যান্ডযুক্ত পণ্য থাকলেই দেখায় */}
          {brands.length > 0 && (
            <section>
              <SectionTitle>{en ? 'Brand' : 'ব্র্যান্ড'}</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {brands.map((b) => {
                  const on = filters.brands.includes(b.key);
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => toggleBrand(b.key)}
                      aria-pressed={on}
                      className={`${chipBase} ${on ? chipOn : chipOff}`}
                    >
                      {b.label} <span className="font-medium opacity-70">({b.count})</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* স্টক */}
          <section>
            <button
              type="button"
              role="switch"
              aria-checked={filters.inStock}
              onClick={() => onChange({ ...filters, inStock: !filters.inStock })}
              className="flex w-full items-center justify-between rounded-[14px] border border-border-base px-4 py-3 text-left transition-colors duration-brand hover:border-brand-light"
            >
              <span className="flex flex-col">
                <span className="font-body text-[13.5px] font-bold text-ink">{en ? 'In stock only' : 'শুধু স্টকে আছে'}</span>
                <span className="font-body text-[11.5px] text-muted">{en ? 'Hide sold-out products' : 'স্টক শেষ পণ্য লুকান'}</span>
              </span>
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-brand ${filters.inStock ? 'bg-brand-light' : 'bg-border-base'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-brand ${filters.inStock ? 'left-[22px]' : 'left-0.5'}`} />
              </span>
            </button>
          </section>
        </div>

        <div className="border-t border-border-base bg-white px-5 pt-3" style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={() => { commitPrice(); setOpen(false); }}
            className="w-full rounded-full border-none bg-gradient-to-r from-info to-brand-light py-3.5 font-body text-[14.5px] font-bold text-white shadow-sh2 transition-all duration-brand hover:brightness-[1.03] active:scale-[0.98]"
          >
            {en ? `Show ${resultCount} products` : `${resultCount}টি পণ্য দেখুন`}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={en ? 'Filter and sort' : 'ফিল্টার ও সর্ট'}
        tabIndex={hidden ? -1 : 0}
        className={`vc-press relative flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-body text-[13px] font-extrabold transition-colors duration-brand max-[400px]:px-3 ${
          hidden ? 'pointer-events-none invisible' : ''
        } ${active > 0 || filters.sort !== 'relevance' ? 'border-brand-light bg-brand-bg text-brand-light' : 'border-border-base bg-white/80 text-ink hover:border-brand-light hover:text-brand-light'}`}
      >
        <FilterIcon />
        <span className="hidden sm:inline">{en ? 'Filter' : 'ফিল্টার'}</span>
        {active > 0 && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-light px-1 text-[11px] font-bold text-white">
            {active}
          </span>
        )}
      </button>
      {open && typeof document !== 'undefined' && createPortal(panel, document.body)}
    </>
  );
}

// সক্রিয় ফিল্টারের চিপ-সারি (এক ক্লিকে বাদ) — কাউন্ট-লাইনের পাশে দেখানো হয়
export function ActiveFilterChips({
  filters, onChange, brandLabels, lang,
}: { filters: SearchFilters; onChange: (f: SearchFilters) => void; brandLabels: Record<string, string>; lang: string }) {
  const en = lang === 'en';
  const chips: { id: string; label: string; clear: () => void }[] = [];
  filters.brands.forEach((b) =>
    chips.push({ id: `b-${b}`, label: brandLabels[b] || b, clear: () => onChange({ ...filters, brands: filters.brands.filter((x) => x !== b) }) }),
  );
  if (filters.min != null || filters.max != null) {
    const label =
      filters.min != null && filters.max != null ? `৳${fmt(filters.min)} – ৳${fmt(filters.max)}`
      : filters.min != null ? (en ? `Over ৳${fmt(filters.min)}` : `৳${fmt(filters.min)} এর উপরে`)
      : (en ? `Under ৳${fmt(filters.max as number)}` : `৳${fmt(filters.max as number)} এর নিচে`);
    chips.push({ id: 'price', label, clear: () => onChange({ ...filters, min: null, max: null }) });
  }
  if (filters.inStock) chips.push({ id: 'stock', label: en ? 'In stock' : 'স্টকে আছে', clear: () => onChange({ ...filters, inStock: false }) });
  if (!chips.length) return null;
  return (
    <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={c.clear}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand-light bg-brand-bg px-3 py-1.5 font-body text-[12.5px] font-semibold text-brand-light"
        >
          {c.label}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}
        className="shrink-0 rounded-full px-2 py-1.5 font-body text-[12.5px] font-bold text-muted hover:text-brand-light"
      >
        {en ? 'Clear all' : 'সব মুছুন'}
      </button>
    </div>
  );
}

