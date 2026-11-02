import type { SupabaseClient } from '@supabase/supabase-js';
import {
  sanitizePlainName, validateName, MAX_NAME_LEN,
  sanitizePhoneInput, validatePhone,
  sanitizeAddressInput, validateAddress, MAX_ADDR_LEN,
} from './security';
import { DISTRICTS } from './checkoutData';
import { logWarn } from './logger';
import { withTimeout } from './withTimeout';

export interface MyProfileData {
  name: string;
  phone: string;
  address: string;
  district: string;
  email: string;
}

// 🛡️ প্রোফাইল "সম্পূর্ণ" ধরা হয় শুধুমাত্র ফোন, জেলা ও ঠিকানা বৈধভাবে পূরণ থাকলে —
// ইমেইল সবসময়ই থাকে (লগইনের সময় থেকেই লক করা), তাই সেটা আলাদা করে চেক করার
// দরকার নেই। কোনো OTP/ভেরিফিকেশন ধাপ এখানে নেই — শুধু তথ্য পূরণ থাকা যথেষ্ট।
export function isProfileComplete(p: Pick<MyProfileData, 'phone' | 'address' | 'district'>): boolean {
  return validatePhone(p.phone || '') && validateAddress(p.address || '') && DISTRICTS.includes(p.district || '');
}

export async function fetchMyProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<MyProfileData | null> {
  if (!userId) return null;
  try {
    const [{ data: profile }, { data: authData }] = await Promise.all([
      supabase.from('profiles').select('name, phone, address, district').eq('id', userId).maybeSingle(),
      supabase.auth.getUser(),
    ]);

    return {
      name: (profile?.name || authData?.user?.user_metadata?.name || '').toString(),
      // 🛠️ ফিক্স: সাইনআপের সময় (ইমেইল/পাসওয়ার্ড) দেওয়া ফোন নম্বর auth মেটাডেটাতে
      // জমা থাকে কিন্তু profiles টেবিলে কপি হওয়ার কোনো ট্রিগার নেই — তাই এখানেও
      // নামের মতোই fallback রাখা হলো, নাহলে ইউজারকে আবার টাইপ করতে হতো।
      phone: (profile?.phone || authData?.user?.user_metadata?.phone || '').toString(),
      address: (profile?.address || '').toString(),
      district: (profile?.district || '').toString(),
      // ইমেইল সবসময় server-verified auth সেশন থেকেই আসে, কখনো ইউজার-ইনপুট থেকে না
      email: (authData?.user?.email || '').toString(),
    };
  } catch (e) {
    logWarn('[Profile] fetchMyProfile error:', e);
    return null;
  }
}

export interface UpdateProfilePayload {
  name: string;
  phone: string;
  address: string;
  district: string;
}

export interface UpdateProfileResult {
  ok: boolean;
  error?: string;
  data?: { name: string; phone: string; address: string; district: string };
}

const MAX_PROFILE_EDITS_PER_DAY = 5;
const EDIT_COUNT_KEY = 'vc_profile_edit_count';

// 🛡️ দৈনিক এডিট-লিমিট — এটা সাধারণ ইউজারের ভুলবশত বারবার সাবমিট ঠেকানোর জন্য
// যথেষ্ট। এটা পাসওয়ার্ড/OTP-এর মতো হার্ড সিকিউরিটি বাউন্ডারি না (তার দরকারও নেই,
// যেহেতু প্রোফাইল তথ্য স্পর্শকাতর কোনো অ্যাক্সেস দেয় না), তাই সাধারণ localStorage
// কাউন্টার দিয়েই যথেষ্ট।
function getTodayEditCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(EDIT_COUNT_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date: string; count: number };
    const today = new Date().toISOString().slice(0, 10);
    return parsed.date === today ? parsed.count : 0;
  } catch {
    return 0;
  }
}

function incrementTodayEditCount(): void {
  if (typeof window === 'undefined') return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const current = getTodayEditCount();
    localStorage.setItem(EDIT_COUNT_KEY, JSON.stringify({ date: today, count: current + 1 }));
  } catch {
    // ignore
  }
}

export async function updateMyProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: UpdateProfilePayload,
): Promise<UpdateProfileResult> {
  if (!userId) {
    return { ok: false, error: 'লগইন করা আবশ্যক।' };
  }

  if (getTodayEditCount() >= MAX_PROFILE_EDITS_PER_DAY) {
    return { ok: false, error: `আজকের জন্য প্রোফাইল আপডেটের সর্বোচ্চ সীমা (${MAX_PROFILE_EDITS_PER_DAY} বার) শেষ হয়ে গেছে। আগামীকাল আবার চেষ্টা করুন।` };
  }

  // 🛡️ ধাপ ১: প্রতিটা ফিল্ড আলাদাভাবে sanitize (whitelist-ভিত্তিক — শুধু বৈধ
  // ক্যারেক্টারই টিকে থাকে, বাকি সব ইনজেকশন-প্রবণ ক্যারেক্টার বাদ পড়ে যায়)
  const cleanName = sanitizePlainName(payload.name || '');
  const cleanPhone = sanitizePhoneInput(payload.phone || '');
  const cleanAddress = sanitizeAddressInput(payload.address || '').trim();
  const cleanDistrict = (payload.district || '').trim();

  // 🛡️ ধাপ ২: sanitize করার পরও ফরম্যাট/দৈর্ঘ্য সঠিক কিনা কড়াভাবে ভ্যালিডেট
  if (!validateName(cleanName)) {
    return { ok: false, error: `সঠিক নাম দিন (৩-${MAX_NAME_LEN} অক্ষর, শুধু হরফ)` };
  }
  if (!validatePhone(cleanPhone)) {
    return { ok: false, error: 'সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)' };
  }
  // 🛡️ হোয়াইটলিস্ট ভ্যালিডেশন: preset তালিকার বাইরে কোনো মান গ্রহণ করা হয় না,
  // তাই এই ফিল্ডে কোনোভাবেই ইনজেকশন সম্ভব না
  if (!DISTRICTS.includes(cleanDistrict)) {
    return { ok: false, error: 'তালিকা থেকে সঠিক জেলা সিলেক্ট করুন' };
  }
  if (!validateAddress(cleanAddress)) {
    return { ok: false, error: `সঠিক ডেলিভারি ঠিকানা দিন (৮-${MAX_ADDR_LEN} অক্ষর)` };
  }

  try {
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      name: cleanName,
      phone: cleanPhone,
      address: cleanAddress,
      district: cleanDistrict,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    // auth মেটাডেটাতেও নাম সিঙ্ক রাখা (বাকি সাইটের সাথে সামঞ্জস্যপূর্ণ)
    try {
      await supabase.auth.updateUser({ data: { name: cleanName } });
    } catch {
      // non-fatal
    }

    incrementTodayEditCount();
    return { ok: true, data: { name: cleanName, phone: cleanPhone, address: cleanAddress, district: cleanDistrict } };
  } catch (e) {
    logWarn('[Profile] updateMyProfile error:', e);
    return { ok: false, error: 'প্রোফাইল সংরক্ষণ করা যায়নি, আবার চেষ্টা করুন।' };
  }
}

// 🆕 একাধিক ইউজারের প্রোফাইল-সম্পূর্ণতা একবারে চেক করার জন্য (Q&A/Review-এ ব্যাজ
// দেখানোর সময় ব্যবহৃত হয়) — একটার বদলে ব্যাচ-কোয়েরি, তাই N+1 কোয়েরি সমস্যা হয় না।
//
// 🛡️ নিরাপত্তা নোট: এই ফাংশনটা আগে সরাসরি profiles টেবিল থেকে phone/address/
// district raw কলাম SELECT করার চেষ্টা করত (RLS-এর উপর ভরসা করে অন্যের ডেটা
// ব্লক হবে ধরে নিয়ে) — এটা RLS ঠিক থাকলে ফিচারটাকেই অকেজো করে দিত (অন্যের সারি
// ব্লকড থাকায় কখনো true পাওয়া যেত না), আর RLS কখনো শিথিল হলে সরাসরি ফোন/ঠিকানা
// পাবলিকলি লিক করত। তাই এখন raw কলাম না টেনে ডাটাবেজের একটা SECURITY DEFINER
// RPC ফাংশন (get_profile_completion_status) কল করা হয়, যেটা শুধু true/false
// রিটার্ন করে — ফোন/ঠিকানা কখনোই ব্রাউজারে আসে না। এই RPC ফাংশনটা Supabase-এ
// আলাদাভাবে বসাতে হবে (দেখুন: supabase/get_profile_completion_status.sql)।
export async function fetchProfileCompletionMap(
  supabase: SupabaseClient,
  userIds: (string | null | undefined)[],
): Promise<Record<string, boolean>> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => !!id)));
  if (ids.length === 0) return {};

  try {
    const { data, error } = await withTimeout(
      supabase.rpc('get_profile_completion_status', { user_ids: ids }),
    );

    if (error || !data) return {};

    const map: Record<string, boolean> = {};
    (data as { id: string; complete: boolean }[]).forEach((row) => {
      map[row.id] = !!row.complete;
    });
    return map;
  } catch (e) {
    logWarn('[Profile] fetchProfileCompletionMap error:', e);
    return {};
  }
}
