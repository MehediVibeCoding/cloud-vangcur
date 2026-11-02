import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import { slidingWindowLimit, getClientIp } from '@/lib/limiter';
import { r2ReviewKeyFromUrl, r2KeyOwnedBy, deleteFromR2 } from '@/lib/r2';
import { logWarn } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const MAX_URLS = 3;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }

    const clientIp = getClientIp(req.headers);
    const rl = await slidingWindowLimit(`review-img-clean:${user.id}:${clientIp}`, 30, 600);
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, message: 'Too many attempts' }, { status: 429 });
    }

    const body = (await req.json().catch(() => null)) as { urls?: unknown } | null;
    const rawUrls = Array.isArray(body?.urls) ? (body!.urls as unknown[]) : [];
    const keys = Array.from(
      new Set(
        rawUrls
          .filter((u): u is string => typeof u === 'string')
          .slice(0, MAX_URLS)
          .map((u) => r2ReviewKeyFromUrl(u))
          .filter((k): k is string => !!k)
          // 🛡️ শুধু নিজের আপলোড করা ছবিই মোছা যাবে (অন্যের ছবি/পুরনো ফরম্যাটের key এখানে স্কিপ হয়)
          .filter((k) => r2KeyOwnedBy(k, user.id)),
      ),
    );
    if (!keys.length) return NextResponse.json({ ok: true, deleted: 0 });

    // Skip images still referenced by any review row (service client sees pending reviews too)
    const service = createServiceClient();
    const deletable: string[] = [];
    for (const key of keys) {
      const { data, error } = await service
        .from('product_reviews')
        .select('id')
        .like('image_url', `%${key}%`)
        .limit(1);
      if (error) {
        logWarn('[cleanup-review-images] reference check failed:', error.message);
        continue; // not sure => do not delete
      }
      if (!data || data.length === 0) deletable.push(key);
    }

    const ok = await deleteFromR2(deletable);
    return NextResponse.json({ ok, deleted: ok ? deletable.length : 0 });
  } catch (e) {
    logWarn('[cleanup-review-images] unexpected error:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
        }
