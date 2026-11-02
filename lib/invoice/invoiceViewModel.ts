import type { Order } from '@/types';

export interface InvoiceViewModel {
  ds: string;
  advancePaid: number;
  balanceDue: number;
  isFreeShipping: boolean;
  dueMsg: string;
}

export function buildInvoiceViewModel(order: Order): InvoiceViewModel {
  const ds = order.date
    ? new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
  const advancePaid = order.advancePaid || 200;
  const balanceDue = Math.max(0, (order.total || 0) - advancePaid);
  const isFreeShipping = Number(order.shippingCost) === 0;

  const dueMsg = balanceDue > 0
    ? `Hey! Please hand ৳${balanceDue.toLocaleString('en-US')} to the delivery man when you receive your package — that's your remaining balance (COD). Make sure to record a continuous unboxing video from the top (no cuts or pauses). This video is mandatory for any warranty claim. Enjoy your order! 🎉`
    : `Great news — you've already paid in full! Once you receive your package, make sure to record a continuous unboxing video from the top (no cuts or pauses). This video is mandatory for any warranty claim. Enjoy your order! 🎉`;

  return { ds, advancePaid, balanceDue, isFreeShipping, dueMsg };
}
