import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';
import { sendTelegramUnmatchedBkashAlert } from '@/lib/telegram';
import { logWarn, logError } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UnmatchedRow {
  id: number | string;
  trx_id: string | null;
  sender_number: string | null;
  sender_last4: string | null;
  amount: number | string | null;
  created_at: string;
}

// ডাটাবেজের pg_cron প্রতি ১০ মিনিটে ডাকে (sla-alert-এর একই সিক্রেট ও যাচাই পদ্ধতি)।
// যে বিকাশ ট্রানজেকশন ২ ঘণ্টা পরও কোনো অর্ডারের সাথে মেলেনি, সেগুলো atomically "alerted" চিহ্নিত
// হয়ে ফেরত আসে — প্রতিটা ট্রানজেকশনে একবারই টেলিগ্রাম যায়।
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

    const { data, error } = await supabase.rpc('claim_unmatched_bkash_payments');
    if (error) {
      logError('[bkash-unmatched-alert] claim rpc failed:', error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const rows = (Array.isArray(data) ? data : []) as UnmatchedRow[];
    let sent = 0;
    const failedIds: (number | string)[] = [];

    for (const row of rows) {
      const waitedMinutes = Math.max(120, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 60000));
      const ok = await sendTelegramUnmatchedBkashAlert({
        trxId: row.trx_id,
        senderNumber: row.sender_number,
        senderLast4: row.sender_last4,
        amount: Number(row.amount) || 0,
        waitedMinutes,
      });
      if (ok) sent += 1;
      else failedIds.push(row.id);
    }

    // টেলিগ্রামে না গেলে পরের রানে আবার চেষ্টার জন্য চিহ্ন তুলে নেওয়া হয়
    if (failedIds.length > 0) {
      const { error: resetErr } = await supabase
        .from('bkash_inbox')
        .update({ unmatched_alerted_at: null })
        .in('id', failedIds)
        .eq('is_used', false);
      if (resetErr) logWarn('[bkash-unmatched-alert] could not reset alert flag:', resetErr.message);
    }

    return NextResponse.json({ ok: true, claimed: rows.length, sent });
  } catch (err) {
    logError('[bkash-unmatched-alert] unexpected error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
