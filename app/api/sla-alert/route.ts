import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import { sendTelegramSlaAlert } from '@/lib/telegram';
import { logWarn, logError } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SlaOrderRow {
  id: string;
  order_num: string;
  customer_name: string | null;
  customer_phone: string | null;
  payment_txn: string | null;
  payment_last4: string | null;
  advance_paid: number | string | null;
  created_at: string;
}

// ডাটাবেজের pg_cron প্রতি মিনিটে ডাকে। সিক্রেট ভল্টে রাখা এবং ডাটাবেজ ফাংশন দিয়ে যাচাই হয় —
// কোডে বা এনভায়রনমেন্টে কোনো সিক্রেট রাখতে হয় না।
export async function POST(req: NextRequest) {
  const provided = req.headers.get('x-sla-secret');
  if (!provided) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { data: valid, error: verifyErr } = await supabase.rpc('verify_sla_secret', { p_secret: provided });
    if (verifyErr || valid !== true) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // ৫ মিনিট পার হওয়া পেন্ডিং অর্ডারগুলো atomically "alerted" চিহ্নিত করে ফেরত আসে — প্রতিটা অর্ডারে একবারই।
    const { data, error } = await supabase.rpc('claim_sla_alert_orders');
    if (error) {
      logError('[sla-alert] claim rpc failed:', error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const rows = (Array.isArray(data) ? data : []) as SlaOrderRow[];
    let sent = 0;
    const failedIds: string[] = [];

    for (const row of rows) {
      const waitedMinutes = Math.max(5, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 60000));
      const ok = await sendTelegramSlaAlert({
        orderNum: String(row.order_num),
        name: String(row.customer_name ?? ''),
        phone: String(row.customer_phone ?? ''),
        paymentTxn: row.payment_txn,
        paymentLast4: row.payment_last4,
        advance: Number(row.advance_paid) || 0,
        waitedMinutes,
      });
      if (ok) sent += 1;
      else failedIds.push(row.id);
    }

    // টেলিগ্রামে না গেলে পরের মিনিটে আবার চেষ্টার জন্য চিহ্ন তুলে নেওয়া হয়
    if (failedIds.length > 0) {
      const { error: resetErr } = await supabase
        .from('orders')
        .update({ sla_alerted_at: null })
        .in('id', failedIds)
        .eq('status', 'pending');
      if (resetErr) logWarn('[sla-alert] could not reset alert flag:', resetErr.message);
    }

    return NextResponse.json({ ok: true, claimed: rows.length, sent });
  } catch (err) {
    logError('[sla-alert] unexpected error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
