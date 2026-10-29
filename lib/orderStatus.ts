import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { OrderStatus } from '@/types';

export const PENDING_ORDER_MAX_AGE_MS = 48 * 60 * 60 * 1000;
export const RESOLVED_ORDER_STATUSES: OrderStatus[] = ['confirmed', 'shipped', 'delivered', 'cancelled', 'rejected'];

export const ORDER_TRACK_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'pending', label: 'অর্ডার গ্রহণ করা হয়েছে', icon: '🧾' },
  { key: 'confirmed', label: 'কনফার্ম হয়েছে', icon: '✅' },
  { key: 'shipped', label: 'পাঠানো হয়েছে', icon: '🚚' },
  { key: 'delivered', label: 'ডেলিভারি সম্পন্ন', icon: '📦' },
];

function getTimeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }
  return undefined;
}

export const PENDING_QUIET_KEY = 'vc_pending_quiet';

export function clearPendingOrder(): void {
  try {
    localStorage.removeItem('vc_pending_ls');
    localStorage.removeItem('vc_pending_num_ls');
    localStorage.removeItem('vc_pending_ts');
    localStorage.removeItem('vc_pending_phone_ls');
    localStorage.removeItem(PENDING_QUIET_KEY);
  } catch {
    // ignore
  }
}

// কাস্টমার ৫ মিনিটের স্ক্রিন পেরিয়ে "ঠিক আছে" চাপলে অর্ডারের ট্র্যাকিং মার্কার মোছা হয় না;
// শুধু "কোয়াইট" চিহ্ন বসে। তখন পেন্ডিং থাকা পর্যন্ত কোনো UI দেখানো হয় না,
// কিন্তু কনফার্ম/রিজেক্ট হলে (১-২ ঘণ্টা পরে ঢুকলেও) সঠিক পপআপ দেখানো হয়।
export function softenPendingOrder(): void {
  try {
    if (localStorage.getItem('vc_pending_ls')) localStorage.setItem(PENDING_QUIET_KEY, '1');
  } catch {
    // ignore
  }
}

export function isPendingQuiet(): boolean {
  try {
    return localStorage.getItem(PENDING_QUIET_KEY) === '1';
  } catch {
    return false;
  }
}

export function resetPendingQuiet(): void {
  try {
    localStorage.removeItem(PENDING_QUIET_KEY);
  } catch {
    // ignore
  }
}

export function readPendingLockInfo(): { id: string; orderNum: string; phone: string; ts: number } | null {
  const pending = readPendingOrder();
  if (!pending) return null;
  try {
    const ts = parseInt(localStorage.getItem('vc_pending_ts') || '0', 10);
    if (!ts) return null;
    return { ...pending, ts };
  } catch {
    return null;
  }
}

export function readPendingOrder(): { id: string; orderNum: string; phone: string } | null {
  try {
    const id = localStorage.getItem('vc_pending_ls');
    const num = localStorage.getItem('vc_pending_num_ls');
    const phone = localStorage.getItem('vc_pending_phone_ls') || '';
    const ts = parseInt(localStorage.getItem('vc_pending_ts') || '0', 10);
    if (id && num && ts && Date.now() - ts < PENDING_ORDER_MAX_AGE_MS) return { id, orderNum: num, phone };
    if (id) clearPendingOrder();
    return null;
  } catch {
    return null;
  }
}

export function readLatestGuestOrder(): { id: string; orderNum: string; phone: string } | null {
  try {
    const list = JSON.parse(localStorage.getItem('vc_guest_orders') || '[]') as
      { id?: string; orderNum?: string; phone?: string }[];
    if (!list.length) return null;
    const last = list[list.length - 1];
    if (!last?.id || !last?.orderNum || !last?.phone) return null;
    return { id: last.id, orderNum: last.orderNum, phone: last.phone };
  } catch {
    return null;
  }
}

// কাস্টমারকে দেখানো নিরাপদ অর্ডার কলাম (DB-র get_guest_order() ফাংশনের রিটার্ন তালিকার সাথে মেলানো)
const ORDER_PUBLIC_COLUMNS =
  'id, order_num, date, customer_name, customer_phone, customer_district, customer_address, customer_email, ' +
  'items, shipping, shipping_cost, subtotal, total, payment_txn, payment_last4, status, user_id, ' +
  'created_at, coupon_code, discount_amount, advance_paid';

export async function fetchFullOrder(
  supabase: SupabaseClient,
  orderId: string,
  phone?: string,
): Promise<Record<string, unknown> | null> {
  try {
    let hasLiveSession = false;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      hasLiveSession = !!sessionData?.session;
    } catch {
      hasLiveSession = false;
    }

    const signal = getTimeoutSignal(5000);

    if (hasLiveSession) {
      try {
        const { data, error } = await supabase
          .from('orders')
          // 🔒 select('*') নয়: orders-এ অ্যাডমিন-অভ্যন্তরীণ কলাম আছে (যেমন item_profit_snapshot — প্রতি ইউনিট
          // লাভ) যা কাস্টমারের ব্রাউজারে যাওয়া চলবে না। তালিকাটা get_guest_order RPC-র রিটার্ন কলামের হুবহু
          // একই — তাই লগইন করা ও গেস্ট দুই পথে একই শেপ আসে।
          .select(ORDER_PUBLIC_COLUMNS)
          .eq('id', orderId)
          .abortSignal(signal as any)
          .single();
        if (!error && data) return data as unknown as Record<string, unknown>;
      } catch {
        // fall through to phone fallback
      }
    }

    const fallbackPhone = phone
      || (typeof window !== 'undefined'
        ? (localStorage.getItem('vc_pending_phone_ls') || readLatestGuestOrder()?.phone || undefined)
        : undefined);

    if (fallbackPhone) {
      const cleanPhone = String(fallbackPhone).trim();
      const { data, error } = await supabase
        .rpc('get_guest_order', { p_id: String(orderId), p_phone: cleanPhone })
        .abortSignal(signal as any);
      if (!error && data && data.length) return data[0] as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function watchOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  phone: string | undefined,
  onUpdate: (status: OrderStatus) => void,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let channel: RealtimeChannel | null = null;
  let realtimeCloseTimer: ReturnType<typeof setTimeout> | null = null;
  const startTime = Date.now();
  const MAX_POLL_DURATION_MS = PENDING_ORDER_MAX_AGE_MS;
  // রিয়েলটাইম কানেকশন শুধু প্রথম ২ মিনিট খোলা থাকবে (যখন কাস্টমার সাধারণত পেজে বসে
  // স্ট্যাটাস দেখে), তারপর বন্ধ হয়ে যাবে — এর পরে শুধু নিচের adaptive পোলিং চলবে।
  // আগে দুটোই (রিয়েলটাইম + পোলিং) পুরো ট্র্যাকিং সময়জুড়ে (৪৮ ঘণ্টা পর্যন্ত) একসাথে
  // চলত, যা Supabase ফ্রি প্ল্যানের ২০০ কনকারেন্ট রিয়েলটাইম কানেকশন সীমার ওপর
  // অপ্রয়োজনীয় চাপ ফেলত।
  const REALTIME_WINDOW_MS = 2 * 60 * 1000;

  function getNextInterval(): number {
    const elapsed = Date.now() - startTime;
    if (elapsed < 60 * 1000) return 6000;
    if (elapsed < 5 * 60 * 1000) return 15000;
    if (elapsed < 30 * 60 * 1000) return 30000;
    return 120000;
  }

  async function checkStatus() {
    if (stopped) return;

    if (Date.now() - startTime >= MAX_POLL_DURATION_MS) {
      stop();
      return;
    }

    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    const row = await fetchFullOrder(supabase, orderId, phone);
    if (row && row.status) {
      const st = row.status as OrderStatus;
      onUpdate(st);
      if (RESOLVED_ORDER_STATUSES.includes(st)) {
        stop();
        return;
      }
    }

    if (!stopped) {
      scheduleNext(getNextInterval());
    }
  }

  function scheduleNext(delayMs: number) {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(checkStatus, delayMs);
  }

  // Realtime শুধু লগইন-করা ইউজারের জন্য: orders টেবিলে anon-এর SELECT নেই, তাই গেস্টের সকেটে কখনো
  // ইভেন্ট আসত না — গেস্ট শুধু নিচের পোলিং (get_guest_order) দিয়ে স্ট্যাটাস পায়।
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (stopped || !data?.session) return;
      const uniqueChannelName = `order-status-${orderId}-${Math.random().toString(36).slice(2, 7)}`;
      channel = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
          (payload) => {
            if (stopped) return;
            const updatedRow = payload.new as { status?: OrderStatus };
            if (updatedRow?.status) {
              onUpdate(updatedRow.status);
              if (RESOLVED_ORDER_STATUSES.includes(updatedRow.status)) {
                stop();
              }
            }
          }
        )
        .subscribe();

      realtimeCloseTimer = setTimeout(() => {
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
        }
      }, REALTIME_WINDOW_MS);
    } catch {
      // পোলিংই ফলব্যাক
    }
  })();

  const onVisibilityChange = () => {
    if (stopped) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      checkStatus();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  scheduleNext(5000);

  function stop() {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (realtimeCloseTimer) {
      clearTimeout(realtimeCloseTimer);
      realtimeCloseTimer = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  }

  return stop;
}
