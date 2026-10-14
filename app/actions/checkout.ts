'use server';

import { MAX_QTY_PER_PRODUCT } from '@/lib/cartLimits';
import { after } from 'next/server';
import { headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import {
  DISTRICTS, getShipOptions, shipPrice, fetchShipConfig, DEFAULT_SHIP_CFG,
  validatePhone, validateAddress, validateEmail, validateTxnId,
  calculateAdvancePayment, MAX_ONLINE_ORDER_TOTAL,
} from '@/lib/checkoutData';
import {
  sanitizePlainName, validateName, MAX_NAME_LEN,
  sanitizeEmailInput, sanitizeAddressInput, MAX_ADDR_LEN, normalizeBdPhone,
} from '@/lib/security';
import { logWarn, logError } from '@/lib/logger';
import { staticDictionary } from '@/lib/i18n/dictionary';
import { recordLimitHit, classifyPhoneLimit } from '@/lib/limitEvents';
import { scoreAndSaveOrderRisk, waitForRisk } from '@/lib/riskScoring';
import { topRiskReasons } from '@/lib/riskEngine';
import { sendTelegramOrderNotification, sendTelegramPaymentAutoConfirm } from '@/lib/telegram';
import { getClientIp } from '@/lib/limiter';
import type { ActionResponse, CreateOrderResult, OrderPayload } from '@/types';

const MAX_ITEMS = 30;
const MAX_QTY_PER_ITEM = MAX_QTY_PER_PRODUCT;
const GENERIC_RETRY_MSG = 'একটু পরে আবার চেষ্টা করুন';

function fail(error: string): ActionResponse<CreateOrderResult> {
  return { ok: false, error };
}

// ক্লায়েন্টের আসল আইপি — শেয়ার্ড getClientIp() (lib/limiter.ts, C5 ফিক্স) ব্যবহার করে।
// পেন্ডিং-লক ও অর্ডারে আইপি সংরক্ষণে ব্যবহৃত হয়।
async function readClientIp(): Promise<string> {
  try {
    const hdrs = await headers();
    const ip = getClientIp(hdrs);
    return ip === '127.0.0.1' ? '' : ip.slice(0, 64);
  } catch {
    return '';
  }
}

// ক্লায়েন্টের আইপি-লোকেশন — Vercel-এর নিজস্ব এজ-সেট হেডার (ক্লায়েন্ট বদলাতে পারে না)।
// শুধু অর্ডার ট্রাস্ট স্কোরের জন্য; ব্যর্থ বা খালি হলে চেকআউটে কোনো প্রভাব নেই।
async function readClientGeo(): Promise<{ city: string; country: string; region: string }> {
  try {
    const hdrs = await headers();
    const dec = (v: string | null): string => {
      try {
        return decodeURIComponent(v || '');
      } catch {
        return v || '';
      }
    };
    return {
      city: dec(hdrs.get('x-vercel-ip-city')).slice(0, 80),
      country: (hdrs.get('x-vercel-ip-country') || '').slice(0, 2),
      region: (hdrs.get('x-vercel-ip-country-region') || '').slice(0, 16),
    };
  } catch {
    return { city: '', country: '', region: '' };
  }
}

function parseJsonish<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val as T;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

/**
 * (audit P2-B1) idempotency_key দিয়ে আগের অর্ডার খোঁজে।
 * - পাওয়া গেলে ও ফোন + আইটেম (id/qty) মিললে → সেই অর্ডার
 * - পাওয়া গেলে কিন্তু মেলে না → 'mismatch' (কীটা এই নতুন অর্ডারের জন্য ব্যবহার করা হবে না)
 * - না পেলে → null
 */
async function findOrderByIdempotencyKey(
  service: SupabaseClient,
  key: string,
  phone: string,
  cleanItems: { id: string; qty: number }[],
): Promise<{ id: string | number; orderNum: string } | 'mismatch' | null> {
  const { data, error } = await service
    .from('orders')
    .select('id, order_num, customer_phone, items')
    .eq('idempotency_key', key)
    .maybeSingle();
  if (error || !data) return null;
  if (String(data.customer_phone || '') !== phone) return 'mismatch';
  const stored = parseJsonish<{ id: string | number; qty: number }[]>(data.items, []);
  const sig = (arr: { id: string | number; qty: number }[]) =>
    arr.map((i) => `${String(i.id)}x${Number(i.qty)}`).sort().join('|');
  if (sig(Array.isArray(stored) ? stored : []) !== sig(cleanItems)) return 'mismatch';
  return { id: data.id, orderNum: String(data.order_num || '') };
}

export async function createOrder(payload: OrderPayload): Promise<ActionResponse<CreateOrderResult>> {
  const lang = payload?.lang === 'en' ? 'en' : 'bn';
  const t = (text: string): string => (lang === 'en' ? (staticDictionary[text] ?? text) : text);

  if (!payload || typeof payload !== 'object') return fail(t('অবৈধ অনুরোধ'));

  // 🛡️ হানিপট — ফর্মে একটা ফিল্ড মানুষ কখনো দেখে না/ভরে না (CSS দিয়ে স্ক্রিনের বাইরে,
  // tabIndex -1, aria-hidden), কিন্তু অটো-ফিল করা বট/স্ক্রিপ্ট সাধারণত সব ইনপুট
  // পূরণ করার চেষ্টা করে। এখানে কিছু থাকলে মানেই বট — কোনো DB কল/রেট-লিমিট গোনা
  // ছাড়াই সাথে সাথে বাতিল। ভুলক্রমে কোনো সত্যিকারের কাস্টমারের ক্ষতি হয় না, কারণ এই
  // ফিল্ডে কোনো UI কখনো লেখা বসায় না।
  if (String(payload.hp || '').trim()) {
    return fail(t('অবৈধ অনুরোধ'));
  }

  const name = sanitizePlainName(String(payload.name || '')).trim();
  // (audit P2-B6) +88 / 0088 ইত্যাদি হলে সার্ভারও একই নিয়মে ১১ ডিজিটে আনে; তারপর কড়া যাচাই
  const phone = normalizeBdPhone(String(payload.phone || '').trim());
  const dist = String(payload.district || '').trim();
  const addr = sanitizeAddressInput(String(payload.address || '')).trim();
  const email = sanitizeEmailInput(String(payload.email || '')).trim();
  const shipping = String(payload.shipping || '').trim();
  const txn = String(payload.paymentTxn || '').trim().toUpperCase();
  const last4 = String(payload.paymentLast4 || '').trim();
  // (audit P2-B4) fingerprint ক্লায়েন্ট থেকে আসে, তাই এটা শুধু "সহায়ক সংকেত" — একমাত্র সুরক্ষা নয়
  // (আসল বাধা: ফোন + IP লিমিট)। তবু FingerprintJS v4 visitorId সবসময় ৩২ অক্ষরের hex;
  // এর বাইরের যেকোনো মান (আবর্জনা/অতিদীর্ঘ/ইনজেকশন) সার্ভার অগ্রাহ্য করে খালি ধরে —
  // তখন শুধু ফোন ও IP লিমিট প্রযোজ্য হয়, আসল কাস্টমার আটকায় না।
  const rawFingerprint = String(payload.fingerprintId || '').trim();
  const fingerprintId = /^[a-f0-9]{32}$/i.test(rawFingerprint) ? rawFingerprint.toLowerCase() : '';
  // (audit P2-B1) ক্লায়েন্ট-জেনারেটেড UUID; একই চেকআউট-চেষ্টার রিট্রাই/ডাবল-ক্লিক চেনার জন্য
  const rawIdemKey = String(payload.idempotencyKey || '').trim();
  const idempotencyKey = /^[A-Za-z0-9_-]{16,64}$/.test(rawIdemKey) ? rawIdemKey : '';
  const couponCode = String(payload.couponCode || '').trim().toUpperCase();
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  if (!validateName(name) || name.length > MAX_NAME_LEN) return fail(t('সঠিক নাম দিন'));
  if (!validatePhone(phone)) return fail(t('সঠিক মোবাইল নম্বর দিন'));
  if (!DISTRICTS.includes(dist)) return fail(t('সঠিক জেলা সিলেক্ট করুন'));
  if (!validateAddress(addr) || addr.length > MAX_ADDR_LEN) return fail(t('সঠিক ঠিকানা দিন'));
  if (email && !validateEmail(email)) return fail(t('সঠিক ইমেইল দিন'));

  const validShipKeys: string[] = getShipOptions(dist).map((o) => o.key);
  if (!shipping || !validShipKeys.includes(shipping)) return fail(t('সঠিক শিপিং অপশন সিলেক্ট করুন'));

  if (!rawItems.length || rawItems.length > MAX_ITEMS) return fail(t('কার্ট খালি বা অস্বাভাবিক, রিফ্রেশ করে আবার চেষ্টা করুন'));

  const mergedMap: Record<string, number> = {};
  for (const raw of rawItems) {
    const id = String(raw?.id ?? '').trim();
    const qty = Number(raw?.qty);
    if (!id || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      return fail(t('কার্টের একটি আইটেম সঠিক নয়, রিফ্রেশ করে আবার চেষ্টা করুন'));
    }
    mergedMap[id] = (mergedMap[id] || 0) + qty;
    // একই পণ্য একাধিক লাইনে এলেও মোট পরিমাণ সীমার বেশি হতে পারবে না
    if (mergedMap[id] > MAX_QTY_PER_ITEM) {
      return fail(t('একটি পণ্য সর্বোচ্চ ১০টি নেওয়া যাবে'));
    }
  }

  const cleanItems: { id: string; qty: number }[] = Object.entries(mergedMap).map(([id, qty]) => ({ id, qty }));
  const targetProductIds = cleanItems.map((item) => item.id);

  let service: SupabaseClient;
  try {
    service = createServiceClient();
  } catch (e) {
    logError('[checkout] service client init failed:', e);
    return fail(t('সার্ভার কনফিগারেশন সমস্যা, একটু পরে চেষ্টা করুন'));
  }

  let currentUserId: string | null = null;
  let currentUserEmail: string | null = null;
  let isPrivilegedUser = false;

  // 🔒 ফিক্স (M1, নিরাপদ অংশ): auth+প্রোফাইল লুকআপ আর idempotency-key লুকআপ একে অপরের
  // ফলাফলের ওপর নির্ভর করে না — একটা ইউজার-আইডি থেকে প্রোফাইল আনে, আরেকটা ফোন+আইটেম
  // থেকে আগের অর্ডার খোঁজে, আলাদা ডেটা, কোনো শেয়ার্ড স্টেট নেই। আগে এই দুটো ধাপে ধাপে
  // (sequential) হতো, এখন Promise.all দিয়ে একসাথে — প্রতিটা ফলাফল প্রসেস হয় ঠিক আগের
  // মতোই ক্রমে, শুধু নেটওয়ার্ক-অপেক্ষাটা একসাথে হচ্ছে। যুক্তি/আচরণ অপরিবর্তিত।
  const [authResult, idemResult] = await Promise.all([
    (async (): Promise<{ userId: string; email: string | null; privileged: boolean } | null> => {
      try {
        const cookieClient = await createClient();
        const { data: userData } = await cookieClient.auth.getUser();
        if (!userData?.user) return null;

        // প্রোফাইল টেবিল থেকে অ্যাডমিন/মডারেটর রোল যাচাই — শুধুমাত্র DB-ভিত্তিক
        // (আগে এখানে একটা হার্ডকোডেড মডারেটর-ইমেইল শর্টকাট ছিল, সরিয়ে ফেলা হয়েছে)
        const { data: profile } = await service
          .from('profiles')
          .select('is_admin, role')
          .eq('id', userData.user.id)
          .maybeSingle();

        return {
          userId: userData.user.id,
          email: userData.user.email ?? null,
          privileged: profile?.is_admin === true || ['admin', 'super_admin', 'moderator'].includes(profile?.role),
        };
      } catch {
        return null;
      }
    })(),
    idempotencyKey
      ? findOrderByIdempotencyKey(service, idempotencyKey, phone, cleanItems).catch((e) => {
          logWarn('[checkout] idempotency lookup failed (continuing normally):', e);
          return null;
        })
      : Promise.resolve(null),
  ]);

  if (authResult) {
    currentUserId = authResult.userId;
    currentUserEmail = authResult.email;
    isPrivilegedUser = authResult.privileged;
  }

  // 🎖️ ফিচার: Legendary (১০+ ডেলিভার্ড অর্ডার) সদস্যের একবার-ব্যবহারযোগ্য
  // "Zero Advance / ১০০% COD" ভাউচার। মেম্বারশিপ থেকে ক্লেইম করা থাকলে
  // (claim_legendary_reward RPC) এখানে atomic UPDATE...WHERE দিয়ে reserve
  // করা হচ্ছে — একই ইউজার দুই ট্যাবে একসাথে চেকআউট করলেও ভাউচার একবারই
  // ব্যবহার হবে। এই একটামাত্র লুকআপ ছাড়া checkout আর কোথাও ইউজারের
  // ডেলিভারি-সংখ্যা নতুন করে গোনে না — সেই ভারী হিসাব শুধু ক্লেইমের সময়
  // একবারই হয়।
  // (audit P2-B1) Idempotency: একই কী দিয়ে অর্ডার আগেই তৈরি হয়ে থাকলে (ডাবল-ক্লিক / নেট-স্লো রিট্রাই)
  // নতুন কিছু না বানিয়ে আগের অর্ডারটাই ফেরত দিই — স্টক/কুপন/ভাউচার/রেট-লিমিটে হাত পড়ে না।
  // নিরাপত্তা: একই ফোন ও একই আইটেম-তালিকা না মিললে এটা "একই অর্ডার" ধরা হয় না (নতুন অর্ডার হিসেবে চলবে)।
  let idemKeyForInsert: string | null = idempotencyKey || null;
  if (idempotencyKey) {
    if (idemResult === 'mismatch') {
      idemKeyForInsert = null;
    } else if (idemResult) {
      return { ok: true, data: { id: idemResult.id, orderNum: idemResult.orderNum } };
    }
  }

  // ⏳ পেন্ডিং-অর্ডার লক: একই ডিভাইস (ফিঙ্গারপ্রিন্ট) থেকে, অথবা একই ফোন + একই আইপি থেকে
  // গত ৩০ মিনিটে করা কোনো অর্ডার এখনো পেন্ডিং থাকলে নতুন অর্ডার আটকানো হয়।
  // শুধু ফোন নম্বর মিললে আটকানো হয় না — যাতে অন্যের নম্বর দিয়ে অর্ডার করা ভুয়া ব্যক্তি আসল মালিককে আটকাতে না পারে।
  // অর্ডার কনফার্ম/রিজেক্ট/ক্যানসেল হলেই status বদলায়, ফলে লক সাথে সাথে খুলে যায়।
  // এটা নিরাপত্তা-সীমা নয় (সেগুলো নিচের রেট-লিমিট), তাই RPC ব্যর্থ হলে ফেইল-ওপেন।
  const clientIp = await readClientIp();
  const clientGeo = await readClientGeo();
  if (!isPrivilegedUser) {
    try {
      const { data: lockRows, error: lockErr } = await service.rpc('get_pending_order_lock', {
        p_phone: phone,
        p_fingerprint: fingerprintId,
        p_ip: clientIp,
      });
      if (lockErr) {
        logWarn('[checkout] pending lock RPC error (continuing; rate limits still apply):', lockErr.message);
      } else if (Array.isArray(lockRows) && lockRows.length > 0) {
        const lockRow = lockRows[0] as { order_num?: string; age_seconds?: number };
        await recordLimitHit(service, {
          type: 'pending_lock',
          phone,
          fingerprintId,
          userId: currentUserId,
          ip: clientIp,
        });
        return {
          ok: false,
          error: lang === 'en'
            ? 'Your previous order payment is still being verified. You can place a new order once it is done.'
            : 'আপনার পূর্বের অর্ডারের পেমেন্ট যাচাই চলছে। যাচাই শেষ হলে নতুন অর্ডার করতে পারবেন।',
          lock: {
            orderNum: String(lockRow.order_num || ''),
            ageSeconds: Math.max(0, Number(lockRow.age_seconds) || 0),
          },
        };
      }
    } catch (e) {
      logWarn('[checkout] pending lock check failed (continuing):', e);
    }
  }

  let legendaryVoucherReserved = false;
  if (currentUserId) {
    try {
      const { data: voucherRow } = await service
        .from('legendary_vouchers')
        .update({ is_available: false })
        .eq('user_id', currentUserId)
        .eq('is_available', true)
        .select('user_id')
        .maybeSingle();
      legendaryVoucherReserved = !!voucherRow;
    } catch (e) {
      logError('[checkout] legendary voucher reserve check failed (continuing as a normal order):', e);
    }
  }

  async function revertLegendaryVoucherIfNeeded() {
    if (!legendaryVoucherReserved || !currentUserId) return;
    try {
      await service
        .from('legendary_vouchers')
        .update({ is_available: true })
        .eq('user_id', currentUserId)
        .eq('is_available', false)
        .is('used_at', null);
    } catch (e) {
      logError('[checkout] legendary voucher release failed:', e);
    }
  }

  const hasTxn = !!txn;
  const hasLast4 = !!last4;
  if (!legendaryVoucherReserved) {
    if (!hasTxn && !hasLast4) return fail(t('Transaction ID অথবা শেষ ৪ ডিজিট দিন'));
    if (hasTxn && !validateTxnId(txn)) return fail(t('সঠিক বিকাশ ট্রানজেকশন আইডি দিন'));
    if (hasLast4 && !/^\d{4}$/.test(last4)) return fail(t('সঠিক শেষ ৪ ডিজিট দিন'));
  }

  // 🔒 ফিক্স (M1): আগে এখানে ৩টা আলাদা RPC (ফোন → fingerprint → IP, ক্রমানুসারে) — তিনটা
  // DB রাউন্ড-ট্রিপ। এখন একটাই `check_order_limits()` (নতুন migration), যেটার ভেতরে
  // হুবহু আগের তিনটা ফাংশনের লজিক আছে: ফোন ফেল করলে fingerprint/IP কাউন্টার স্পর্শই হয়
  // না (short-circuit অক্ষত, DB-তে টেস্ট করে নিশ্চিত হয়েছি), ৩০সে কুলডাউন ও advisory
  // lock (audit P1-13) অক্ষত, যেকোনো RPC এরর/এক্সেপশনে আগের মতোই fail-closed।
  if (!isPrivilegedUser) {
    try {
      const { data: limitsRaw, error: limitsErr } = await service.rpc('check_order_limits', {
        p_phone: phone,
        p_fingerprint_id: fingerprintId || null,
        p_ip: clientIp || null,
      });
      if (limitsErr) {
        logError('[checkout] order limits RPC error — fail-closed:', limitsErr.message);
        await revertLegendaryVoucherIfNeeded();
        return fail(GENERIC_RETRY_MSG);
      }
      const limits = limitsRaw as { ok?: boolean; failed?: 'phone' | 'fingerprint' | 'ip' } | null;
      if (!limits?.ok) {
        if (limits?.failed === 'phone') {
          await recordLimitHit(service, {
            type: await classifyPhoneLimit(service, phone),
            phone, fingerprintId, userId: currentUserId, ip: clientIp,
          });
        } else if (limits?.failed === 'fingerprint') {
          await recordLimitHit(service, { type: 'fingerprint_daily', phone, fingerprintId, userId: currentUserId, ip: clientIp });
        } else if (limits?.failed === 'ip') {
          await recordLimitHit(service, { type: 'ip_daily', phone, fingerprintId, userId: currentUserId, ip: clientIp });
        } else {
          // অপ্রত্যাশিত রেসপন্স শেপ — fail-closed, কোনো limit-hit লগ না (classify করা যাচ্ছে না)
          logError('[checkout] order limits RPC unexpected response — fail-closed:', JSON.stringify(limitsRaw));
        }
        await revertLegendaryVoucherIfNeeded();
        return fail(t('একটু অপেক্ষা করুন, তারপর আবার চেষ্টা করুন'));
      }
    } catch (e) {
      logError('[checkout] order limits exception — fail-closed:', e);
      await revertLegendaryVoucherIfNeeded();
      return fail(GENERIC_RETRY_MSG);
    }
  }

  let authoritativeProds: { id: string | number; name: string; price: number; stock: number; cat: string; imgs: string[] }[] = [];
  let shipCfg = DEFAULT_SHIP_CFG;

  // 🛡️ অডিট ফিক্স — প্রফিট স্ন্যাপশট: order.items (কাস্টমার নিজের account/orders
  // পেজে দেখতে পায়) এর বাইরে, আলাদা admin-only কলামে এই মুহূর্তের unit_profit
  // সংরক্ষণ করা হচ্ছে, যাতে ভবিষ্যতে প্রোডাক্ট রিনেম/ডিলিট হলেও পুরনো অর্ডারের
  // প্রফিট হিসাব এক পয়সাও না বদলায় (lib/profit.ts-এ আগে নাম মিলিয়ে হিসাব হতো)।
  let profitByProductId = new Map<string, number>();

  try {
    const [productsResult, costsResult, fetchedShipCfg] = await Promise.all([
      service
        .from('custom_products')
        .select('id, cat, name, price, stock, imgs')
        .in('id', targetProductIds),
      service.from('product_costs').select('product_id, unit_profit').in('product_id', targetProductIds),
      fetchShipConfig(service),
    ]);

    if (costsResult.data) {
      profitByProductId = new Map(
        costsResult.data.map((c) => [String(c.product_id), Number(c.unit_profit) || 0])
      );
    }

    if (productsResult.data && productsResult.data.length > 0) {
      authoritativeProds = productsResult.data.map((p) => {
        let parsedImgs = parseJsonish<string[]>(p.imgs, []);
        if (!Array.isArray(parsedImgs) || !parsedImgs.length) parsedImgs = ['📦'];
        return {
          id: p.id,
          name: p.name || '',
          price: Number(p.price) || 0,
          stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : 0,
          cat: p.cat || 'general',
          imgs: parsedImgs,
        };
      });
    }

    if (fetchedShipCfg) {
      shipCfg = fetchedShipCfg;
    }
  } catch (e) {
    logWarn('[checkout] parallel fetch failed:', e);
  }

  if (!authoritativeProds.length) {
    await revertLegendaryVoucherIfNeeded();
    return fail(t(GENERIC_RETRY_MSG));
  }

  const verifiedItems: { id: string | number; name: string; emoji: string; price: number; qty: number; cat: string }[] = [];
  const itemProfitSnapshot: { id: string | number; unit_profit: number }[] = [];
  for (const item of cleanItems) {
    const prod = authoritativeProds.find((p) => String(p.id) === item.id);
    if (!prod) {
      await revertLegendaryVoucherIfNeeded();
      return fail(t('একটি পণ্য আর পাওয়া যাচ্ছে না, পেজ রিফ্রেশ করে আবার চেষ্টা করুন'));
    }
    itemProfitSnapshot.push({
      id: prod.id,
      unit_profit: profitByProductId.get(String(prod.id)) ?? 200,
    });
    verifiedItems.push({
      id: prod.id,
      name: prod.name,
      emoji: prod.imgs[0] || '📦',
      price: prod.price,
      qty: item.qty,
      cat: prod.cat,
    });
  }

  let sc = shipPrice(shipping, shipCfg);
  const vSub = verifiedItems.reduce((s, i) => s + i.price * i.qty, 0);

  let discountAmount = 0;
  let appliedCouponCode: string | null = null;
  let couponReserved = false;

  if (couponCode) {
    try {
      const { data: couponRes, error: couponErr } = await service.rpc('validate_and_apply_coupon', {
        p_code: couponCode,
        p_subtotal: vSub,
        p_phone: phone,
        p_user_id: currentUserId,
        p_fingerprint_id: fingerprintId || null,
      });

      if (!couponErr && couponRes && couponRes.ok) {
        // 🛡️ ফিক্স (audit P1-18): আগে কুপনের ব্যবহার-সংখ্যা অর্ডার বসে যাওয়ার
        // *পরে* আলাদাভাবে বাড়ানো হতো (after() ব্লকে) — ফলে একসাথে দুইটা অর্ডার
        // একই কুপনের max_uses_total-এর শেষ স্লট নিয়ে race করলে দুটোই ডিসকাউন্ট
        // পেয়ে যেত। এখন এখানেই, ডিসকাউন্ট প্রয়োগের আগে, atomic RPC দিয়ে
        // ব্যবহার-সংখ্যা "রিজার্ভ" করা হচ্ছে — সীমা শেষ থাকলে অর্ডারই আটকে যাবে।
        const { data: reserved, error: reserveErr } = await service.rpc('reserve_coupon_usage', {
          p_code: couponRes.code,
        });
        if (reserveErr) {
          logError('[checkout] coupon reserve RPC error — fail-closed for this coupon:', reserveErr.message);
          await revertLegendaryVoucherIfNeeded();
          return fail(t('কুপন প্রয়োগ করা যায়নি, একটু পরে আবার চেষ্টা করুন'));
        }
        if (!reserved) {
          await revertLegendaryVoucherIfNeeded();
          return fail(t('দুঃখিত, এই কুপনটির ব্যবহারসীমা এইমাত্র শেষ হয়ে গেছে'));
        }
        couponReserved = true;
        appliedCouponCode = String(couponRes.code);
        discountAmount = Number(couponRes.discount_amount) || 0;
        if (couponRes.free_shipping === true) {
          sc = 0;
        }
      } else if (couponRes?.error) {
        await revertLegendaryVoucherIfNeeded();
        return fail(t(couponRes.error));
      }
    } catch (e) {
      logWarn('[checkout] coupon validation skipped:', e);
    }
  }

  // কুপন reserve হয়ে যাওয়ার পর অর্ডারটা শেষমেশ (max-total চেক/স্টক-শেষ/ইনসার্ট-
  // ব্যর্থতা) বসাতে না পারলে reserve করা ব্যবহার-সংখ্যা ফেরত দেওয়ার জন্য।
  async function revertCouponIfNeeded() {
    if (!couponReserved || !appliedCouponCode) return;
    try {
      await service.rpc('release_coupon_usage', { p_code: appliedCouponCode });
    } catch (e) {
      logError('[checkout] coupon usage release failed:', e);
    }
  }

  const effectiveProductSubtotal = Math.max(0, vSub - discountAmount);
  const vTotal = Math.max(0, effectiveProductSubtotal + sc);

  if (vTotal > MAX_ONLINE_ORDER_TOTAL && !isPrivilegedUser) {
    await revertCouponIfNeeded();
    await revertLegendaryVoucherIfNeeded();
    return fail(t('২০,০০০ টাকার বেশি অর্ডারের জন্য অনুগ্রহ করে সরাসরি WhatsApp-এ যোগাযোগ করুন'));
  }

  const advanceBreakdown = calculateAdvancePayment(vTotal);
  // 🎖️ Legendary ভাউচার সক্রিয় থাকলে টায়ার/শতাংশ যাই হোক, অগ্রিম ০ —
  // সম্পূর্ণটাই ক্যাশ অন ডেলিভারি।
  const advancePaidAmount = legendaryVoucherReserved ? 0 : advanceBreakdown.totalAdvance;

  const stockItems = cleanItems.map((i) => ({ id: i.id, qty: i.qty }));

  // (audit P2-B2) কাউন্টার ফাংশন ব্যর্থ হলে ব্যাকআপ নম্বর: সময় + র‍্যান্ডম সাফিক্স, যাতে একই মিলিসেকেন্ডে
  // দুটো অর্ডারের নম্বর এক হওয়ার সম্ভাবনা কার্যত শূন্য হয়। (আসল নম্বর DB sequence থেকে আসে — সেটা কখনো ডুপ্লিকেট হয় না;
  // তারপরও orders.order_num UNIQUE, তাই ডুপ্লিকেট হলে insert ব্যর্থ হয়ে সব রিভার্ট হয়।)
  const fallbackSuffix = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X');
  let orderNum = `#VC-${Date.now().toString(36).toUpperCase()}${fallbackSuffix}`;
  try {
    const { data: counterData, error: counterErr } = await service.rpc('increment_order_counter');
    if (!counterErr && counterData) orderNum = `#VC-${counterData}`;
  } catch {
    // fallback
  }

  let safeTxn = txn || null;
  if (safeTxn && isPrivilegedUser) {
    const { data: existingTxn } = await service
      .from('orders')
      .select('id')
      .eq('payment_txn', safeTxn)
      .limit(1);

    if (existingTxn && existingTxn.length > 0) {
      safeTxn = `${safeTxn}-${Date.now().toString(36).toUpperCase().slice(-3)}`;
    }
  }

  const primaryPayload: Record<string, unknown> = {
    order_num: orderNum,
    created_at: new Date().toISOString(),
    customer_name: name,
    customer_phone: phone,
    customer_district: dist,
    customer_address: addr,
    customer_email: email,
    items: verifiedItems,
    shipping,
    shipping_cost: sc,
    subtotal: vSub,
    total: vTotal,
    discount_amount: discountAmount,
    coupon_code: appliedCouponCode,
    advance_paid: advancePaidAmount,
    payment_txn: safeTxn,
    payment_last4: last4,
    fingerprint_id: fingerprintId || null,
    client_ip: clientIp || null,
    idempotency_key: idemKeyForInsert,
    status: 'pending',
    ...(currentUserId ? { user_id: currentUserId } : {}),
  };

  // 🛡️ ফিক্স (audit ২.১ — non-atomic checkout transaction / "split-brain race condition"):
  // আগে স্টক কমানো (decrement_product_stock) আর অর্ডার-ইনসার্ট দুইটা আলাদা নেটওয়ার্ক
  // রিকোয়েস্টে হতো — ঠিক এই দুইয়ের মাঝখানে সার্ভারলেস প্রসেস কিল/টাইমআউট হলে স্টক
  // কাটা থেকে যেত অথচ অর্ডার তৈরি হতো না (overselling, silent data loss)। এখন দুটোই
  // একটা একক PostgreSQL ফাংশনে (create_order_atomic, migration: checkout_atomic_order_creation) —
  // ভেতরে decrement_product_stock কল করে স্টক কমে, তারপর একই ফাংশন-কলের ভেতরেই orders
  // ইনসার্ট হয়। যেকোনো একটা ধাপ ব্যর্থ হলে (ইনসাফিশিয়েন্ট স্টক, ডুপ্লিকেট কী, যেকোনো
  // constraint ভায়োলেশন) Postgres নিজে থেকেই পুরো ফাংশনের সব পরিবর্তন রোলব্যাক করে দেয় —
  // তাই "স্টক কাটা গেছে, অর্ডার হয়নি" অবস্থা আর কখনো হতে পারবে না।
  const { data: atomicOrderId, error: atomicErr } = await service.rpc('create_order_atomic', {
    p_items: stockItems,
    p_order: primaryPayload,
  });

  const insResult: { data: { id: string } | null; error: typeof atomicErr } =
    atomicErr || !atomicOrderId
      ? { data: null, error: atomicErr }
      : { data: { id: atomicOrderId as string }, error: null };

  if (insResult.error || !insResult.data) {
    const atomicErrMsg = String(insResult.error?.message || '');
    logError('[checkout] atomic order creation failed:', atomicErrMsg, '| Code:', insResult.error?.code);
    await revertCouponIfNeeded();
    await revertLegendaryVoucherIfNeeded();

    // স্টক-সংক্রান্ত ব্যর্থতা (decrement_product_stock-এর ভেতর থেকে আসা এক্সেপশন)
    if (atomicErrMsg.includes('INSUFFICIENT_STOCK')) {
      return fail(t('দুঃখিত, একটি পণ্য স্টকে নেই বা পরিমাণ যথেষ্ট নেই'));
    }

    if (insResult.error?.code === '23505') {
      const dupMsg = atomicErrMsg;
      // (audit P2-B1) একই মুহূর্তে আসা "জমজ" রিকোয়েস্ট: অন্যটা আগেই অর্ডার বানিয়ে ফেলেছে →
      // এই রিকোয়েস্টের স্টক/কুপন/ভাউচার ওপরে রিভার্ট হয়ে গেছে; কাস্টমারকে আগের অর্ডারটাই দেখাই।
      if (idemKeyForInsert && dupMsg.includes('idempotency_key')) {
        try {
          const twin = await findOrderByIdempotencyKey(service, idemKeyForInsert, phone, cleanItems);
          if (twin && twin !== 'mismatch') {
            return { ok: true, data: { id: twin.id, orderNum: twin.orderNum } };
          }
        } catch (e) {
          logWarn('[checkout] idempotency twin lookup failed:', e);
        }
        return fail(GENERIC_RETRY_MSG);
      }
      // (audit P2-B2) অর্ডার-নম্বর সংঘর্ষ ট্রানজেকশন-ডুপ্লিকেটের ভুল বার্তা পেত; এখন আলাদা
      if (dupMsg.includes('order_num')) {
        return fail(GENERIC_RETRY_MSG);
      }
      return fail(t('এই ট্রানজেকশন আইডি দিয়ে ইতিমধ্যে একটি অর্ডার হয়েছে'));
    }
    return fail(t('দুঃখিত, অর্ডার সেভ করা যায়নি। আবার চেষ্টা করুন।'));
  }

  // 🔒 প্রতি ইউনিট প্রফিটের স্ন্যাপশট `orders`-এ নয় — গোপন `order_private` টেবিলে (ব্রাউজারের কোনো
  // অনুমতি নেই, শুধু service_role)। তাই কাস্টমার API বা রিয়েলটাইমে কখনো দেখতে পায় না।
  // ব্যর্থ হলে অর্ডার আটকায় না: অ্যাডমিন প্যানেল তখন প্রোডাক্টের বর্তমান প্রফিট দিয়ে হিসাব করে।
  try {
    const { error: privErr } = await service
      .from('order_private')
      .upsert({ order_id: insResult.data.id, item_profit_snapshot: itemProfitSnapshot }, { onConflict: 'order_id' });
    if (privErr) logWarn('[checkout] order_private snapshot save failed:', privErr.message);
  } catch (e) {
    logWarn('[checkout] order_private snapshot save threw:', e);
  }

  // 🎖️ ভাউচার স্থায়ীভাবে ব্যবহৃত হিসেবে মার্ক (is_available ইতিমধ্যে reserve
  // করার সময় false হয়ে গেছে — এখানে শুধু used_at/used_order_id রেকর্ড রাখা)
  if (legendaryVoucherReserved && currentUserId) {
    try {
      await service
        .from('legendary_vouchers')
        .update({ used_at: new Date().toISOString(), used_order_id: insResult.data.id })
        .eq('user_id', currentUserId);
    } catch (e) {
      logError('[checkout] legendary voucher finalize (used_at) failed:', e);
    }
  }

  // 🛡️ ফিক্স (audit P1-18): কুপনের ব্যবহার-সংখ্যা এখন উপরে validate-এর সময়েই
  // atomically reserve হয়ে গেছে (reserve_coupon_usage) — এখানে আবার
  // increment_coupon_usage কল করলে একই অর্ডারে দুইবার গোনা হতো, তাই বাদ।

  // ⚡ বিকাশ এসএমএস আগেই জমা থাকলে (কাস্টমার আগে টাকা পাঠিয়েছে) এখনই অটো-কনফার্ম।
  // না মিললে বা এরর হলে অর্ডার pending-ই থাকে — পরে webhook বা অ্যাডমিন কনফার্ম করবে।
  let autoConfirm: { method: 'auto_trxid' | 'auto_last4'; amount: number; overpaid: number; sender: string; trxId: string | null } | null = null;
  if (advancePaidAmount > 0 && (safeTxn || last4)) {
    try {
      const { data: matchRes } = await service.rpc('match_bkash_payment', { p_order_id: insResult.data.id });
      if (matchRes?.success) {
        autoConfirm = {
          method: matchRes.method,
          amount: Number(matchRes.amount) || advancePaidAmount,
          overpaid: Number(matchRes.overpaid) || 0,
          sender: String(matchRes.sender ?? ''),
          trxId: matchRes.trx_id ?? null,
        };
      }
    } catch (e) {
      logWarn('[checkout] instant bkash match failed (order stays pending):', e);
    }
  }

  // 🛡️ ট্রাস্ট স্কোর (শুধু অ্যাডমিনের নীরব মার্কিং) — ব্যাকগ্রাউন্ডে, কাস্টমারের রেসপন্স আটকায় না;
  // ব্যর্থ হলেও অর্ডারে কোনো প্রভাব নেই (scoreAndSaveOrderRisk কখনো throw করে না)।
  // স্কোরিং এখানে একবারই শুরু হয়; সেভ শেষ হওয়ার গ্যারান্টি নিচের after() দেয়, আর Telegram মেসেজ
  // ফলাফলের জন্য সর্বোচ্চ ২.৫ সেকেন্ড অপেক্ষা করে (না এলে ট্রাস্ট লাইন ছাড়াই আগের মতো যায়)।
  const riskPromise = scoreAndSaveOrderRisk(service, {
    orderId: String(insResult.data.id),
    name,
    phone,
    email,
    district: dist,
    address: addr,
    total: vTotal,
    items: cleanItems,
    userId: currentUserId,
    loginEmail: currentUserEmail,
    fingerprintId,
    ip: clientIp,
    geo: clientGeo,
    advance: {
      amount: advancePaidAmount,
      senderNumber: autoConfirm?.sender || last4 || null,
      transactionId: safeTxn || null,
      verified: !!autoConfirm,
    },
  });
  after(() => riskPromise);

  after(async () => {
    try {
      const risk = await waitForRisk(riskPromise, 2500);
      await sendTelegramOrderNotification({
        orderNum,
        name,
        phone,
        district: dist,
        address: addr,
        email,
        items: verifiedItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        total: vTotal,
        advancePaid: advancePaidAmount,
        shippingCost: sc,
        paymentTxn: safeTxn || undefined,
        paymentLast4: last4 || undefined,
        risk: risk ? { level: risk.level, score: risk.score, reasons: topRiskReasons(risk) } : null,
      });
      if (autoConfirm) {
        await sendTelegramPaymentAutoConfirm({
          orderNum, name, phone,
          method: autoConfirm.method,
          receivedAmount: autoConfirm.amount,
          advanceRequired: advancePaidAmount,
          overpaid: autoConfirm.overpaid,
          sender: autoConfirm.sender,
          trxId: autoConfirm.trxId,
          total: vTotal,
        });
      }
    } catch (err) {
      logWarn('[checkout] telegram background notification error:', err);
    }
  });

  return { ok: true, data: { id: insResult.data.id, orderNum } };
}
