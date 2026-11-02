'use client';

// ছবি লোড ব্যর্থ হলে (যেমন প্রথমবার Cloudflare ট্রান্সফর্ম সাময়িক ফেল) একবার আবার চেষ্টা করে।
// আগে একবার ব্যর্থ হলেই 📦 আইকন চিরকালের জন্য আটকে যেত।
//   - attempt: <img key={attempt}> এ দিলে রি-ট্রাইয়ে ব্রাউজার নতুন করে রিকোয়েস্ট করে (URL বদলাতে হয় না)
//   - waiting: ব্যর্থ-ছবির ভাঙা আইকন/alt টেক্সট লুকিয়ে রাখতে (ছবি রি-ট্রাইয়ের অপেক্ষায়)
//   - failed: সব চেষ্টা শেষ — এবার ফলব্যাক (📦) দেখাও
import { useCallback, useEffect, useRef, useState } from 'react';

const RETRY_DELAY_MS = 1500;

export function useImageRetry(maxRetries = 1) {
  const [attempt, setAttempt] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const onError = useCallback(() => {
    if (attempt >= maxRetries) {
      setWaiting(false);
      setFailed(true);
      return;
    }
    setWaiting(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setAttempt((a) => a + 1);
      setWaiting(false);
    }, RETRY_DELAY_MS);
  }, [attempt, maxRetries]);

  return { attempt, waiting, failed, onError };
}
