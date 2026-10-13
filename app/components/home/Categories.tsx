'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  DEFAULT_CATEGORIES, CATEGORY_FILTER_EVENT, brandifyCategoryIcon,
} from '@/lib/categoryData';
import { sanitizeSvgHtml } from '@/lib/sanitize';
import { useT } from '@/lib/i18n/useT';
import type { Category } from '@/types';

function CatIcon({ icon }: { icon?: string }) {
  const isSvg = typeof icon === 'string' && icon.trim().startsWith('<svg');
  if (isSvg) {
    return (
      <span
        className="vc-cat-icon flex h-[30px] w-[30px] shrink-0 items-center justify-center [&_svg]:!h-[30px] [&_svg]:!w-[30px] md:h-[34px] md:w-[34px] md:[&_svg]:!h-[34px] md:[&_svg]:!w-[34px]"
        dangerouslySetInnerHTML={{ __html: sanitizeSvgHtml(brandifyCategoryIcon(icon)) }}
      />
    );
  }
  return <span className="text-2xl leading-none">{icon || '📦'}</span>;
}

interface CategoriesProps {
  initialCategories?: Category[];
}

export default function Categories({ initialCategories }: CategoriesProps) {
  const { lang } = useT();
  const [cats] = useState<Category[]>(
    initialCategories && initialCategories.length ? initialCategories : DEFAULT_CATEGORIES
  );
  const [catPage, setCatPage] = useState(0);
  const [perPage, setPerPage] = useState(4);

  const viewportRef = useRef<HTMLDivElement>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const btnResetTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const touchRef = useRef({ x: 0, y: 0 });

  const maxPage = Math.max(0, Math.ceil(cats.length / perPage) - 1);

  const applyResponsive = useCallback(() => {
    if (typeof window === 'undefined') return;
    const width = window.innerWidth;
    const pp = width <= 768 ? 4 : 8;
    setPerPage(pp);
    setCatPage((p) => {
      const nextMax = Math.max(0, Math.ceil(cats.length / pp) - 1);
      return Math.max(0, Math.min(p, nextMax));
    });
  }, [cats.length]);

  useEffect(() => {
    applyResponsive();
    window.addEventListener('resize', applyResponsive);
    return () => window.removeEventListener('resize', applyResponsive);
  }, [applyResponsive]);

  const slide = (dir: number, btnKey: 'prev' | 'next') => {
    setCatPage((p) => {
      let next = p + dir;
      if (next > maxPage) next = 0;
      if (next < 0) next = maxPage;
      return next;
    });

    const btn = btnKey === 'prev' ? prevBtnRef.current : nextBtnRef.current;
    if (btn) {
      btn.classList.add('scale-95', 'bg-brand-light', 'text-white', 'border-brand-light');
      clearTimeout(btnResetTimerRef.current[btnKey]);
      btnResetTimerRef.current[btnKey] = setTimeout(() => {
        btn?.classList.remove('scale-95', 'bg-brand-light', 'text-white', 'border-brand-light');
      }, 350);
    }
  };

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onTouchStart = (e: TouchEvent) => {
      touchRef.current.x = e.touches[0].clientX;
      touchRef.current.y = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchRef.current.x;
      const dy = e.changedTouches[0].clientY - touchRef.current.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 36) {
        slide(dx < 0 ? 1 : -1, dx < 0 ? 'next' : 'prev');
      }
    };
    vp.addEventListener('touchstart', onTouchStart, { passive: true });
    vp.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      vp.removeEventListener('touchstart', onTouchStart);
      vp.removeEventListener('touchend', onTouchEnd);
    };
  }, [maxPage]);

  const handleSelect = (catId: string) => {
    try {
      const url = catId === 'all' ? '/' : `/?cat=${encodeURIComponent(catId)}`;
      window.history.replaceState({ homeCurrent: true, vcCat: catId }, '', url);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent(CATEGORY_FILTER_EVENT, { detail: { catId } }));

    const prodSec = document.getElementById('prodSec');
    if (prodSec) {
      const navbarOffset = 85;
      const targetY = prodSec.getBoundingClientRect().top + window.scrollY - navbarOffset;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  const currentCategories = useMemo(() => {
    const start = catPage * perPage;
    return cats.slice(start, start + perPage);
  }, [cats, catPage, perPage]);

  const pageCount = maxPage + 1;

  return (
    <div className="mx-auto mb-11 min-h-[140px] max-w-[1300px] overflow-hidden px-3.5 sm:px-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="border-l-[3px] border-brand-light pl-3 text-lg font-bold sm:text-xl text-ink">
          {lang === 'en' ? (
            <>All <span className="text-brand-light">Categories</span></>
          ) : (
            <>ক্যাটাগরি <span className="text-brand-light">সমূহ</span></>
          )}
        </h2>
      </div>

      <div className="relative px-8 sm:px-[38px] md:px-[44px]">
        <button
          ref={prevBtnRef}
          className="absolute left-0 top-1/2 z-[5] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-2 border-border-base bg-white text-base font-bold leading-none text-brand-light shadow-sh1 transition-brand hover:border-brand-light hover:bg-brand-light hover:text-white md:h-9 md:w-9 md:text-xl"
          onClick={() => slide(-1, 'prev')}
          aria-label="Previous Category"
        >
          &#8249;
        </button>

        <div className="touch-pan-y overflow-hidden py-1" ref={viewportRef}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {currentCategories.map((cat) => (
              <div
                key={cat.id}
                className="group flex min-h-[58px] cursor-pointer items-center gap-2 rounded-2xl border-[1.5px] border-brand-light/25 bg-white p-2 shadow-sh1 transition-brand hover:-translate-y-0.5 hover:border-brand-light hover:shadow-[0_8px_22px_rgba(68,167,252,.28)] md:min-h-[66px] md:gap-3 md:p-3 active:scale-98"
                onClick={() => handleSelect(cat.id)}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-light/30 bg-[#EAF4FF] shadow-[0_2px_8px_rgba(68,167,252,.16)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:border-brand-light/60 group-hover:bg-[#DCEEFF] dark:border-[#2C4670] dark:bg-[#1A2A47] dark:shadow-[0_2px_10px_rgba(0,0,0,.35)] dark:group-hover:border-[#4C7BB8] dark:group-hover:bg-[#223758] md:h-[52px] md:w-[52px]">
                  <CatIcon icon={cat.icon} />
                </div>
                <div className="line-clamp-2 min-w-0 flex-1 font-body text-xs font-bold leading-[1.3] text-black dark:text-[#F8FAFC] md:text-[13px]">
                  {cat.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          ref={nextBtnRef}
          className="absolute right-0 top-1/2 z-[5] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-2 border-border-base bg-white text-base font-bold leading-none text-brand-light shadow-sh1 transition-brand hover:border-brand-light hover:bg-brand-light hover:text-white md:h-9 md:w-9 md:text-xl"
          onClick={() => slide(1, 'next')}
          aria-label="Next Category"
        >
          &#8250;
        </button>
      </div>

      <div className="mt-3.5 flex justify-center gap-1.5">
        {Array.from({ length: pageCount }).map((_, p) => (
          <button
            type="button"
            key={p}
            aria-label={`Go to category page ${p + 1}`}
            className={`h-1.5 cursor-pointer rounded-full transition-all duration-300 ${
              p === catPage ? 'w-5 bg-brand-light' : 'w-1.5 bg-border-base'
            }`}
            onClick={() => setCatPage(p)}
          />
        ))}
      </div>
    </div>
  );
}
