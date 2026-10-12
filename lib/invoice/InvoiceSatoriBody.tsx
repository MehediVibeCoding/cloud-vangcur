// এই ফাইলটা lib/invoice/InvoiceCardBody.tsx-এর একটা satori-compatible
// "ভাই" কম্পোনেন্ট — শুধু app/api/invoice/png/route.ts (সার্ভার-সাইড PNG
// জেনারেশন) থেকে ব্যবহার হয়। অন-স্ক্রিন প্রিভিউ (app/checkout/invoice/
// InvoiceClient.tsx) এখনও আগের InvoiceCardBody.tsx-ই ব্যবহার করে, সেটা
// এখানে ছোঁয়া হয়নি।
//
// ⚠️ গুরুত্বপূর্ণ: InvoiceCardBody.tsx-এর নিজের কমেন্টে একটা নিয়ম লেখা
// ছিল — "স্ক্রিনে যা দেখা যায় আর ডাউনলোড হওয়া ছবিতে যা থাকে, এই দুটো
// কখনোই আলাদা হতে পারবে না"। satori-তে মাইগ্রেট করার পর এই গ্যারান্টি আর
// টেকনিক্যালি automatic না — টেমপ্লেট এখন দুই জায়গায় (এই ফাইল +
// InvoiceCardBody.tsx), তাই ভবিষ্যতে ইনভয়েসের ডিজাইন বদলালে দুটো ফাইলই
// হাতে করে মিলিয়ে বদলাতে হবে, নাহলে প্রিভিউ আর ডাউনলোড ছবি আলাদা দেখাবে।
//
// satori-র সীমাবদ্ধতার কারণে মূল কম্পোনেন্ট থেকে যা বদলানো হয়েছে:
//  - <img> src সবসময় আগে থেকে resolve করা data: URI (logo, প্রোডাক্ট
//    থাম্বনেইল) — satori নিজে কোনো ছবি fetch করে না।
//  - letterSpacing-এ ইউনিট-সহ স্ট্রিং ('2px') এর বদলে প্লেইন নাম্বার।
//  - &nbsp; এর বদলে আসল non-breaking space ক্যারেক্টার (\u00A0)।
//  - emoji (📦 📞 ✉️ 🌐 🎉) satori-তে normal font দিয়ে আঁকা যায় না —
//    renderInvoiceSvg.ts-এ graphemeImages দিয়ে ছবি হিসেবে বসানো হয়।

import type { Order } from '@/types';
import { SOCIAL_BADGE_ICONS } from './socialBadgeIcons';

export const INVOICE_SATORI_WIDTH = 480;

export interface InvoiceSatoriContact {
  phoneLabel: string;
  email: string;
}

function ItemThumbSatori({ dataUri }: { dataUri: string | null }) {
  if (dataUri) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={dataUri}
        alt=""
        width={32}
        height={32}
        style={{
          width: 32,
          height: 32,
          objectFit: 'cover',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          display: 'block',
        }}
      />
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        fontSize: 16,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
      }}
    >
      📦
    </div>
  );
}

export type InvoiceSatoriBodyProps = {
  order: Order;
  ds: string;
  contact: InvoiceSatoriContact;
  dueMsg: string;
  advancePaid: number;
  balanceDue: number;
  isFreeShipping: boolean;
  logoDataUri: string | null;
  itemImageDataUris: (string | null)[];
};

export function InvoiceSatoriBody({
  order,
  ds,
  contact,
  dueMsg,
  advancePaid,
  balanceDue,
  isFreeShipping,
  logoDataUri,
  itemImageDataUris,
}: InvoiceSatoriBodyProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: INVOICE_SATORI_WIDTH,
        backgroundColor: '#FFFFFF',
        color: '#1E293B',
        borderRadius: 20,
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        fontFamily: "'DM Sans', 'Hind Siliguri'",
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 22px 26px',
          width: '100%',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            borderBottom: '1px solid #F1F5F9',
            paddingBottom: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            {logoDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoDataUri} alt="Vangcur" height={34} style={{ height: 34, display: 'block' }} />
            ) : (
              <div style={{ display: 'flex', fontSize: 20, fontWeight: 800, color: '#44A7FC' }}>Vangcur</div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 2,
              color: '#64748B',
              marginBottom: 10,
            }}
          >
            YOUR FIRST CHOICE FOR GADGETS
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 16px',
              borderRadius: 20,
              backgroundColor: '#F0F7FF',
              border: '1.5px solid #BAE0FD',
              fontSize: 12,
              fontWeight: 700,
              color: '#334155',
            }}
          >
            <div style={{ display: 'flex' }}>
              <span>Order:&nbsp;</span>
              <span style={{ color: '#44A7FC', fontWeight: 700 }}>{order.orderNum}</span>
            </div>
            {ds ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#93C5FD', margin: '0 6px' }}>•</span>
                <span style={{ color: '#475569', fontWeight: 600 }}>{ds}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Customer Details */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.8,
              color: '#44A7FC',
              marginBottom: 6,
            }}
          >
            CUSTOMER DETAILS
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: 'flex', marginBottom: 6 }}>
              <div style={{ display: 'flex', width: '50%', paddingRight: 6 }}>
                <span style={{ color: '#64748B' }}>Name:&nbsp;</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{order.customer?.name || '-'}</span>
              </div>
              <div style={{ display: 'flex', width: '50%', paddingLeft: 6 }}>
                <span style={{ color: '#64748B' }}>Phone:&nbsp;</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{order.customer?.phone || '-'}</span>
              </div>
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ display: 'flex', width: '50%', paddingRight: 6 }}>
                <span style={{ color: '#64748B' }}>District:&nbsp;</span>
                <span style={{ color: '#0F172A', fontWeight: 700 }}>{order.customer?.district || '-'}</span>
              </div>
              <div style={{ display: 'flex', width: '50%', paddingLeft: 6 }}>
                <span style={{ color: '#64748B' }}>Address:&nbsp;</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{order.customer?.address || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items & Totals */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.8,
              color: '#44A7FC',
              marginBottom: 10,
            }}
          >
            ORDER INVOICE
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderBottom: '1px solid #E2E8F0',
              paddingBottom: 8,
              marginBottom: 10,
            }}
          >
            {(order.items || []).map((i, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 0',
                  fontSize: 12,
                  color: '#1E293B',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                  <ItemThumbSatori dataUri={itemImageDataUris[idx] ?? null} />
                  <span style={{ fontWeight: 600, color: '#0F172A', lineHeight: 1.35, marginLeft: 8 }}>
                    {i.name} × {i.qty}
                  </span>
                </div>
                <span style={{ fontWeight: 700 }}>৳{(i.price * i.qty).toLocaleString('en-US')}</span>
              </div>
            ))}
          </div>

          {order.subtotal ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', padding: '3px 0' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 600, color: '#1E293B' }}>৳{order.subtotal.toLocaleString('en-US')}</span>
            </div>
          ) : null}

          {order.discountAmount && order.discountAmount > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#059669', fontWeight: 600, padding: '3px 0' }}>
              <span>Coupon Discount ({order.couponCode || 'PROMO'})</span>
              <span style={{ color: '#10B981', fontWeight: 700 }}>- ৳{order.discountAmount.toLocaleString('en-US')}</span>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#475569', padding: '3px 0' }}>
            <span style={{ color: isFreeShipping ? '#059669' : '#475569', fontWeight: isFreeShipping ? 600 : 400 }}>
              Delivery Charge ({order.shipping === 'dhaka' ? 'Dhaka City' : 'All Bangladesh'})
            </span>
            <span style={{ color: isFreeShipping ? '#10B981' : '#1E293B', fontWeight: isFreeShipping ? 800 : 600 }}>
              {isFreeShipping ? 'FREE' : `৳${order.shippingCost}`}
            </span>
          </div>

          <div style={{ display: 'flex', margin: '8px 0', borderTop: '1px dashed #CBD5E1' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#0F172A', padding: '3px 0' }}>
            <span>Total Bill</span>
            <span>৳{(order.total || 0).toLocaleString('en-US')}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#44A7FC', padding: '3px 0' }}>
            <span>Advance Payment</span>
            <span style={{ fontWeight: 700 }}>- ৳{advancePaid.toLocaleString('en-US')}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
              fontWeight: 800,
              color: '#0F172A',
              padding: '5px 0',
              borderTop: '1px solid #E2E8F0',
              marginTop: 4,
            }}
          >
            <span>Cash on Delivery</span>
            <span>৳{balanceDue.toLocaleString('en-US')}</span>
          </div>
        </div>

        {/* Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            borderRadius: 20,
            backgroundColor: '#F0F7FF',
            border: '1px solid #DCEBFD',
            fontSize: 11,
            fontWeight: 700,
            color: '#44A7FC',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginRight: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#44A7FC" strokeWidth="2" style={{ marginRight: 5 }}>
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span>Payment: bKash (Verified)</span>
          </div>
          <span style={{ color: '#BAE0FD', marginRight: 10 }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#44A7FC" strokeWidth="2" style={{ marginRight: 5 }}>
              <rect x="1" y="3" width="15" height="13" rx="1" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <span>Courier: Pathao</span>
          </div>
        </div>

        {/* Notice Message */}
        <div
          style={{
            display: 'flex',
            padding: '11px 14px',
            backgroundColor: '#F0F7FF',
            border: '1px solid #DCEBFD',
            borderRadius: 12,
            fontSize: 11,
            lineHeight: 1.6,
            color: '#1E3A5F',
            marginBottom: 14,
          }}
        >
          {dueMsg}
        </div>

        {/* Footer Contact & Brand */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            borderTop: '1px solid #F1F5F9',
            paddingTop: 12,
            fontSize: 11,
            color: '#64748B',
          }}
        >
          <div style={{ display: 'flex', marginBottom: 8, fontWeight: 600 }}>
            📞 {contact.phoneLabel}&nbsp;&nbsp;•&nbsp;&nbsp;✉️ {contact.email}&nbsp;&nbsp;•&nbsp;&nbsp;🌐 vangcur.com
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SOCIAL_BADGE_ICONS.facebook} alt="" width={22} height={22} style={{ marginRight: 4, display: 'block' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SOCIAL_BADGE_ICONS.youtube} alt="" width={22} height={22} style={{ marginRight: 4, display: 'block' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SOCIAL_BADGE_ICONS.tiktok} alt="" width={22} height={22} style={{ marginRight: 4, display: 'block' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SOCIAL_BADGE_ICONS.instagram} alt="" width={22} height={22} style={{ marginRight: 8, display: 'block' }} />
            </div>
            <span style={{ display: 'flex', fontWeight: 800, fontSize: 11.5, color: '#0F172A', letterSpacing: -0.2 }}>
              Vangcur Gadgets
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
