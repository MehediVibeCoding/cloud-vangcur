// ফাইলের পাথ: lib/freshImages.ts
// কার্ট ও উইশলিস্টের আইটেমে প্রোডাক্ট যোগ করার মুহূর্তের ছবির লিংক ব্রাউজারে সেভ থাকে।
// পরে অ্যাডমিন থেকে ছবি বদলালে সেই পুরনো লিংকই দেখাত। ড্রয়ার খোলার সময় এখান থেকে
// শুধু `id` ও `imgs` (দুটো কলাম, শুধু ওই আইটেমগুলোর) এনে সর্বশেষ ছবি বসিয়ে দেওয়া হয়।
//
// লোড কমানোর ব্যবস্থা: প্রতিটা আইডির জন্য ৫ মিনিট ক্যাশ, একই সময়ের কলগুলো একটাই
// রিকোয়েস্টে মিলে যায়, আর ব্যর্থ হলে কিছুই বদলায় না (পুরনো ছবিই থাকে)।

import { createClient } from '@/lib/supabase/client';
import { useCartStore } from '@/lib/store/cartStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { logWarn } from '@/lib/logger';

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { url: string; ts: number }>();
let inflight: Promise<void> | null = null;

function firstHttpImage(raw: unknown): string {
  let imgs = raw;
  if (typeof imgs === 'string') {
    try {
      imgs = JSON.parse(imgs);
    } catch {
      imgs = [imgs];
    }
  }
  if (!Array.isArray(imgs) || !imgs.length) return '';
  const first = imgs[0];
  return typeof first === 'string' && first.startsWith('http') ? first : '';
}

async function fetchMissing(ids: string[]): Promise<void> {
  const now = Date.now();
  const stale = ids.filter((id) => {
    const c = cache.get(id);
    return !c || now - c.ts > TTL_MS;
  });
  if (!stale.length) return;

  if (inflight) {
    await inflight;
    return fetchMissing(ids.filter((id) => stale.includes(id)));
  }

  inflight = (async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('custom_products')
        .select('id,imgs')
        .in('id', stale.slice(0, 50));
      if (error || !data) return;
      const ts = Date.now();
      (data as { id: number | string; imgs: unknown }[]).forEach((row) => {
        const url = firstHttpImage(row.imgs);
        // ছবি না পেলে ক্যাশে '' রাখা হয় — যাতে বারবার একই প্রশ্ন না যায়
        cache.set(String(row.id), { url, ts });
      });
    } catch (e) {
      logWarn('[freshImages] fetch failed:', e);
    } finally {
      inflight = null;
    }
  })();
  await inflight;
}

function urlFor(id: number | string): string {
  return cache.get(String(id))?.url || '';
}

/** কার্ট ড্রয়ার খোলার সময় কল করুন */
export async function refreshCartImages(): Promise<void> {
  const ids = useCartStore.getState().cart.map((i) => String(i.id));
  if (!ids.length) return;
  await fetchMissing(ids);
  // সর্বশেষ অবস্থা থেকে বানানো হয় — ফেচ চলার সময় পরিমাণ বদলালে সেটা হারায় না
  const current = useCartStore.getState().cart;
  let changed = false;
  const next = current.map((i) => {
    const url = urlFor(i.id);
    if (url && url !== i.emoji) {
      changed = true;
      return { ...i, emoji: url };
    }
    return i;
  });
  if (changed) useCartStore.getState().setCart(next);
}

/** উইশলিস্ট ড্রয়ার খোলার সময় কল করুন */
export async function refreshWishlistImages(): Promise<void> {
  const ids = useWishlistStore.getState().wishlist.map((i) => String(i.id));
  if (!ids.length) return;
  await fetchMissing(ids);
  const current = useWishlistStore.getState().wishlist;
  let changed = false;
  const next = current.map((i) => {
    const url = urlFor(i.id);
    if (url && url !== i.emoji) {
      changed = true;
      return { ...i, emoji: url };
    }
    return i;
  });
  if (changed) useWishlistStore.getState().setWishlist(next);
}
