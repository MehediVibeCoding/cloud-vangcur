import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import { sendTelegramPaymentAutoConfirm } from '@/lib/telegram';
import { logWarn, logError } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// এর বেশি টাকার মেসেজ ব্যক্তিগত লেনদেন ধরে পুরোপুরি উপেক্ষা করা হয় (ডাটাবেজেও ঢোকে না)।
const MAX_AMOUNT = Number(process.env.BKASH_MAX_AMOUNT) || 6000;
// TrxID ইউনিক (একবারই হয়) তাই বেশি সময়; শেষ ৪ ডিজিট দিয়ে ম্যাচিং-এ ভুলের ঝুঁকি বেশি তাই কম সময়।
// (ডাটাবেজের match_bkash_payment ফাংশনের উইন্ডোর সাথে মিল রাখা হয়েছে)
const TRXID_WINDOW_MS = 10 * 60 * 60 * 1000;
const LAST4_WINDOW_MS = 6 * 60 * 60 * 1000;

// সিক্রেট শুধু এনভায়রনমেন্ট ভেরিয়েবল থেকে — কোডে কোনো ডিফল্ট রাখা হয়নি (রিপো পাবলিক)।
function secretOk(provided: string | null): boolean {
  const expected = process.env.BKASH_WEBHOOK_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// INTENTIONAL: পেমেন্ট ম্যাচিংয়ের আসল সুরক্ষা DB-তে — `match_bkash_payment` ফাংশন (TrxID ইউনিক, শেষ-৪-ডিজিট
// পথে একই last4-এর অন্য পেন্ডিং অর্ডার বা TrxID-সংঘর্ষ থাকলে স্বয়ংক্রিয় ম্যাচ হয় না, অ্যাডমিন দেখে)।
// এই রুট শুধু সিক্রেট যাচাই করে inbox-এ লেখে ও ফাংশন ডাকে।
export async function POST(req: NextRequest) {
  if (!secretOk(req.headers.get('x-bkash-secret'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }

  const rawText = String(body.text ?? '').trim().slice(0, 1000);
  const fromSender = String(body.from ?? '').trim();

  if (!fromSender.toLowerCase().includes('bkash') || !/received\s+Tk/i.test(rawText)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const amountMatch = rawText.match(/received\s+Tk\s*([\d,]+(?:\.\d+)?)/i);
  const senderMatch = rawText.match(/from\s*(01\d{9})/i);
  const trxMatch = rawText.match(/TrxID\s*:?\s*([A-Z0-9]{8,14})/i);
  if (!amountMatch || !senderMatch) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  const senderNumber = senderMatch[1];
  const senderLast4 = senderNumber.slice(-4);
  const trxId = trxMatch ? trxMatch[1].toUpperCase() : null;

  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const supabase = createServiceClient();

    const { error: insertErr } = await supabase.from('bkash_inbox').insert({
      trx_id: trxId,
      sender_number: senderNumber,
      sender_last4: senderLast4,
      amount,
      raw_sms: rawText,
      is_used: false,
    });

    if (insertErr) {
      // একই TrxID আবার এলে (ফোন রিট্রাই) নিরাপদে বাদ। অন্য কোনো এরর হলে 500 দিই,
      // যাতে SMS ফরওয়ার্ডার অ্যাপ পরে আবার পাঠায় (মেসেজ হারায় না)।
      if (insertErr.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
      logError('[bkash-webhook] inbox insert failed:', insertErr.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    // রিভার্স ম্যাচিং: TrxID মিললে গত ১০ ঘণ্টার, শেষ ৪ ডিজিট মিললে গত ৬ ঘণ্টার পেন্ডিং অর্ডার
    const sinceTrx = new Date(Date.now() - TRXID_WINDOW_MS).toISOString();
    const sinceLast4 = new Date(Date.now() - LAST4_WINDOW_MS).toISOString();
    const cols = 'id, order_num, customer_name, customer_phone, total, advance_paid, created_at';
    const candidates: Record<string, unknown>[] = [];

    if (trxId) {
      const { data } = await supabase
        .from('orders').select(cols)
        .eq('status', 'pending').eq('payment_verified', false)
        .ilike('payment_txn', trxId).gte('created_at', sinceTrx);
      if (data) candidates.push(...data);
    }
    const { data: byLast4 } = await supabase
      .from('orders').select(cols)
      .eq('status', 'pending').eq('payment_verified', false)
      .eq('payment_last4', senderLast4).gte('created_at', sinceLast4);
    if (byLast4) candidates.push(...byLast4);

    const seen = new Set<string>();
    const ordered = candidates
      .filter((o) => (seen.has(String(o.id)) ? false : (seen.add(String(o.id)), true)))
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

    for (const order of ordered) {
      const { data: res, error } = await supabase.rpc('match_bkash_payment', { p_order_id: order.id });
      if (error) {
        logWarn('[bkash-webhook] match rpc error:', error.message);
        continue;
      }
      if (res?.success) {
        await sendTelegramPaymentAutoConfirm({
          orderNum: String(order.order_num),
          name: String(order.customer_name ?? ''),
          phone: String(order.customer_phone ?? ''),
          method: res.method,
          receivedAmount: Number(res.amount) || amount,
          advanceRequired: Number(order.advance_paid) || 0,
          overpaid: Number(res.overpaid) || 0,
          sender: String(res.sender ?? senderNumber),
          trxId: res.trx_id ?? trxId,
          total: Number(order.total) || 0,
        });
        break; // একটা পেমেন্ট শুধু একটা অর্ডারে লাগে
      }
    }

    return NextResponse.json({ ok: true, recorded: true });
  } catch (err) {
    logError('[bkash-webhook] unexpected error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
