import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';
import { idFromSlug } from '@/lib/productData';

// 🛠️ বিল্ড-ফিক্স: @opennextjs/cloudflare এখনো Next.js-এর 'edge' runtime
// সাপোর্ট করে না (সব রুট Node.js runtime-এই চলে Cloudflare Workers-এর উপর,
// যেটা পূর্ণাঙ্গ Node API সাপোর্ট করে) — তাই `export const runtime = 'edge'`
// থাকলে build-ই ফেল করে ("cannot use the edge runtime")। এই লাইন বাদ দিলে
// next/og-এর ImageResponse Node.js runtime-এই স্বাভাবিকভাবে কাজ করে।
export const revalidate = 300;
export const alt = 'Vangcur Product';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SITE_URL = 'https://vangcur.com';

// Google Fonts এর CSS2 এন্ডপয়েন্ট ব্রাউজার-UA না পেলে সরাসরি TTF ফরম্যাট
// রিটার্ন করে (satori/ImageResponse শুধু ttf/otf/woff সাপোর্ট করে, woff2 না) —
// এটাই এখানে কাজে লাগানো হয়েছে। `text` প্যারামে শুধু এই ছবিতে যা যা অক্ষর
// লাগবে সেটুকুই পাঠানো হয়, যাতে ফন্ট ফাইলটা ছোট ও দ্রুত থাকে।
async function loadBengaliFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@700&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl)).text();
    const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
    if (!match) return null;
    const res = await fetch(match[1]);
    if (res.status !== 200) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

interface OgProductRow {
  name?: string;
  price?: number | string;
  old?: number | string;
  imgs?: unknown;
}

async function getProduct(id: string): Promise<OgProductRow | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('custom_products')
      .select('name,price,old,imgs')
      .eq('id', id)
      .maybeSingle();
    return data as OgProductRow | null;
  } catch {
    return null;
  }
}

function firstImageUrl(imgs: unknown): string | null {
  let list: unknown = imgs;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = [list];
    }
  }
  if (!Array.isArray(list)) return null;
  const found = list.find((im) => typeof im === 'string' && im.startsWith('http'));
  return (found as string) || null;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const product = id ? await getProduct(id) : null;

  const name = product?.name || 'Vangcur';
  const price = Number(product?.price) || 0;
  const old = Number(product?.old) || 0;
  const discPct = old > price ? Math.round((1 - price / old) * 100) : 0;
  const showBadge = discPct >= 5;
  const imgUrl = firstImageUrl(product?.imgs) || `${SITE_URL}/vangcur-logo.png`;
  const displayName = name.length > 58 ? name.slice(0, 55) + '...' : name;

  const priceText = `৳${price.toLocaleString('en-US')}`;
  const oldText = old > price ? `৳${old.toLocaleString('en-US')}` : '';
  const badgeText = showBadge ? `-${discPct}%` : '';

  const fontData = await loadBengaliFont(`${displayName}${priceText}${oldText}${badgeText}VangcurYour First Choice For Gadgets`);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#0B111E',
          fontFamily: fontData ? 'Bengali' : undefined,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgUrl}
          width={1200}
          height={630}
          style={{ objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
        />

        {/* নিচের দিকের অংশে লেখা পড়া যায় এমন রাখতে ডার্ক গ্র্যাডিয়েন্ট — ProductCard-এর
            শ্যাডো স্টাইলের সাথে সামঞ্জস্যপূর্ণ */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage:
              'linear-gradient(180deg, rgba(5,7,14,0) 38%, rgba(8,12,22,0.62) 68%, rgba(5,7,14,0.93) 100%)',
          }}
        />

        {showBadge && (
          <div
            style={{
              position: 'absolute',
              top: 44,
              left: 44,
              display: 'flex',
              backgroundColor: '#E5372A',
              color: '#fff',
              fontSize: 36,
              fontWeight: 700,
              padding: '12px 30px',
              borderRadius: 999,
              boxShadow: '0 8px 22px rgba(0,0,0,0.4)',
            }}
          >
            {badgeText}
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 44,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'rgba(255,255,255,0.94)',
            padding: '10px 22px',
            borderRadius: 999,
            boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${SITE_URL}/vangcur-logo.png`}
            width={30}
            height={30}
            style={{ objectFit: 'contain' }}
          />
          <span style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#0058C7' }}>
            Vangcur
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '0 56px 54px',
          }}
        >
          <div
            style={{
              display: 'flex',
              color: '#fff',
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.28,
              maxWidth: 1020,
              marginBottom: 20,
            }}
          >
            {displayName}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
            <div style={{ display: 'flex', color: '#fff', fontSize: 66, fontWeight: 800 }}>
              {priceText}
            </div>
            {oldText && (
              <div
                style={{
                  display: 'flex',
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 36,
                  textDecoration: 'line-through',
                }}
              >
                {oldText}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: 'Bengali', data: fontData, weight: 700, style: 'normal' }]
        : undefined,
    }
  );
}
