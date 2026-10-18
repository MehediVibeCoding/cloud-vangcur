import { slidingWindowLimit, getClientIp } from '@/lib/limiter';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// 🛡️ ক্ষতিকর বট ও ভালনারেবিলিটি স্ক্যানার পাথ (সার্ভার ছোঁয়ার আগেই Edge-এ ব্লক)
const MALICIOUS_PROBE_REGEX = /\/(?:\.env|\.git|wp-admin|wp-login|xmlrpc|phpmyadmin|\.aws|eval-stdin|composer\.(?:json|lock)|package-lock\.json)/i;

// 🌐 পরিচিত সার্চ-ইঞ্জিন/ক্রলার — এদের শুধু "পেজ" রেট-লিমিট থেকে ছাড় দেওয়া হয়
const KNOWN_SEARCH_BOT_UA_REGEX = /googlebot|bingbot|applebot|duckduckbot|yandexbot|baiduspider|slurp/i;

const AUTH_REFRESH_PATH_PREFIXES = ['/checkout', '/account', '/api/'];

// 🔒 ফিক্স (H4): আগে প্রতিটা /api/* রিকোয়েস্টেই Upstash Redis-এ একটা sliding-window চেক
// (রিড+রাইট) হতো — এমনকি এই নিচের রুটগুলোতেও, যেগুলো পাবলিক না, নিজস্ব সিক্রেট-কি/ওয়েবহুক-
// সিগনেচার দিয়ে আগে থেকেই সুরক্ষিত (শুধু bKash, Vercel cron, Supabase DB webhook কল করে)।
// এগুলোতে Redis-কল এখন স্কিপ — বাকি এজ-মেমোরি রেট-লিমিট (checkEdgeRateLimit) তবুও চলে,
// তাই পুরোপুরি খোলা থাকছে না, শুধু প্রতি কলে Redis-খরচ বাদ যাচ্ছে।
const INTERNAL_SECRET_PROTECTED_API_PATHS = [
  '/api/bkash-webhook',
  '/api/bkash-unmatched-alert',
  '/api/revalidate-catalog',
  '/api/revalidate-guide',
  '/api/sla-alert',
  '/api/indexnow',
  '/api/order-email',
];

// 🆕 পাবলিক, সেশন-নিরপেক্ষ, ক্যাশ-করা ডেটার API — এগুলো লগইন/কুকি ব্যবহার করে না, তাই লগইন-করা
// ইউজারের প্রতিটি কলে Supabase Auth-এ `getUser()` রাউন্ড-ট্রিপ (updateSession) অযথা। রেট-লিমিট
// (Redis + এজ-মেমরি) আগের মতোই প্রযোজ্য — শুধু সেশন-রিফ্রেশ স্কিপ।
const SESSIONLESS_PUBLIC_API_PATHS = ['/api/live-products', '/api/search-index'];

function needsAuthRefresh(pathname: string): boolean {
  if (SESSIONLESS_PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return AUTH_REFRESH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}

// 🛡️ এজ মেমোরি রেট লিমিট কনফিগ
const RATE_LIMIT_WINDOW_MS = 10 * 1000; // ১০ সেকেন্ডের উইন্ডো
const MAX_API_REQUESTS = 30;            // API রুটে ১০ সেকেন্ডে সর্বোচ্চ ৩০টি রিকোয়েস্ট
const MAX_PAGE_REQUESTS = 120;          // সাধারণ পেজে ১০ সেকেন্ডে সর্বোচ্চ ১২০টি রিকোয়েস্ট

const edgeRequestTracker = new Map<string, { count: number; resetAt: number }>();

function checkEdgeRateLimit(ip: string, isApiRoute: boolean): boolean {
  const now = Date.now();
  const limit = isApiRoute ? MAX_API_REQUESTS : MAX_PAGE_REQUESTS;
  const key = `${ip}:${isApiRoute ? 'api' : 'page'}`;

  // মেমোরি নিয়মিত পরিষ্কার রাখা
  if (edgeRequestTracker.size > 8000) {
    for (const [k, v] of edgeRequestTracker.entries()) {
      if (now > v.resetAt) edgeRequestTracker.delete(k);
    }
  }

  const record = edgeRequestTracker.get(key);

  if (!record || now > record.resetAt) {
    edgeRequestTracker.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ১. ক্ষতিকর বট স্ক্যানার ড্রপ
  if (MALICIOUS_PROBE_REGEX.test(pathname)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // ২. ক্লায়েন্ট আইপি এক্সট্র্যাক্ট (শেয়ার্ড ফাংশন, C5 ফিক্স) ও এজ রেট লিমিট যাচাই
  const clientIp = getClientIp(request.headers);
  const isApiRoute = pathname.startsWith('/api/');

  const userAgent = request.headers.get('user-agent') || '';
  const isKnownSearchBot = KNOWN_SEARCH_BOT_UA_REGEX.test(userAgent);
  const shouldSkipRateLimit = isKnownSearchBot && !isApiRoute;

  const isInternalSecretProtectedApi =
    isApiRoute && INTERNAL_SECRET_PROTECTED_API_PATHS.some((p) => pathname.startsWith(p));

  if (!shouldSkipRateLimit) {
    let blocked = false;
    let retryAfter = 10;
    if (isApiRoute && !isInternalSecretProtectedApi) {
      const rl = await slidingWindowLimit(`mw:api:${clientIp}`, MAX_API_REQUESTS, RATE_LIMIT_WINDOW_MS / 1000);
      blocked = !rl.allowed;
      retryAfter = rl.retryAfterSec || 10;
    } else if (isInternalSecretProtectedApi) {
      // সিক্রেট-সুরক্ষিত internal রুট — মেমোরি-ফলব্যাকই যথেষ্ট, Redis খরচ লাগবে না (H4)
      blocked = !checkEdgeRateLimit(clientIp, true);
    } else {
      // 🔒 ফিক্স (C3): আগে পেজ-রিকোয়েস্টের লিমিট শুধু `new Map()`-এ (প্রতি Vercel
      // ইনস্ট্যান্সে আলাদা, cold start হলে মুছে যায়) — তাই বহু ইনস্ট্যান্স মিলিয়ে আসল
      // সীমা ১২০-এর বহুগুণ হয়ে যেত, কার্যত অকার্যকর। এখন API রুটের মতোই Redis-ব্যাকড
      // sliding-window (Upstash না থাকলে/ব্যর্থ হলে একই মেমোরি-ফলব্যাকে নামে, সাইট কখনো আটকায় না)।
      const rl = await slidingWindowLimit(`mw:page:${clientIp}`, MAX_PAGE_REQUESTS, RATE_LIMIT_WINDOW_MS / 1000);
      blocked = !rl.allowed;
      retryAfter = rl.retryAfterSec || 10;
    }
    if (blocked) {
      return new NextResponse('Too many requests. Please slow down.', {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }
  }

  // ৩. Supabase সেশন আপডেট
  const response = needsAuthRefresh(pathname)
    ? await updateSession(request)
    : NextResponse.next({ request });

  // ৪. সার্বিক সাইট সিকিউরিটি ও ক্লিকজ্যাকিং প্রোটেকশন হেডার
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 🛡️ HSTS
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // 🛡️ Content-Security-Policy (Cloudflare Insights + GA4 + Meta Pixel + Microsoft Clarity অনুমোদিত)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com https://static.cloudflareinsights.com https://connect.facebook.net https://www.clarity.ms https://scripts.clarity.ms",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://res.cloudinary.com https://img.vangcur.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://www.google.com https://www.facebook.com https://*.clarity.ms https://c.bing.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://static.cloudflareinsights.com https://www.googletagmanager.com https://api.cloudinary.com https://api.open-meteo.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://stats.g.doubleclick.net https://www.google.com https://www.facebook.com https://connect.facebook.net https://*.clarity.ms https://c.bing.com",
    "frame-src 'self' https://challenges.cloudflare.com https://www.googletagmanager.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
