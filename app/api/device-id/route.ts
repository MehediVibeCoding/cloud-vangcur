// ফাইলের পাথ: app/api/device-id/route.ts
// টেকসই ডিভাইস-আইডি কুকি (লাইকের জন্য) — সার্ভার-সেট হওয়ায় Safari ITP ৭ দিনে মোছে না।
// আগে middleware.ts প্রতিটা পেজ-রেসপন্সে এটা বসাত; তাতে পেজ এজে ক্যাশ হতে পারত না।
// এখন ক্লায়েন্ট (lib/deviceId.ts → ensureDeviceCookie) কুকি না থাকলে শুধু একবার এটা ডাকে।

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VALID = /^[A-Za-z0-9_-]{16,64}$/;

export async function GET(req: NextRequest) {
  const existing = req.cookies.get('vc_device_id')?.value || '';
  const proposed = req.nextUrl.searchParams.get('id') || '';
  const id = VALID.test(existing)
    ? existing
    : VALID.test(proposed)
      ? proposed
      : crypto.randomUUID().replace(/-/g, '');

  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  if (id !== existing) {
    res.cookies.set('vc_device_id', id, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
      secure: true,
      httpOnly: false,
    });
  }
  return res;
}
