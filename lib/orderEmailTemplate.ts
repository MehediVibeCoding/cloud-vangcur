// অর্ডার কনফার্মেশন ইমেইলের ডিজাইন — শুধু এই ফাইলে। ইমেইলের চেহারা/লেখা/রং বদলাতে চাইলে এখানেই হাত দিন।
// (পাঠানোর লজিক আছে app/api/order-email/route.ts-এ — ওটা ছুঁতে হয় না।)
//
// ইমেইল ক্লায়েন্ট (Gmail/Outlook) আধুনিক CSS বোঝে না, তাই সবকিছু table + inline style দিয়ে লেখা।
// ───────────── ব্র্যান্ড রং (DESIGN_SYSTEM.md অনুযায়ী) ─────────────
const C = {
  brand: '#44A7FC', // সিগনেচার স্কাই-ব্লু — এর চেয়ে গাঢ় নীল নয়
  page: '#F0F8FF', // ইমেইলের মূল ব্যাকগ্রাউন্ড (হালকা আইসি-ব্লু)
  head: '#DCEBFD', // বক্সের হেডার ব্যাকগ্রাউন্ড
  line: '#C3DEFC', // বক্সের বর্ডার
  ink: '#1A1A1A',
  muted: '#6B7280',
  rule: '#E5E7EB',
  white: '#FFFFFF',
  ok: '#10B981',
  okTint: '#E8F8F1',
  due: '#E11D48', // Balance Amount (আগের ডিজাইনের মতোই লাল)
} as const;

const FONT = "'Hind Siliguri','Noto Sans Bengali','Segoe UI',Roboto,Arial,sans-serif";

const SOCIAL: { label: string; href: string }[] = [
  { label: 'Facebook', href: 'https://facebook.com/vangcurgadgets' },
  { label: 'TikTok', href: 'https://tiktok.com/@vangcur.com' },
  { label: 'Instagram', href: 'https://instagram.com/vangcurgadgets' },
];

// ───────────── টাইপ ─────────────
export interface OrderItem {
  name?: string;
  qty?: number;
  price?: number;
}
export interface OrderRecord {
  id?: string | number;
  order_num?: string;
  created_at?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_district?: string;
  customer_address?: string;
  items?: OrderItem[];
  subtotal?: number;
  shipping_cost?: number;
  discount_amount?: number;
  advance_paid?: number;
  total?: number;
}

// ───────────── হেল্পার ─────────────
const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// আগের ডিজাইনের মতো: 100৳
const bdt = (n: unknown): string => `${Math.round(Number(n) || 0).toLocaleString('en-US')}৳`;

function orderDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' }).format(safe);
  } catch {
    return safe.toISOString().slice(0, 10);
  }
}

function orderNumber(o: OrderRecord): string {
  return String(o.order_num || `#VC-${String(o.id ?? '').slice(0, 8)}`);
}

function amounts(o: OrderRecord) {
  const total = Number(o.total) || 0;
  const advance = Number(o.advance_paid) || 0;
  return { total, advance, due: Math.max(0, total - advance), discount: Number(o.discount_amount) || 0 };
}

// ───────────── সাবজেক্ট (ইমোজি ছাড়া) ─────────────
export function buildSubject(o: OrderRecord): string {
  return `আপনার অর্ডারটি (${orderNumber(o)}) কনফার্ম করা হয়েছে!`;
}

// ───────────── HTML ─────────────
export function buildHtml(o: OrderRecord): string {
  const items = Array.isArray(o.items) ? o.items : [];
  const { total, advance, due, discount } = amounts(o);
  const num = orderNumber(o);
  const name = String(o.customer_name || '').trim() || 'গ্রাহক';

  const itemRows = items
    .map((i) => {
      const qty = Number(i.qty) || 1;
      return `<tr>
        <td style="padding:15px 16px;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:16px;line-height:1.5;color:${C.ink}">${esc(i.name)} × ${qty} pcs</td>
        <td align="right" style="padding:15px 16px;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:16px;font-weight:700;color:${C.ink};white-space:nowrap">${bdt((Number(i.price) || 0) * qty)}</td>
      </tr>`;
    })
    .join('');

  const sumRow = (label: string, value: string, opts: { bold?: boolean; color?: string } = {}) =>
    `<tr>
      <td align="right" style="padding:6px 8px 6px 16px;font-family:${FONT};font-size:16px;color:${C.ink};${opts.bold ? 'font-weight:700;' : ''}">${label}</td>
      <td align="right" width="110" style="padding:6px 16px 6px 8px;font-family:${FONT};font-size:16px;color:${opts.color || C.ink};font-weight:${opts.bold ? 800 : 600};white-space:nowrap">${value}</td>
    </tr>`;

  const address = [o.customer_address, o.customer_district].filter(Boolean).map(esc).join('<br>');

  const social = SOCIAL.map(
    (s) =>
      `<a href="${esc(s.href)}" style="display:inline-block;margin:0 9px;font-family:${FONT};font-size:14px;font-weight:600;color:${C.brand};text-decoration:none">${s.label}</a>`,
  ).join('');

  return `<!doctype html>
<html lang="bn"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(buildSubject(o))}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.page}">
<tr><td align="center" style="padding:0">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${C.page}">
<tr><td style="padding:28px 22px 30px">

  <!-- অভিবাদন -->
  <div style="font-family:${FONT};font-size:16px;line-height:1.9;color:${C.ink}">
    প্রিয় <strong>${esc(name)}</strong>,<br>
    আমরা অত্যন্ত আনন্দের সাথে জানাচ্ছি যে Vangcur ওয়েবসাইটে করা আপনার অর্ডারটি সফলভাবে কনফার্ম করা হয়েছে! আমরা আপনার পার্সেলটি দ্রুত ডেলিভারির জন্য প্রস্তুত করছি।
  </div>

  <!-- নিশ্চিত বক্স -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;background:${C.okTint};border-left:4px solid ${C.ok};border-radius:6px">
    <tr><td style="padding:16px 18px;font-family:${FONT};font-size:16px;line-height:1.6;color:#047857">
      আপনার <strong>${esc(num)}</strong> অর্ডারটি সফলভাবে নিশ্চিত হয়েছে
    </td></tr>
  </table>

  <!-- Order Summary -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;border:1px solid ${C.line};border-radius:8px;background:${C.white}">
    <tr><td style="padding:14px 16px;background:${C.head};border-radius:8px 8px 0 0">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
        <td style="font-family:${FONT};font-size:17px;font-weight:800;color:${C.ink}">Order Summary</td>
        <td align="right" style="font-family:${FONT};font-size:15px;color:${C.muted}">${orderDate(o.created_at)}</td>
      </tr></table>
    </td></tr>
    <tr><td>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${itemRows}
        <tr>
          <td style="padding:15px 16px;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:16px;color:${C.ink}">Home Delivery Charge</td>
          <td align="right" style="padding:15px 16px;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:16px;font-weight:700;color:${C.ink};white-space:nowrap">${bdt(o.shipping_cost)}</td>
        </tr>
        ${
          discount > 0
            ? `<tr>
          <td style="padding:15px 16px;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:16px;color:${C.ink}">Discount</td>
          <td align="right" style="padding:15px 16px;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:16px;font-weight:700;color:${C.ink};white-space:nowrap">-${bdt(discount)}</td>
        </tr>`
            : ''
        }
      </table>
    </td></tr>
    <tr><td style="padding:10px 0 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${sumRow('Total', bdt(total))}
        ${advance > 0 ? sumRow('Advance', bdt(advance)) : ''}
        ${sumRow('Balance Amount', bdt(due), { bold: true, color: C.due })}
      </table>
    </td></tr>
  </table>

  <!-- Billing -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;border:1px solid ${C.line};border-radius:8px;background:${C.white}">
    <tr><td style="padding:14px 16px;background:${C.head};border-radius:8px 8px 0 0;font-family:${FONT};font-size:17px;font-weight:800;color:${C.ink}">Billing</td></tr>
    <tr><td style="padding:16px;font-family:${FONT};font-size:16px;line-height:1.9;color:${C.ink}">
      ${esc(name)} - ${esc(o.customer_phone)}<br>
      ${address}
    </td></tr>
  </table>

  <!-- জরুরি নোট -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;background:${C.head};border-left:4px solid ${C.brand};border-radius:6px">
    <tr><td style="padding:16px 18px;font-family:${FONT};font-size:16px;line-height:1.8;color:${C.ink}">
      <strong>জরুরি নোট:</strong> পার্সেলটি খোলার সময় দয়া করে একটানা একটি আনবক্সিং ভিডিও করুন (কোনো কাট বা পজ ছাড়া)। যেকোনো সমস্যা বা ওয়ারেন্টি ক্লেইমের জন্য এই ভিডিওটি বাধ্যতামূলক।
    </td></tr>
  </table>

  <!-- Follow us -->
  <div style="margin-top:28px;border-top:1px solid ${C.line};text-align:center">
    <div style="font-family:${FONT};font-size:17px;font-weight:800;color:${C.ink};padding:16px 0 10px">Follow us</div>
    <div style="line-height:2">${social}</div>
  </div>

  <!-- ফুটার -->
  <div style="margin-top:20px;text-align:center;font-family:${FONT};font-size:15px;line-height:1.9;color:${C.muted}">
    Vangcur Your First Choice For Gadgets<br>
    <span style="color:${C.ink}">Thank You &nbsp;|&nbsp; Team Vangcur - ভাঙচুর</span>
  </div>

</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ───────────── প্লেইন টেক্সট (যে ইমেইল অ্যাপ HTML দেখায় না) ─────────────
export function buildText(o: OrderRecord): string {
  const items = Array.isArray(o.items) ? o.items : [];
  const { total, advance, due } = amounts(o);
  const lines = items.map((i) => `- ${i.name || ''} × ${Number(i.qty) || 1} pcs  ${bdt((Number(i.price) || 0) * (Number(i.qty) || 1))}`);
  return [
    `প্রিয় ${String(o.customer_name || '').trim() || 'গ্রাহক'},`,
    `আপনার ${orderNumber(o)} অর্ডারটি সফলভাবে কনফার্ম করা হয়েছে। আমরা পার্সেলটি দ্রুত ডেলিভারির জন্য প্রস্তুত করছি।`,
    '',
    ...lines,
    `Home Delivery Charge: ${bdt(o.shipping_cost)}`,
    `Total: ${bdt(total)}`,
    ...(advance > 0 ? [`Advance: ${bdt(advance)}`] : []),
    `Balance Amount: ${bdt(due)}`,
    '',
    `${o.customer_name || ''} - ${o.customer_phone || ''}`,
    [o.customer_address, o.customer_district].filter(Boolean).join(', '),
    '',
    'জরুরি নোট: পার্সেলটি খোলার সময় দয়া করে একটানা একটি আনবক্সিং ভিডিও করুন (কোনো কাট বা পজ ছাড়া)। যেকোনো সমস্যা বা ওয়ারেন্টি ক্লেইমের জন্য এই ভিডিওটি বাধ্যতামূলক।',
    '',
    'Thank You | Team Vangcur - ভাঙচুর',
  ].join('\n');
}
