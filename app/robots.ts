import type { MetadataRoute } from 'next';

const SITE_URL = 'https://vangcur.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/checkout',
          '/checkout/*',
          '/account',
          '/account/*',
          '/reset-password',
          // F16: সার্চ-ফলাফল পেজ ইনডেক্স হয় না (noindex) — ক্রলও বন্ধ, ক্রল-বাজেট বাঁচে
          '/search',
          '/api/*',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
