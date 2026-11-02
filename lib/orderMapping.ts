// [REPLACE] ফাইলের পাথ: lib/orderMapping.ts

import type { Order, OrderItem } from '@/types';

export function mapSupabaseOrderRow(row: Record<string, unknown>): Order {
  let items: OrderItem[] = [];
  try {
    items = typeof row.items === 'string' ? JSON.parse(row.items) : ((row.items as OrderItem[]) || []);
  } catch {
    items = [];
  }

  // অর্ডার তৈরির সময় ছবির লিংক আইটেমের `emoji` ফিল্ডে সেভ হয় (app/actions/checkout.ts),
  // কিন্তু ইনভয়েস, অর্ডার কার্ড ইত্যাদি `imgs[0]` থেকে ছবি পড়ে — তাই এখানে দুটো মিলিয়ে দেওয়া হয়।
  items = (Array.isArray(items) ? items : []).map((it) => {
    const raw = it as OrderItem & { emoji?: string };
    const hasImgs = Array.isArray(raw.imgs) && raw.imgs.length > 0 && !!raw.imgs[0];
    if (hasImgs || !raw.emoji) return it;
    return { ...it, imgs: [raw.emoji] };
  });

  const customer = (row.customer as Order['customer']) || {
    name: (row.customer_name as string) || '',
    phone: (row.customer_phone as string) || '',
    district: (row.customer_district as string) || '',
    address: (row.customer_address as string) || '',
    email: (row.customer_email as string) || '',
  };

  return {
    id: row.id as string | number,
    orderNum: (row.order_num as string) || (row.orderNum as string) || '',
    date: (row.created_at as string) || (row.date as string) || new Date().toISOString(),
    status: ((row.status as Order['status']) || 'pending'),
    total: Number(row.total) || 0,
    subtotal: Number(row.subtotal) || 0,
    shippingCost: Number(row.shipping_cost ?? row.shippingCost ?? 0),
    shipping: (row.shipping as string) || 'bd',
    advancePaid: Number(row.advance_paid ?? row.advancePaid ?? 200),
    items,
    customer,
    couponCode: (row.coupon_code as string) || (row.couponCode as string) || undefined,
    discountAmount: Number(row.discount_amount ?? row.discountAmount ?? 0),
    payment: (row.payment as Order['payment']) || {
      txnId: (row.payment_txn as string) || '',
      last4: (row.payment_last4 as string) || '',
    },
  };
}
