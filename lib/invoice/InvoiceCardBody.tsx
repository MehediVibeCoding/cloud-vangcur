// [SHARED] এই ফাইলটা ক্লায়েন্ট (on-screen preview) এবং সার্ভার
// (PNG generation route, দেখুন app/api/invoice/png/route.ts) — দুই জায়গা থেকেই
// import হয়। ইচ্ছাকৃতভাবে এখানে কোনো 'use client', hook, ref, বা
// window/document নির্ভর কোড নেই — এটা শুধুই props → JSX, যাতে
// react-dom/server এর renderToStaticMarkup দিয়ে সার্ভারেও নিরাপদে render
// করা যায়।
//
// ⚠️ নিয়ম: স্ক্রিনে যা দেখা যায় আর ডাউনলোড হওয়া ছবিতে যা থাকে — এই দুটো
// কখনোই আলাদা হতে পারবে না, কারণ দুটোই এখন এই একই কম্পোনেন্ট থেকে আসে।
// ভবিষ্যতে invoice-এর ডিজাইন বদলাতে হলে শুধু এই একটা ফাইলই এডিট করলেই
// preview আর download দুটোই automatically আপডেট হয়ে যাবে।

import type { Order } from '@/types';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { SOCIAL_BADGE_ICONS } from './socialBadgeIcons';

export interface InvoiceContact {
  phoneLabel: string;
  email: string;
}

export const INVOICE_FIXED_WIDTH = 480;

export function ItemThumb({ imgs }: { imgs?: string[] }) {
  const url = imgs && imgs[0];
  const isUrl = typeof url === 'string' && url.startsWith('http');
  if (isUrl) {
    return (
      <img
        src={optimizeCloudinaryUrl(url, 120)}
        alt=""
        crossOrigin="anonymous"
        style={{
          width: 32,
          height: 32,
          objectFit: 'cover',
          borderRadius: 8,
          flexShrink: 0,
          border: '1px solid #E2E8F0',
          display: 'block',
        }}
      />
    );
  }
  return (
    <span
      style={{
        fontSize: 16,
        width: 32,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        lineHeight: 1,
      }}
    >
      📦
    </span>
  );
}

export type InvoiceCardBodyProps = {
  order: Order;
  ds: string;
  contact: InvoiceContact;
  dueMsg: string;
  advancePaid: number;
  balanceDue: number;
  isFreeShipping: boolean;
  /**
   * Prefix for local /public assets (e.g. the logo). The client preview runs
   * inside the site itself, so a relative "/vangcur-logo.png" resolves fine
   * and this can be left empty. The server-side PNG route renders this
   * component completely outside of the site (inside a headless browser
   * page with no base URL), so it must pass the full site origin here,
   * e.g. "https://vangcur.com".
   */
  assetBaseUrl?: string;
};

export function InvoiceCardBody({
  order,
  ds,
  contact,
  dueMsg,
  advancePaid,
  balanceDue,
  isFreeShipping,
  assetBaseUrl = '',
}: InvoiceCardBodyProps) {
  return (
    <div
      style={{
        padding: '24px 22px 26px',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box',
        width: '100%',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          borderBottom: '1px solid #F1F5F9',
          paddingBottom: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <img
            src={`${assetBaseUrl}/vangcur-logo.png`}
            alt="Vangcur"
            crossOrigin="anonymous"
            style={{ height: 34, width: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '2px',
            color: '#64748B',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          YOUR FIRST CHOICE FOR GADGETS
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '5px 16px',
            borderRadius: 20,
            backgroundColor: '#F0F7FF',
            border: '1.5px solid #BAE0FD',
            fontSize: 12,
            fontWeight: 700,
            color: '#334155',
            margin: '0 auto',
          }}
        >
          <span>
            Order: <strong style={{ color: '#44A7FC' }}>{order.orderNum}</strong>
          </span>
          {ds ? (
            <>
              <span style={{ color: '#93C5FD', margin: '0 6px' }}>•</span>
              <span style={{ color: '#475569', fontWeight: 600 }}>{ds}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Customer Details */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: '#44A7FC',
            marginBottom: 6,
          }}
        >
          CUSTOMER DETAILS
        </div>
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 12,
            lineHeight: 1.5,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', marginBottom: 6 }}>
            <div style={{ width: '50%', boxSizing: 'border-box', paddingRight: 6 }}>
              <span style={{ color: '#64748B' }}>Name: </span>
              <strong style={{ color: '#0F172A' }}>{order.customer?.name || '-'}</strong>
            </div>
            <div style={{ width: '50%', boxSizing: 'border-box', paddingLeft: 6 }}>
              <span style={{ color: '#64748B' }}>Phone: </span>
              <strong style={{ color: '#0F172A' }}>{order.customer?.phone || '-'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex' }}>
            <div style={{ width: '50%', boxSizing: 'border-box', paddingRight: 6 }}>
              <span style={{ color: '#64748B' }}>District: </span>
              <strong style={{ color: '#0F172A' }}>{order.customer?.district || '-'}</strong>
            </div>
            <div style={{ width: '50%', boxSizing: 'border-box', paddingLeft: 6 }}>
              <span style={{ color: '#64748B' }}>Address: </span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{order.customer?.address || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items & Totals */}
      <div
        style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 14,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: '#44A7FC',
            marginBottom: 10,
          }}
        >
          ORDER INVOICE
        </div>

        <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 8, marginBottom: 10 }}>
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
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1, paddingRight: 8 }}>
                <ItemThumb imgs={i.imgs} />
                <span style={{ fontWeight: 600, color: '#0F172A', lineHeight: 1.35, marginLeft: 8, wordBreak: 'break-word' }}>
                  {i.name} × {i.qty}
                </span>
              </div>
              <span style={{ fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                ৳{(i.price * i.qty).toLocaleString('en-US')}
              </span>
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

        <div style={{ margin: '8px 0', borderTop: '1px dashed #CBD5E1' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#0F172A', padding: '3px 0' }}>
          <span>Total Bill</span>
          <span>৳{(order.total || 0).toLocaleString('en-US')}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#44A7FC', padding: '3px 0' }}>
          <span>Advance Payment</span>
          <span style={{ fontWeight: 700 }}>- ৳{advancePaid.toLocaleString('en-US')}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#0F172A', padding: '5px 0', borderTop: '1px solid #E2E8F0', marginTop: 4 }}>
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#44A7FC" strokeWidth="2" style={{ marginRight: 5 }}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
          <span>Payment: bKash (Verified)</span>
        </div>
        <span style={{ color: '#BAE0FD', marginRight: 10 }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#44A7FC" strokeWidth="2" style={{ marginRight: 5 }}><rect x="1" y="3" width="15" height="13" rx="1" /><polygon points="16 8 20 8 23 11 23 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
          <span>Courier: Pathao</span>
        </div>
      </div>

      {/* Notice Message */}
      <div
        style={{
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
          textAlign: 'center',
          borderTop: '1px solid #F1F5F9',
          paddingTop: 12,
          fontSize: 11,
          color: '#64748B',
        }}
      >
        <div style={{ marginBottom: 8, fontWeight: 600 }}>
          📞 {contact.phoneLabel} &nbsp;•&nbsp; ✉️ {contact.email} &nbsp;•&nbsp; 🌐 vangcur.com
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={SOCIAL_BADGE_ICONS.facebook} alt="" width={22} height={22} style={{ marginRight: 4, display: 'block' }} />
            <img src={SOCIAL_BADGE_ICONS.youtube} alt="" width={22} height={22} style={{ marginRight: 4, display: 'block' }} />
            <img src={SOCIAL_BADGE_ICONS.tiktok} alt="" width={22} height={22} style={{ marginRight: 4, display: 'block' }} />
            <img src={SOCIAL_BADGE_ICONS.instagram} alt="" width={22} height={22} style={{ marginRight: 8, display: 'block' }} />
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 11.5,
              color: '#0F172A',
              letterSpacing: '-0.2px',
            }}
          >
            Vangcur Gadgets
          </span>
        </div>
      </div>
    </div>
  );
}
