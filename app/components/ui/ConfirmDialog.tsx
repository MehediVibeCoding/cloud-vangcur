'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { registerDialogHost, type DialogRequest } from '@/lib/confirm';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import { useHistoryModal } from '@/lib/useHistoryModal';
import { useT } from '@/lib/i18n/useT';

const lineIcon = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function IconTrash() {
  return (
    <svg {...lineIcon} aria-hidden="true">
      <path d="M3.5 6.5h17" />
      <path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8v1.7" />
      <path d="M6 6.5l.9 12.3a1.8 1.8 0 0 0 1.8 1.7h6.6a1.8 1.8 0 0 0 1.8-1.7L18 6.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </svg>
  );
}

function IconFlag() {
  return (
    <svg {...lineIcon} aria-hidden="true">
      <path d="M5 21V4" />
      <path d="M5 4.5c2.6-1.6 4.6 1.6 7.4 0 1.9-1.1 3.6-.9 5.1-.2v8.4c-1.5-.7-3.2-.9-5.1.2-2.8 1.6-4.8-1.6-7.4 0" />
    </svg>
  );
}

function IconQuestion() {
  return (
    <svg {...lineIcon} aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.7" />
      <path d="M12 17.1h.01" />
    </svg>
  );
}

/**
 * কাস্টম কনফার্ম/প্রম্পট ডায়ালগ হোস্ট — ব্রাউজারের ডিফল্ট confirm/prompt-এর বদলে।
 * GlobalOverlays-এ একবার মাউন্ট করা থাকে; `confirmDialog()` / `promptDialog()` (lib/confirm.ts) এটাকে খোলে।
 * • ট্রাই-কালার ক্যানভাস, গোল কোণা, ড্যাঙ্গার হলে লাল আইকন ও বাটন
 * • বাংলা/ইংরেজি — টেক্সট কলার থেকে আসে, ডিফল্ট বাটন লেবেল ভাষা অনুযায়ী
 * • Esc / পেছনে ক্লিক / মোবাইলের ব্যাক বাটন = বাতিল; একসাথে একাধিক অনুরোধ এলে সারিতে একটা একটা করে
 */
export default function ConfirmDialog() {
  const { t } = useT();
  const [current, setCurrent] = useState<DialogRequest | null>(null);
  const [text, setText] = useState('');
  const queueRef = useRef<DialogRequest[]>([]);
  const currentRef = useRef<DialogRequest | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  const showNext = useCallback((req: DialogRequest | null) => {
    currentRef.current = req;
    setCurrent(req);
    setText(req && req.kind === 'prompt' ? req.opts.defaultValue || '' : '');
  }, []);

  useEffect(() => {
    return registerDialogHost((req) => {
      if (currentRef.current) queueRef.current.push(req);
      else showNext(req);
    });
  }, [showNext]);

  const finish = useCallback((accepted: boolean) => {
    const req = currentRef.current;
    if (!req) return;
    if (req.kind === 'confirm') req.resolve(accepted);
    else req.resolve(accepted ? (textRef.current?.value ?? '') : null);
    showNext(queueRef.current.shift() || null);
  }, [showNext]);

  const cancel = useCallback(() => finish(false), [finish]);
  const accept = useCallback(() => finish(true), [finish]);

  const isOpen = current !== null;
  useHistoryModal(isOpen, cancel, 'confirm-dialog');

  useEffect(() => {
    if (!isOpen) return undefined;
    lockBody();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        cancel();
      } else if (e.key === 'Enter' && currentRef.current?.kind === 'confirm') {
        e.preventDefault();
        accept();
      }
    };
    window.addEventListener('keydown', onKey, true);
    const f = window.setTimeout(() => {
      if (currentRef.current?.kind === 'prompt') {
        textRef.current?.focus();
        textRef.current?.select();
      } else {
        cancelBtnRef.current?.focus();
      }
    }, 60);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.clearTimeout(f);
      unlockBody();
    };
  }, [isOpen, accept, cancel]);

  if (!current || typeof document === 'undefined') return null;

  const { opts } = current;
  const danger = (opts.tone ?? (current.kind === 'prompt' ? 'danger' : 'default')) === 'danger';
  const isPrompt = current.kind === 'prompt';
  const confirmLabel = opts.confirmText || (danger ? t('মুছে ফেলুন') : t('ঠিক আছে'));
  const cancelLabel = opts.cancelText || t('বাতিল');

  return createPortal(
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-ink/55 p-4 backdrop-blur-[3px] animate-soft-fade-in"
      onClick={cancel}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="vc-confirm-title"
      aria-describedby="vc-confirm-msg"
    >
      <div
        className="relative w-full max-w-[360px] overflow-hidden rounded-[24px] bg-white p-5 text-center shadow-sh3 ring-1 ring-white/80 animate-section-reveal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-bg/35 via-[#DCEBFD]/45 to-white" aria-hidden="true" />

        <div className="relative">
          <div
            className={`mx-auto mb-3.5 mt-1 flex h-14 w-14 items-center justify-center rounded-full border bg-white shadow-xs ${
              danger ? 'border-red-200 text-red-500' : 'border-brand-light/35 text-brand-light'
            }`}
          >
            {isPrompt ? <IconFlag /> : danger ? <IconTrash /> : <IconQuestion />}
          </div>

          {opts.title && (
            <h3 id="vc-confirm-title" className="mb-1.5 font-body text-[17px] font-extrabold text-ink">
              {opts.title}
            </h3>
          )}
          <p id="vc-confirm-msg" className="font-body text-[13px] leading-[1.7] text-ink/80">
            {opts.message}
          </p>

          {isPrompt && (
            <textarea
              ref={textRef}
              value={text}
              rows={3}
              maxLength={current.opts.maxLength ?? 200}
              onChange={(e) => setText(e.target.value)}
              placeholder={current.opts.placeholder || ''}
              className="mt-3.5 w-full resize-none rounded-[14px] border-[1.5px] border-border-base bg-white px-3.5 py-2.5 text-left font-body text-[14px] text-ink outline-none transition-brand duration-brand focus:border-brand-light"
            />
          )}

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={cancel}
              className="rounded-full border-[1.5px] border-brand-light/40 bg-white py-[12px] font-body text-[14px] font-bold text-ink transition-colors duration-brand hover:border-brand-light active:scale-[0.97]"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={accept}
              className={`rounded-full py-[12px] font-body text-[14px] font-bold text-white transition-[filter] duration-brand hover:brightness-[1.04] active:scale-[0.97] ${
                danger
                  ? 'bg-gradient-to-r from-rose-500 to-red-500 shadow-sh2'
                  : 'bg-gradient-to-r from-info to-brand-light shadow-sh2'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
