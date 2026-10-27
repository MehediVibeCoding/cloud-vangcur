'use client';

// ফাইলের পাথ: app/search/SearchFilterPanel.tsx
// [NEW] সার্চ হেডারের ডান পাশের ফিল্টার বাটন + প্যানেল।
// ডেস্কটপে বাটনের নিচে পপওভার, মোবাইলে নিচ থেকে ওঠা শিট। প্যানেল document.body-তে (portal) রেন্ডার হয়,
// কারণ হেডারের backdrop-blur তার ভেতরের `fixed` এলিমেন্টের পজিশন ভেঙে দেয়।
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

const SORTS: { key: SortKey; bn: string; en: string }[] = [
  { key: 'relevance', bn: 'প্রাসঙ্গিক', en: 'Relevance' },
  { key: 'price_asc', bn: 'দাম: কম → বেশি', en: 'Price: Low → High' },
  { key: 'price_desc', bn: 'দাম: বেশি → কম', en: 'Price: High → Low' },
  { key: 'newest', bn: 'নতুন আগে', en: 'Newest first' },
];

const PRESETS: { min: number | null; max: number | null; bn: string; en: string }[] = [
  { min: null, max: 500, bn: '৳৫০০ এর নিচে', en: 'Under ৳500' },
  { min: 500, max: 1000, bn: '৳৫০০ – ১,০০০', en: '৳500 – 1,000' },
  { min: 1000, max: 2000, bn: '৳১,০০০ – ২,০০০', en: '৳1,000 – 2,000' },
  { min: 2000, max: null, bn: '৳২,০০০ এর উপরে', en: 'Over ৳2,000' },
];

const fmt = (n: number) => n.toLocaleString('en-US');

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 5h18M6 12h12M10 19h4" />
    </svg>
  );
}

const chipBase = 'rounded-full border px-3 py-1.5 font-body text-[12.5px] font-semibold transition-colors duration-brand';
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

  const panel = (
    <>
      <div
        className={`fixed inset-0 z-[1290] ${pos ? 'bg-transparent' : 'bg-black/35'}`}
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
            ? 'max-h-[calc(100vh-110px)] w-[380px] rounded-[20px]'
            : 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-[24px]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border-base px-4 py-3">
          <h2 className="font-body text-[14.5px] font-extrabold text-ink">{en ? 'Filter & Sort' : 'ফিল্টার ও সর্ট'}</h2>
          <div className="flex items-center gap-1">
            {(active > 0 || filters.sort !== 'relevance') && (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="rounded-full px-2.5 py-1 font-body text-[12px] font-bold text-brand-light hover:bg-brand-bg"
              >
                {en ? 'Reset all' : 'সব রিসেট'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={en ? 'Close' : 'বন্ধ করুন'}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
          {/* সর্ট */}
          <section>
            <h3 className="mb-2 font-body text-[12.5px] font-bold text-muted">{en ? 'Sort by' : 'সাজান'}</h3>
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onChange({ ...filters, sort: s.key })}
                  className={`${chipBase} ${filters.sort === s.key ? chipOn : chipOff}`}
                >
                  {en ? s.en : s.bn}
                </button>
              ))}
            </div>
          </section>

          {/* দাম */}
          <section>
            <h3 className="mb-2 font-body text-[12.5px] font-bold text-muted">{en ? 'Price range' : 'দামের রেঞ্জ'}</h3>
            <div className="flex items-center gap-2">
              <label className="flex h-10 flex-1 items-center gap-1 rounded-full border border-border-base bg-white px-3 focus-within:border-brand-light">
                <span className="text-[13px] text-muted">৳</span>
                <input
                  inputMode="numeric"
                  value={minTxt}
                  placeholder={priceBounds ? fmt(priceBounds.min) : (en ? 'Min' : 'সর্বনিম্ন')}
                  onChange={(e) => setMinTxt(e.target.value.replace(/[^\d]/g, '').slice(0, 7))}
                  onBlur={commitPrice}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitPrice(); }}
                  className="w-full min-w-0 bg-transparent text-[13.5px] font-semibold text-ink outline-none"
                  aria-label={en ? 'Minimum price' : 'সর্বনিম্ন দাম'}
                />
              </label>
              <span className="text-muted">–</span>
              <label className="flex h-10 flex-1 items-center gap-1 rounded-full border border-border-base bg-white px-3 focus-within:border-brand-light">
                <span className="text-[13px] text-muted">৳</span>
                <input
                  inputMode="numeric"
                  value={maxTxt}
                  placeholder={priceBounds ? fmt(priceBounds.max) : (en ? 'Max' : 'সর্বোচ্চ')}
                  onChange={(e) => setMaxTxt(e.target.value.replace(/[^\d]/g, '').slice(0, 7))}
                  onBlur={commitPrice}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitPrice(); }}
                  className="w-full min-w-0 bg-transparent text-[13.5px] font-semibold text-ink outline-none"
                  aria-label={en ? 'Maximum price' : 'সর্বোচ্চ দাম'}
                />
              </label>
            </div>
            {presetsToShow.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {presetsToShow.map((p) => {
                  const on = filters.min === p.min && filters.max === p.max;
                  return (
                    <button
                      key={`${p.min}-${p.max}`}
                      type="button"
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
              <h3 className="mb-2 font-body text-[12.5px] font-bold text-muted">{en ? 'Brand' : 'ব্র্যান্ড'}</h3>
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
              className="flex w-full items-center justify-between rounded-[14px] border border-border-base px-3.5 py-2.5 text-left hover:border-brand-light"
            >
              <span className="font-body text-[13.5px] font-semibold text-ink">{en ? 'In stock only' : 'শুধু স্টকে আছে'}</span>
              <span className={`relative h-6 w-11 rounded-full transition-colors duration-brand ${filters.inStock ? 'bg-brand-light' : 'bg-border-base'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-brand ${filters.inStock ? 'left-[22px]' : 'left-0.5'}`} />
              </span>
            </button>
          </section>
        </div>

        <div className="border-t border-border-base bg-white px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={() => { commitPrice(); setOpen(false); }}
            className="w-full rounded-full border-none bg-gradient-to-r from-info to-brand-light py-3 font-body text-[14px] font-bold text-white shadow-sh2"
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

