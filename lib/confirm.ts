/**
 * কাস্টম কনফার্ম / প্রম্পট ডায়ালগ API
 * ─────────────────────────────────────────────────────────────────────
 * ব্রাউজারের ডিফল্ট `window.confirm` / `window.prompt`-এর বদলে সাইটের ডিজাইনের সুন্দর ডায়ালগ।
 * ব্যবহার (যেকোনো ক্লায়েন্ট কোড থেকে, async ফাংশনের ভেতরে):
 *
 *   const ok = await confirmDialog({ title, message, confirmText, cancelText, tone: 'danger' });
 *   if (!ok) return;
 *
 *   const reason = await promptDialog({ title, message, defaultValue, placeholder });
 *   if (reason === null) return;   // বাতিল
 *
 * ডায়ালগটা আঁকে `app/components/ui/ConfirmDialog.tsx` (GlobalOverlays-এ একবার মাউন্ট করা)।
 * টেক্সট কলার নিজে `t()` দিয়ে অনুবাদ করে পাঠাবে (বাংলা/ইংরেজি দুটোই সাপোর্টেড)।
 */

export type DialogTone = 'danger' | 'default';

interface BaseOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
}

export type ConfirmOptions = BaseOptions;

export interface PromptOptions extends BaseOptions {
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
}

export type DialogRequest =
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'prompt'; opts: PromptOptions; resolve: (value: string | null) => void };

type DialogHost = (req: DialogRequest) => void;

let host: DialogHost | null = null;

/** ConfirmDialog কম্পোনেন্ট মাউন্ট হলে নিজেকে হোস্ট হিসেবে রেজিস্টার করে; আনমাউন্টে সরিয়ে নেয় */
export function registerDialogHost(fn: DialogHost): () => void {
  host = fn;
  return () => {
    if (host === fn) host = null;
  };
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (host) {
      host({ kind: 'confirm', opts, resolve });
      return;
    }
    // হোস্ট মাউন্ট না থাকলে (প্রায় অসম্ভব) কাজ যেন আটকে না যায় — ব্রাউজারের ডিফল্টে ফলব্যাক
    resolve(typeof window !== 'undefined' ? window.confirm(opts.message) : false);
  });
}

export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    if (host) {
      host({ kind: 'prompt', opts, resolve });
      return;
    }
    resolve(typeof window !== 'undefined' ? window.prompt(opts.message, opts.defaultValue || '') : null);
  });
}
