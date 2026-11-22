import type { CartItem } from '@/types';

function itemsSummary(items: CartItem[]): string {
  if (!Array.isArray(items)) return '';
  return items.map((i) => `${i.name} x${i.qty}`).join(', ');
}

function itemsTotal(items: CartItem[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
}

interface SendLeadInput {
  leadId: string;
  name: string;
  phone: string;
  dist: string;
  addr: string;
  email: string;
  items: CartItem[];
}

// 🛡️ রিকোয়েস্ট-সেভিং (২০২৬-১১): সর্বশেষ যে তথ্য পাঠানো হয়েছে তার চাবি। একই তথ্য আবার পাঠানোর কোনো মানে নেই
// (visibilitychange + pagehide + অর্ডার-বাটন একই তথ্য নিয়ে পরপর চলতে পারে) — প্রতিটা /api/lead একটা Worker-রিকোয়েস্ট।
// ফুল রিলোডে রিসেট হয়, তাই নতুন পেজ-লোডে প্রথমবার সবসময় যায়।
let lastSentKey = '';

export function sendLead({ leadId, name, phone, dist, addr, email, items }: SendLeadInput): void {
  if (typeof window === 'undefined') return;
  if (!phone) return;

  const key = JSON.stringify([leadId, name, phone, dist, addr, email, itemsSummary(items), itemsTotal(items)]);
  if (key === lastSentKey) return;

  const payload = {
    action: 'addLead',
    leadId: leadId || `LD-${Date.now()}`,
    date: new Date().toLocaleString('bn-BD'),
    name: name || '',
    phone: phone || '',
    dist: dist || '',
    addr: addr || '',
    email: email || '',
    items: itemsSummary(items),
    total: itemsTotal(items),
  };

  try {
    const body = JSON.stringify(payload);
    lastSentKey = key;
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/lead', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // best-effort only
  }
}
