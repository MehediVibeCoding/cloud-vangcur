'use client';

import { useCallback } from 'react';
import { useLanguageStore } from '@/lib/store/languageStore';
import { translate } from './dictionary';

export function useT() {
  const lang = useLanguageStore((s) => s.lang);

  // ⚠️ আগে `t` প্রতিবার রেন্ডারে নতুন ফাংশন হিসেবে তৈরি হতো (নতুন
  // রেফারেন্স)। checkout পেজের মতো জায়গায় `t` কে useEffect dependency
  // হিসেবে ব্যবহার করা হয়েছিল — নতুন রেফারেন্সের কারণে সেই effect প্রতি
  // রেন্ডারে আবার চলত, যা setState কল করত, যা আবার রি-রেন্ডার ঘটাত →
  // অসীম লুপ। ফলে supabase-এ store_settings ফেচ বারবার কল হতো (এবং শেষে
  // ব্রাউজার net::ERR_INSUFFICIENT_RESOURCES ছুঁড়ত), আর "কার্ট খালি"
  // টোস্টও বারবার দেখাত। useCallback দিয়ে `t`-কে lang-এর ওপর নির্ভরশীল
  // স্থিতিশীল রেফারেন্স বানিয়ে এই লুপ বন্ধ করা হলো।
  const t = useCallback((text: string): string => translate(text, lang), [lang]);

  return { lang, t };
}
