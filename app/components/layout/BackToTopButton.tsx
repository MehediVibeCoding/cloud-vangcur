'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useT } from '@/lib/i18n/useT';

export default function BackToTopButton() {
  const { t } = useT();
  const [visible, setVisible] = useState(false);
  const tickingRef = useRef(false);

  useEffect(() => {
    const check = () => {
      tickingRef.current = false;
      const isMobile = window.innerWidth <= 768;
      const threshold = isMobile ? 600 : 850;
      const shouldShow = window.scrollY > threshold;
      setVisible((prev) => (prev !== shouldShow ? shouldShow : prev));
    };

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(check);
    };

    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          whileTap={{ scale: 0.88 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title={t('উপরে যান')}
          aria-label={t('উপরে যান')}
          className="fixed bottom-[164px] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-white shadow-sh3 transition-colors duration-brand hover:bg-brand-light-hover focus-visible:outline-none"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
