import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { preload } from 'react-dom';
import './globals.css';
import { dmSans, hindSiliguri } from './fonts';
import GlobalOverlays from './components/GlobalOverlays';
import StaleTabReload from './components/StaleTabReload';
import StaleSessionReload from './components/StaleSessionReload';
import ProductNavOverlay from './components/ProductNavOverlay';
import Analytics from './components/Analytics';
import { getServerLang } from '@/lib/i18n/getServerLang';

const SITE_URL = 'https://vangcur.com';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang();
  const title = 'Vangcur';
  const description = lang === 'en'
    ? 'Vangcur — Gadgets, RGB Lights, Crystal Items & Accessories'
    : 'ভাঙচুর — গ্যাজেট, RGB লাইট, ক্রিস্টাল আইটেম ও অ্যাক্সেসরিজ';

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: '%s | Vangcur',
    },
    description,
    icons: {
      icon: '/icon-192.png',
      shortcut: '/icon-192.png',
      apple: '/apple-touch-icon.png',
    },
    openGraph: {
      type: 'website',
      url: SITE_URL,
      title,
      description,
      siteName: 'Vangcur',
      images: [{ url: '/vangcur-logo.png', width: 991, height: 365, alt: 'Vangcur' }],
      locale: lang === 'en' ? 'en_US' : 'bn_BD',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/vangcur-logo.png'],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getServerLang();
  // বাংলা সংখ্যার (০-৯) ফন্ট নিজের সার্ভারে (৩.৮ KB) — আগে Google Fonts থেকে দুই ধাপে আসত
  // (preconnect → css → woff2) এবং JS দিয়ে দেরিতে সক্রিয় হতো। এখন @font-face (globals.css) আর এই
  // preload একসাথে: ডিজিট প্রথম পেইন্টেই সঠিক ফন্টে আসে। `preload()` (react-dom) <head> এর শুরুতে
  // একটাই লিংক বসায়; JSX এ <link rel="preload"> লিখলে React সেটা দুবার (hoist + জায়গামতো) দেয়।
  preload('/fonts/noto-sans-bengali-digits-v1.woff2', {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  });
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  let supabaseOrigin: string | null = null;
  try {
    supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : null;
  } catch {
    supabaseOrigin = null;
  }

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${dmSans.variable} ${hindSiliguri.variable}`}
    >
      <head>
        <Script
          id="theme-flicker-guard"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='vc_theme',t=null;var u=null;try{u=window.localStorage.getItem('vc_user');}catch(e){}if(u&&u!=='null'){var m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)'));if(m)t=decodeURIComponent(m[1]);if(t!=='dark'&&t!=='light'){try{t=window.localStorage.getItem(k);}catch(e){}}}if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {/* 🐢 পারফরম্যান্স ফিক্স (audit): PageSpeed নিজেই এই preconnect suggest করেছিল
            (~310ms LCP savings) — About/Footer সেকশনের Realtime সাবস্ক্রিপশন ও
            বিভিন্ন ক্লায়েন্ট কম্পোনেন্ট সরাসরি ব্রাউজার থেকে Supabase-এ কানেক্ট করে,
            এতদিন তার জন্য আলাদা preconnect ছিল না। */}
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
        {/* 🐢 পারফরম্যান্স ফিক্স (PageSpeed অডিট): GTM (gtm.js, 176.8 KiB — সবচেয়ে বড়
            একক স্ক্রিপ্ট) আগে এখানে afterInteractive দিয়ে সরাসরি লোড হতো, কোনো
            deferral ছাড়াই। এখন এটা GA4/Clarity/Meta Pixel-এর মতোই Analytics.tsx-এ
            সরিয়ে একই idle/interaction-deferred loader ব্যবহার করে — dataLayer আগে
            থেকেই lib/analytics.ts-এর pushToDataLayer() নিজে window.dataLayer = []
            দিয়ে initialize করে, তাই GTM দেরিতে লোড হলেও আগে পুশ করা ইভেন্টগুলো
            হারায় না (GTM লোড হওয়ার সময় বিদ্যমান dataLayer array প্রসেস করে —
            standard lazy-GTM প্যাটার্ন)। */}
      </head>
      <body className="min-h-screen bg-white font-body text-ink antialiased dark:bg-[#0B111E] dark:text-[#F8FAFC]">
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white dark:from-[#090D16] dark:via-[#0F172A] dark:to-[#0B0F19]"
        />
        {children}
        <Analytics />
        <StaleTabReload />
        <StaleSessionReload />
        <ProductNavOverlay />
        <GlobalOverlays />
      </body>
    </html>
  );
}
