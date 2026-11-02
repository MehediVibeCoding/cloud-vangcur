export const MODAL_OPEN_CLASS = 'vc-modal-open';

let lockCount = 0;
let touchStartY = 0;
let touchStartX = 0;

function findScrollableAncestor(start: EventTarget | null): Element | null {
  let node: Element | null = start instanceof Element ? start : null;
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const canScrollY = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
    if (canScrollY) return node;
    node = node.parentElement;
  }
  return null;
}

// নির্দিষ্ট এলিমেন্টের ভিতরে স্ক্রল করলেও, একদম উপরে/নিচে (বাউন্ডারিতে) পৌঁছে
// গেলে আরও স্ক্রল করলে সেটা যেন বাইরের মূল পেজে "leak" করে চলে না যায়
// (browser-এর native scroll chaining), তাই বাউন্ডারিতে থাকলে পরের স্ক্রলযোগ্য
// পূর্বপুরুষ (থাকলে) খোঁজা হয়, না থাকলে ব্লক করে দেওয়া হয়।
// ডানে-বামে (অনুভূমিক) স্ক্রলযোগ্য পূর্বপুরুষ — যেমন মডালের ট্যাব স্ট্রিপ। আগে শুধু
// উপর-নিচ হিসাব হতো, তাই অনুভূমিক সোয়াইপও preventDefault হয়ে ট্যাব আটকে যেত।
function findHorizontalScrollTarget(start: EventTarget | null, delta: number): Element | null {
  let node: Element | null = start instanceof Element ? start : null;
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const canScrollX = /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth;
    if (canScrollX) {
      const atLeft = node.scrollLeft <= 0;
      const atRight = node.scrollWidth - node.scrollLeft <= node.clientWidth + 1;
      const blocked = (delta < 0 && atLeft) || (delta > 0 && atRight);
      if (!blocked) return node;
    }
    node = node.parentElement;
  }
  return null;
}

function findUsableScrollTarget(start: EventTarget | null, delta: number): Element | null {
  let node = findScrollableAncestor(start);
  while (node) {
    const atTop = node.scrollTop <= 0;
    const atBottom = node.scrollHeight - node.scrollTop <= node.clientHeight + 1;
    const blocked = (delta < 0 && atTop) || (delta > 0 && atBottom);
    if (!blocked) return node;
    node = findScrollableAncestor(node.parentElement);
  }
  return null;
}

function onWheel(e: WheelEvent) {
  if (!findUsableScrollTarget(e.target, e.deltaY)) e.preventDefault();
}

function onTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0]?.clientY ?? 0;
  touchStartX = e.touches[0]?.clientX ?? 0;
}

function onTouchMove(e: TouchEvent) {
  const touch = e.touches[0];
  if (!touch) return;
  const delta = touchStartY - touch.clientY; // আঙুল উপরে সরলে (স্ক্রল-ডাউন) পজিটিভ
  const deltaX = touchStartX - touch.clientX;
  if (Math.abs(deltaX) > Math.abs(delta)) {
    // মূলত অনুভূমিক সোয়াইপ — অনুভূমিকভাবে স্ক্রলযোগ্য এলিমেন্ট থাকলে ছেড়ে দিই
    if (!findHorizontalScrollTarget(e.target, deltaX)) e.preventDefault();
    return;
  }
  if (!findUsableScrollTarget(e.target, delta)) e.preventDefault();
}

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

function onKeyDown(e: KeyboardEvent) {
  if (!SCROLL_KEYS.has(e.key)) return;
  const target = e.target as HTMLElement | null;
  // ইনপুট/টেক্সটএরিয়াতে টাইপ বা কার্সর-মুভমেন্ট করার সময় ব্লক করা উচিত না
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
  const delta = e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home' ? -1 : 1;
  if (!findUsableScrollTarget(target, delta)) e.preventDefault();
}

export function lockBody(): void {
  if (typeof document === 'undefined') return;
  lockCount += 1;
  if (lockCount > 1) return;
  document.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('keydown', onKeyDown, { passive: false });
  // মডাল/ড্রয়ার খোলা অবস্থায় পেজের নিজস্ব (html-লেভেল) স্ক্রলবারটা দৃশ্যত
  // লুকানো হচ্ছে — শুধু ::-webkit-scrollbar { display:none } + scrollbar-width:none
  // (.no-scrollbar ক্লাস দিয়ে), কোনো overflow/position ছোঁয়া হয়নি বলে উপরের
  // sticky-nav ভাঙা বা scroll-jump বাগ এখানে ফিরে আসার কোনো ঝুঁকি নেই। এটা
  // ছাড়া ড্রয়ারের নিজস্ব .sleek-scrollbar-এর পাশে পেজের আসল স্ক্রলবারটাও একই
  // সাথে দেখা যেত — যেটাই সেই "ডাবল স্ক্রলবার / এক্সট্রা প্যাডিং" এফেক্ট তৈরি করছিল।
  document.documentElement.classList.add('no-scrollbar');
  document.body.classList.add('no-scrollbar');
  // 🆕 মডাল/ড্রয়ার খোলা থাকার সংকেত — ব্যাকগ্রাউন্ডের অ্যানিমেশন/অটো-প্লে এই ক্লাস দেখে থেমে
  // থাকে (globals.css-এর `html.vc-modal-open` নিয়ম, HeroSlider, CustomerGallery, Navbar সার্চ)।
  document.documentElement.classList.add(MODAL_OPEN_CLASS);
}

export function unlockBody(): void {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;
  document.removeEventListener('wheel', onWheel);
  document.removeEventListener('touchstart', onTouchStart);
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('keydown', onKeyDown);
  document.documentElement.classList.remove('no-scrollbar');
  document.body.classList.remove('no-scrollbar');
  document.documentElement.classList.remove(MODAL_OPEN_CLASS);
}

/** কোনো মডাল/ড্রয়ার এখন খোলা আছে কি না (lockBody-র কাউন্টার ভিত্তিক)। */
export function isModalOpen(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains(MODAL_OPEN_CLASS);
}
