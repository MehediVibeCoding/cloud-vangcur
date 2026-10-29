import type { SupabaseClient } from '@supabase/supabase-js';
import type { CurrentUser, WishlistItem } from '@/types';
import { useAuthStore } from '@/lib/store/authStore';

export async function signInWithPassword(supabase: SupabaseClient, email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(
  supabase: SupabaseClient,
  { name, phone, email, password }: { name: string; phone: string; email: string; password: string }
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone },
    },
  });
}

export async function signInWithGoogle(supabase: SupabaseClient, redirectTo = '/') {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('vc_oauth_pending', '1');
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vangcur.com';
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}${redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`}`,
    },
  });
}

export async function logout(supabase: SupabaseClient): Promise<void> {
  let globalSignOutFailed = false;
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // 🛡️ "সব ডিভাইস থেকে লগআউট" (global) নেটওয়ার্ক-নির্ভর — এটা ব্যর্থ হলে
    // নিচে নিশ্চিতভাবে local সাইন-আউট চালানো হবে, যাতে আসল কুকি/সেশন অবশ্যই মুছে যায়
    globalSignOutFailed = true;
  }
  if (globalSignOutFailed) {
    try {
      // 🛡️ local সাইন-আউট নেটওয়ার্ক-নির্ভর না, তাই এটা প্রায় সবসময়ই আসল সেশন/কুকি ক্লিয়ার করে
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore
    }
  }
  useAuthStore.getState().setCurrentUser(null);
  // 🛡️ ফিক্স (audit P2-B10): vc_user আগে থেকেই ক্লিয়ার হতো, কিন্তু অর্ডার-হিস্ট্রির
  // PII (নাম/ফোন/ঠিকানা সহ vc_orders, vc_guest_orders) লগআউটের পরও ব্রাউজারে
  // থেকে যেত — শেয়ার্ড/পাবলিক ডিভাইসে পরের ব্যবহারকারী তা দেখতে পেত।
  try {
    localStorage.removeItem('vc_orders');
    localStorage.removeItem('vc_guest_orders');
    // (audit P2-B10, বাকি অংশ) চেকআউটের নাম/ফোন/ঠিকানা/ইমেইল-ড্রাফট ও শেষ অর্ডারের ফোন —
    // শেয়ার্ড কম্পিউটারে (সাইবার ক্যাফে) পরের ইউজারের হাতে পড়তে পারত
    localStorage.removeItem('vc_abandoned_draft');
    localStorage.removeItem('vc_pending_ls');
    localStorage.removeItem('vc_pending_num_ls');
    localStorage.removeItem('vc_pending_phone_ls');
    localStorage.removeItem('vc_pending_ts');
  } catch {
    // storage unavailable, ignore
  }
  try {
    sessionStorage.removeItem('vc_form_draft');
    sessionStorage.removeItem('vc_lead_id');
    sessionStorage.removeItem('vc_quick_order_items');
  } catch {
    // storage unavailable, ignore
  }
  try {
    // 🛡️ নিশ্চিত করা হচ্ছে সেশন সত্যিই শেষ হয়েছে — এখনো জীবিত থাকলে জোর করে local সাইন-আউট
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      await supabase.auth.signOut({ scope: 'local' });
    }
  } catch {
    // ignore
  }
}

/**
 * 🛡️ ব্রাউজারের ক্যাশ নয়, সরাসরি সার্ভারের কাছে জিজ্ঞেস করে আসল/লাইভ লগইন সেশন যাচাই করা।
 * RLS-নির্ভর কোনো ডেটা আনার আগে এটা ব্যবহার করা উচিত, কারণ ক্যাশ করা ইউজার তথ্য
 * মাঝেমধ্যে আসল সেশনের সাথে অমিল হয়ে যেতে পারে।
 */
export async function getLiveUser(supabase: SupabaseClient): Promise<CurrentUser | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    const user = data.user;
    const meta = user.user_metadata || {};
    return {
      id: user.id,
      email: user.email,
      name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Customer',
      phone: meta.phone || '',
      avatar: meta.avatar_url || meta.picture || '',
      provider: user.app_metadata?.provider || 'email',
      createdAt: user.created_at,
    };
  } catch {
    return null;
  }
}

export async function checkOAuthCallback(supabase: SupabaseClient): Promise<CurrentUser | null> {
  if (typeof window === 'undefined') return null;

  const isPending = sessionStorage.getItem('vc_oauth_pending') === '1';
  const hasOAuthParams =
    window.location.hash.includes('access_token=') ||
    window.location.search.includes('code=') ||
    window.location.hash.includes('error_description=');

  if (!isPending && !hasOAuthParams) {
    return null;
  }

  sessionStorage.removeItem('vc_oauth_pending');

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    const user = data.user;
    const meta = user.user_metadata || {};
    const safeUser: CurrentUser = {
      id: user.id,
      email: user.email,
      name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Customer',
      phone: meta.phone || '',
      avatar: meta.avatar_url || meta.picture || '',
      provider: user.app_metadata?.provider || 'email',
      createdAt: user.created_at,
    };
    // 🛡️ এখানে ইচ্ছাকৃতভাবে currentUser সেট করা হচ্ছে না — যে ফাংশন এটাকে কল করছে
    // (LoginModal / checkout page) সে আগে গেস্ট-অর্ডার জোড়া লাগানোর কাজ শেষ করবে,
    // তারপর currentUser সেট করবে। এই ক্রম না মানলে "আমার অর্ডার" পেজ জোড়া লাগানোর
    // কাজ শেষ হওয়ার আগেই ডাটা আনতে চলে যায় এবং খালি দেখায়।
    return safeUser;
  } catch {
    return null;
  }
}

export async function syncWishlistFromSupabase(supabase: SupabaseClient, userId: string): Promise<WishlistItem[] | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('wishlist')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data || !data.wishlist) return null;
    const raw = data.wishlist;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveWishlistToSupabase(supabase: SupabaseClient, userId: string, wishlist: WishlistItem[]): Promise<void> {
  if (!userId) return;
  try {
    await supabase
      .from('profiles')
      .upsert({
        id: userId,
        wishlist: wishlist,
        updated_at: new Date().toISOString(),
      });
  } catch {
    // ignore
  }
}

function getLocalGuestOrderIds(): string[] {
  if (typeof window === 'undefined') return [];
  const ids = new Set<string>();
  try {
    const raw = localStorage.getItem('vc_guest_orders');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          const id = typeof entry === 'string' ? entry : entry?.id;
          if (id) ids.add(String(id));
        }
      }
    }
  } catch {
    // ignore
  }
  try {
    const pending = localStorage.getItem('vc_pending_ls');
    if (pending) ids.add(pending);
  } catch {
    // ignore
  }
  return Array.from(ids);
}

/**
 * গেস্ট অর্ডার ইউজারের অ্যাকাউন্টে যুক্ত করে।
 * ⚠️ এটা "ফোন নম্বর দিয়ে সব অর্ডার তুলে আনা" না। claim_guest_orders RPC (DB) দুটো শর্ত বাধ্যতামূলক করে:
 *   ১) অর্ডার UUID — শুধু এই ডিভাইসের localStorage থেকে আসে (getLocalGuestOrderIds)
 *   ২) অর্ডারের ফোনের শেষ ১০ ডিজিট ইউজারের প্রোফাইল ফোনের সাথে মিলতে হবে (migration: s4_claim_guest_orders_require_phone_match)
 * তাই অন্যের ফোন নম্বর দিয়ে রেজিস্টার করে অন্যের অর্ডার নেওয়া যায় না।
 */
export async function mergeGuestOrdersToUser(supabase: SupabaseClient, phone: string, userId: string): Promise<void> {
  if (!userId) return;
  const orderIds = getLocalGuestOrderIds();
  const trimmedPhone = phone ? phone.trim() : '';
  if (!trimmedPhone && orderIds.length === 0) return;
  try {
    await supabase.rpc('claim_guest_orders', {
      p_phone: trimmedPhone || null,
      p_order_ids: orderIds.length > 0 ? orderIds : null,
    });
  } catch {
    // ignore
  }
}

export async function requestPasswordReset(supabase: SupabaseClient, email: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vangcur.com';
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
}

export async function updatePassword(supabase: SupabaseClient, password: string) {
  return supabase.auth.updateUser({ password });
}
