import type { SupabaseClient } from '@supabase/supabase-js';

export interface ContactSettings {
  wa?: string;
  messenger?: string;
}

export const DEFAULT_WA_LINK = 'https://wa.me/8801897804055';
export const DEFAULT_MSG_LINK = 'https://m.me/vangcurgadgets';

export function computeWaLink(contact: ContactSettings | null): string {
  if (contact && contact.wa) {
    const num = '88' + contact.wa.replace(/^88/, '').replace(/\D/g, '');
    return `https://wa.me/${num}`;
  }
  return DEFAULT_WA_LINK;
}

export function computeMsgLink(contact: ContactSettings | null): string {
  return (contact && contact.messenger) || DEFAULT_MSG_LINK;
}

// vc_contact সেটিংটা এখন অ্যাডমিন প্যানেল থেকে এডিট করার কোনো উপায় নেই (ফিচার
// সরানো হয়েছে), তাই Supabase-এ বারবার খুঁজে দেখার দরকার নেই — সবসময় null
// রিটার্ন হবে, আর উপরের computeWaLink/computeMsgLink এমনিতেই ডিফল্ট লিংক
// ব্যবহার করবে।
export async function fetchContactSettings(_supabase: SupabaseClient): Promise<ContactSettings | null> {
  return null;
}
