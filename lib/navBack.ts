// "ফিরে যান" বাটনের জন্য: window.history.length > 1 দিয়ে বোঝা যায় না আগের পেজটা এই সাইটেরই কিনা
// (নতুন ট্যাবে বা অন্য সাইট থেকে এসে ঢুকলেও length > 1 হতে পারে, তখন router.back() সাইটের বাইরে নিয়ে যেত)।
// তাই সাইটের ভেতরের নেভিগেশন গোনা হয় (sessionStorage) — GlobalOverlays প্রতি পাথ-বদলে trackInAppNav() ডাকে।

const KEY = 'vc_inapp_nav';

function read(): number {
  try {
    return Math.max(0, Number(sessionStorage.getItem(KEY)) || 0);
  } catch {
    return 0;
  }
}

function write(n: number): void {
  try {
    sessionStorage.setItem(KEY, String(Math.max(0, n)));
  } catch {
    // storage unavailable
  }
}

/** পাথ বদলালে ডাকুন। isPop=true মানে ব্রাউজারের back/forward বাটন (গণনা কমে), নইলে নতুন নেভিগেশন (বাড়ে)। */
export function trackInAppNav(isPop: boolean): void {
  write(isPop ? read() - 1 : read() + 1);
}

/** আগের পেজ সাইটেরই হলে true — তখন router.back() নিরাপদ। */
export function canGoBackInApp(): boolean {
  return typeof window !== 'undefined' && read() > 0;
}
