'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import VangcurLogoMark from '@/app/components/ui/VangcurLogoMark';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';
import {
  DEFAULT_FOOTER,
  fetchFooterSettings,
  subscribeFooterSettings,
} from '@/lib/footerData';
import { sanitizeHref } from '@/lib/security';
import { useT } from '@/lib/i18n/useT';
import type { FooterContact, FooterExtras, FooterLogo } from '@/types';

function computeLogo(raw: FooterLogo | null | undefined): FooterLogo {
  if (raw && raw.mode === 'image' && raw.img) {
    return { mode: 'image', img: raw.img, alt: raw.alt || 'Vangcur Logo', height: raw.height || 42 };
  }
  return {
    mode: 'text',
    main: raw?.main || DEFAULT_FOOTER.logo.main,
    sub: raw?.sub || DEFAULT_FOOTER.logo.sub,
  };
}

function computeContact(
  raw: (Partial<FooterContact> & { phone?: string; wa?: string; email?: string; fb?: string; addr?: string }) | null | undefined
): FooterContact {
  const c = { ...DEFAULT_FOOTER.contact };
  if (!raw) return c;
  if (raw.phone) {
    c.phoneLabel = raw.phone;
    c.phoneHref = sanitizeHref('tel:' + raw.phone.replace(/\D/g, ''));
  }
  if (raw.wa) {
    c.waHref = sanitizeHref('https://wa.me/' + ('88' + raw.wa.replace(/^88/, '').replace(/\D/g, '')));
  }
  if (raw.email) c.email = raw.email;
  if (raw.fb) c.fb = sanitizeHref(raw.fb);
  if (raw.addr) c.addr = raw.addr;
  return c;
}

function computeFooterExtras(
  raw: { desc?: string; copy?: string; fb?: string; ig?: string; tk?: string; yt?: string; wa?: string } | null | undefined
): FooterExtras {
  const social = { ...DEFAULT_FOOTER.social };
  let desc = DEFAULT_FOOTER.desc;
  let copy = DEFAULT_FOOTER.copy;
  if (raw) {
    if (raw.desc) desc = raw.desc;
    if (raw.copy) copy = raw.copy;
    if (raw.fb) social.fb = sanitizeHref(raw.fb);
    if (raw.ig) social.ig = sanitizeHref(raw.ig);
    if (raw.tk) social.tk = sanitizeHref(raw.tk);
    if (raw.yt) social.yt = sanitizeHref(raw.yt);
    if (raw.wa) social.wa = sanitizeHref('https://wa.me/' + raw.wa.replace(/\D/g, ''));
  }
  return { desc, copy, social };
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0 text-brand-light">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-brand-light">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-brand-light">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.6 10.8c1.3 2.6 3.4 4.7 6 6l2-2c.3-.3.7-.4 1-.3 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.9c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.3 0 .7-.3 1l-2 2Z"
      />
    </svg>
  );
}

function FacebookPageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-brand-light">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function UsersGroupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-brand-light">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const colLinkClass =
  'block bg-transparent border-0 p-0 text-left font-body text-[13.5px] font-medium text-slate-700 no-underline transition-colors hover:text-brand-light cursor-pointer leading-snug';

export default function Footer() {
  const { t, lang } = useT();
  const currentUser = useAuthStore((s) => s.currentUser);
  const supabase = useMemo(() => createClient(), []);
  const [logo, setLogo] = useState<FooterLogo>(computeLogo(null));

  const [contact, setContact] = useState<FooterContact>(DEFAULT_FOOTER.contact);
  const [extras, setExtras] = useState<FooterExtras>({
    desc: DEFAULT_FOOTER.desc,
    copy: DEFAULT_FOOTER.copy,
    social: DEFAULT_FOOTER.social,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const settings = await fetchFooterSettings(supabase);
      if (cancelled) return;

      if (settings.vc_logo) setLogo(computeLogo(settings.vc_logo));
      if (settings.vc_contact) setContact(computeContact(settings.vc_contact));
      if (settings.vc_footer) setExtras(computeFooterExtras(settings.vc_footer));
    })();

    const channel = subscribeFooterSettings(supabase, (key, val) => {
      if (key === 'vc_logo') setLogo(computeLogo(val as FooterLogo));
      if (key === 'vc_contact') setContact(computeContact(val as Partial<FooterContact>));
    });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToCategories = () => document.getElementById('catCardsGrid')?.scrollIntoView({ behavior: 'smooth' });

  const fbGroupLink = 'https://facebook.com/groups/vangcurgadgets';

  return (
    <footer className="relative mt-12 overflow-hidden">
      {/* 🌊 শীর্ষভাগে ট্রু ট্রান্সপারেন্ট ক্লিপ-পাথ ভেক্টর ডেফিনিশন (SVG Defs) */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          {/* মোবাইল ডিভাইসে উচ্চতায় স্লিক ও হালকা কাটআউট */}
          <clipPath id="footer-top-wave-clip-mobile" clipPathUnits="objectBoundingBox">
            <path d="M 0,0.020 C 0.14,0.010 0.24,0.006 0.35,0.006 C 0.52,0.006 0.65,0.028 0.78,0.028 C 0.88,0.028 0.94,0.022 1,0.018 L 1,1 L 0,1 Z" />
          </clipPath>
          {/* ডেস্কটপ ডিভাইসে উচ্চতায় স্লিক ও হালকা কাটআউট */}
          <clipPath id="footer-top-wave-clip-desktop" clipPathUnits="objectBoundingBox">
            <path d="M 0,0.014 C 0.14,0.007 0.24,0.004 0.35,0.004 C 0.52,0.004 0.65,0.020 0.78,0.020 C 0.88,0.020 0.94,0.016 1,0.012 L 1,1 L 0,1 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* ইলাস্ট্রেশন ছবি ও পারফেক্ট কাটআউট আর্কিটেকচার */}
      <div className="relative w-full select-none pointer-events-none bg-transparent">
        
        {/* মোবাইল ইমেজ (লম্বা কম্পোজিশন) */}
        <div
          className="relative aspect-[20/27] w-full overflow-hidden md:hidden"
          style={{
            clipPath: 'url(#footer-top-wave-clip-mobile)',
            WebkitClipPath: 'url(#footer-top-wave-clip-mobile)',
            transform: 'translateZ(0)',
          }}
        >
          <Image
            src="/footer-illustration-mobile.webp"
            alt="Vangcur Gadgets Lifestyle"
            fill
            sizes="100vw"
            className="object-cover object-bottom"
            priority={false}
          />

          {/* 🌊 ছবির মাথার কাটিং এজের ঠিক ওপরে ১০০% লক করা ওয়াটার রিবন ও ক্রেস্ট */}
          <svg
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            className="absolute inset-0 z-10 h-full w-full pointer-events-none"
          >
            <path
              d="M 0,0.020 C 0.14,0.010 0.24,0.006 0.35,0.006 C 0.52,0.006 0.65,0.028 0.78,0.028 C 0.88,0.028 0.94,0.022 1,0.018 L 1,0.026 C 0.94,0.030 0.88,0.036 0.78,0.036 C 0.65,0.036 0.52,0.014 0.35,0.014 C 0.24,0.014 0.14,0.018 0,0.028 Z"
              fill="#38BDF8"
              fillOpacity="0.30"
              className="dark:fill-[#38BDF8] dark:fill-opacity-25"
            />
            <path
              d="M 0,0.020 C 0.14,0.010 0.24,0.006 0.35,0.006 C 0.52,0.006 0.65,0.028 0.78,0.028 C 0.88,0.028 0.94,0.022 1,0.018"
              fill="none"
              stroke="#E0F2FE"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeOpacity="0.85"
              strokeLinecap="round"
              className="dark:stroke-[#7DD3FC] dark:stroke-opacity-60"
            />
          </svg>
        </div>

        {/* ডেস্কটপ ইমেজ (চওড়া কম্পোজিশন) */}
        <div
          className="relative hidden aspect-[2000/1333] w-full overflow-hidden md:block"
          style={{
            clipPath: 'url(#footer-top-wave-clip-desktop)',
            WebkitClipPath: 'url(#footer-top-wave-clip-desktop)',
            transform: 'translateZ(0)',
          }}
        >
          <Image
            src="/footer-illustration-desktop.webp"
            alt="Vangcur Gadgets Lifestyle"
            fill
            sizes="100vw"
            className="object-cover object-bottom"
            priority={false}
          />

          {/* 🌊 ডেস্কটপে ছবির মাথার কাটিং এজের ঠিক ওপরে ১০০% লক করা ওয়াটার রিবন ও ক্রেস্ট */}
          <svg
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            className="absolute inset-0 z-10 h-full w-full pointer-events-none"
          >
            <path
              d="M 0,0.014 C 0.14,0.007 0.24,0.004 0.35,0.004 C 0.52,0.004 0.65,0.020 0.78,0.020 C 0.88,0.020 0.94,0.016 1,0.012 L 1,0.020 C 0.94,0.023 0.88,0.027 0.78,0.027 C 0.65,0.027 0.52,0.011 0.35,0.011 C 0.24,0.011 0.14,0.014 0,0.021 Z"
              fill="#38BDF8"
              fillOpacity="0.30"
              className="dark:fill-[#38BDF8] dark:fill-opacity-25"
            />
            <path
              d="M 0,0.014 C 0.14,0.007 0.24,0.004 0.35,0.004 C 0.52,0.004 0.65,0.020 0.78,0.020 C 0.88,0.020 0.94,0.016 1,0.012"
              fill="none"
              stroke="#E0F2FE"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeOpacity="0.85"
              strokeLinecap="round"
              className="dark:stroke-[#7DD3FC] dark:stroke-opacity-60"
            />
          </svg>
        </div>

        {/* 🌊 ২. নিচের নিখুঁত কাটআউট ঢেউ */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 w-full overflow-hidden leading-none pointer-events-none"
          style={{ transform: 'translate3d(0, 1px, 0)' }}
        >
          <svg
            viewBox="0 0 1440 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-12 sm:h-20 md:h-28"
            preserveAspectRatio="none"
            shapeRendering="geometricPrecision"
          >
            <path
              d="M0,110 C120,85 180,75 280,75 C420,75 580,142 760,142 C960,142 1120,88 1260,88 C1340,88 1390,96 1440,105 L1440,160 L0,160 Z"
              fill="#D3E7FC"
              className="dark:fill-[#0F172A]"
            />
          </svg>
        </div>
      </div>

      {/* ফুটার কনটেন্ট গ্রিড */}
      <div className="bg-[#D3E7FC] px-5 pb-8 pt-6 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-[1300px] grid-cols-2 gap-x-6 gap-y-9 sm:gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:gap-12 pb-6">
          {/* কলাম ১: লোগো, ট্যাগলাইন ও সোশ্যাল আইকনসমূহ */}
          <div className="col-span-2 sm:col-span-1 flex flex-col items-center sm:items-start text-center sm:text-left">
            <Link href="/" className="mb-2 inline-block">
              <VangcurLogoMark
                aria-label="Vangcur Gadgets"
                className="h-8 sm:h-9 w-auto select-none text-brand-light"
              />
            </Link>

            <p className="font-body text-[12px] font-bold uppercase tracking-[1.5px] text-brand-light mb-4">
              Your First Choice For Gadgets
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <a
                href={extras.social.fb}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-white shadow-xs transition hover:scale-110 hover:bg-brand-light-hover active:scale-95"
              >
                <FacebookIcon />
              </a>

              <a
                href={extras.social.ig}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-white shadow-xs transition hover:scale-110 hover:bg-brand-light-hover active:scale-95"
              >
                <InstagramIcon />
              </a>

              <a
                href={extras.social.tk}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-white shadow-xs transition hover:scale-110 hover:bg-brand-light-hover active:scale-95"
              >
                <TikTokIcon />
              </a>

              <a
                href={extras.social.wa}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-white shadow-xs transition hover:scale-110 hover:bg-brand-light-hover active:scale-95"
              >
                <WhatsAppIcon />
              </a>

              <a
                href={extras.social.yt}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-white shadow-xs transition hover:scale-110 hover:bg-brand-light-hover active:scale-95"
              >
                <YouTubeIcon />
              </a>
            </div>
          </div>

          {/* কলাম ২: গ্রাহক সেবা (Customer Care) */}
          <div>
            <h3 className="mb-4 font-body text-[13px] font-extrabold uppercase tracking-wider text-brand-light">
              {lang === 'en' ? 'Customer Care' : 'গ্রাহক সেবা'}
            </h3>
            <ul className="space-y-3 font-body text-[13.5px]">
              <li>
                <Link href="/guide" className={colLinkClass}>
                  {lang === 'en' ? 'User Guide & Help' : 'ইউজার গাইড ও সহায়িকা'}
                </Link>
              </li>
              <li>
                <Link href="/shipping" className={colLinkClass}>
                  {lang === 'en' ? 'Order & Shipping Info' : 'অর্ডার ও শিপিং তথ্য'}
                </Link>
              </li>
              <li>
                <Link href="/warranty" className={colLinkClass}>
                  {lang === 'en' ? 'Warranty Terms' : 'ওয়ারেন্টি নীতিমালা'}
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className={colLinkClass}>
                  {lang === 'en' ? 'Returns & Refunds' : 'রিটার্ন ও রিফান্ড পলিসি'}
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className={colLinkClass}>
                  {lang === 'en' ? 'Privacy Policy' : 'প্রাইভেসি পলিসি'}
                </Link>
              </li>
              <li>
                <Link href="/terms" className={colLinkClass}>
                  {lang === 'en' ? 'Terms & Conditions' : 'শর্তাবলী'}
                </Link>
              </li>
            </ul>
          </div>

          {/* কলাম ৩: কুইক লিঙ্কস */}
          <div>
            <h3 className="mb-4 font-body text-[13px] font-extrabold uppercase tracking-wider text-brand-light">
              {t('কুইক লিঙ্কস')}
            </h3>
            <ul className="space-y-3 font-body text-[13.5px]">
              <li>
                <button className={colLinkClass} onClick={scrollTop}>
                  {t('হোম')}
                </button>
              </li>
              <li>
                <button className={colLinkClass} onClick={scrollToCategories}>
                  {t('ক্যাটাগরি')}
                </button>
              </li>
              {currentUser ? (
                <>
                  <li>
                    <Link href="/account" className={colLinkClass}>
                      {t('মাই প্রোফাইল')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/account?open=membership" className={colLinkClass}>
                      {t('মেম্বারশিপ')}
                    </Link>
                  </li>
                </>
              ) : (
                <li>
                  <Link href="/account" className={colLinkClass}>
                    {t('লগইন')}
                  </Link>
                </li>
              )}
              <li>
                <Link href="/track-order" className={colLinkClass}>
                  {t('ট্র্যাক অর্ডার')}
                </Link>
              </li>
              <li>
                <Link
                  href="/offers"
                  className={`${colLinkClass} font-bold text-amber-700 hover:text-amber-800`}
                >
                  {lang === 'en' ? 'Current Offers' : 'চলতি অফারসমূহ'}
                </Link>
              </li>
            </ul>
          </div>

          {/* কলাম ৪: যোগাযোগ */}
          <div className="col-span-2 sm:col-span-1">
            <h3 className="mb-4 font-body text-[13px] font-extrabold uppercase tracking-wider text-brand-light">
              {lang === 'en' ? 'Contact Us' : 'যোগাযোগ'}
            </h3>

            <ul className="space-y-3 font-body text-[13.5px] text-slate-700">
              <li>
                <a href={contact.phoneHref} className="flex items-center gap-2 transition hover:text-brand-light font-medium">
                  <PhoneIcon />
                  <span>{contact.phoneLabel}</span>
                </a>
              </li>

              <li>
                <a href={contact.fb} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition hover:text-brand-light font-medium">
                  <FacebookPageIcon />
                  <span>{lang === 'en' ? 'Facebook Page' : 'ফেসবুক পেজ'}</span>
                </a>
              </li>

              <li>
                <a href={fbGroupLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition hover:text-brand-light font-medium">
                  <UsersGroupIcon />
                  <span>{lang === 'en' ? 'Facebook Group' : 'ফেসবুক গ্রুপ'}</span>
                </a>
              </li>

              <li>
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 transition hover:text-brand-light font-medium">
                  <MailIcon />
                  <span>{contact.email}</span>
                </a>
              </li>

              <li className="flex items-start gap-2">
                <PinIcon />
                <span>{contact.addr}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* বটম কপিরাইট বার */}
        <div className="mx-auto mt-8 max-w-[1300px] border-t border-blue-200/80 pt-6 text-center font-body text-xs font-semibold text-slate-600">
          {t(extras.copy)}
        </div>
      </div>
    </footer>
  );
}
