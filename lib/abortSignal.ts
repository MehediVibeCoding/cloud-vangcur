// Supabase (postgrest-js) কোয়েরির টাইমআউট সিগন্যাল — এক জায়গায়।

/** টাইমআউটে abort হয় এমন সিগন্যাল; পরিবেশ সমর্থন না করলে undefined (তখন টাইমআউট ছাড়াই চলে)। */
export function getTimeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }
  return undefined;
}

/**
 * `.abortSignal(...)`-এর জন্য টাইপ-নিরাপদ র‍্যাপার।
 * postgrest-js-এর টাইপ শুধু `AbortSignal` চায়, কিন্তু রানটাইমে `abortSignal(undefined)` নিরাপদ
 * (শুধু `this.signal = undefined` বসে, কোনো abort হয় না) — তাই `signal as any` না লিখে এটা ব্যবহার করুন।
 * এই কাস্টটা একমাত্র এখানেই; আচরণ আগের মতোই।
 */
export function optionalSignal(signal: AbortSignal | undefined): AbortSignal {
  return signal as AbortSignal;
}
