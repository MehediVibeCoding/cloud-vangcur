/**
 * 🎮 ওয়েটিং-পেজ মিনি গেম রেজিস্ট্রি
 *
 * নতুন গেম যোগ করার নিয়ম (ওয়েটিং পেজের কোডে হাত দিতে হবে না):
 *   ১. গেমটা `public/games/<গেমের-নাম>/index.html` — একটাই সেলফ-কন্টেইনড ফোল্ডারে রাখুন।
 *      বাইরের লাইব্রেরি (যেমন Three.js) CDN থেকে নয়, `public/games/vendor/` থেকে নিন
 *      (সাইটের CSP বাইরের CDN স্ক্রিপ্ট ব্লক করে)।
 *   ২. গেমের ভেতরে একটা ক্লোজ বাটন রাখুন যা  parent.postMessage({ type: 'vc-game-close' }, location.origin)  পাঠায়
 *      (stack-tower/index.html দেখুন)।
 *   ৩. নিচের GAMES অ্যারেতে এক ব্লক যোগ করুন।
 *
 * গেম আপডেট করলে সেই গেমের `version` এক বাড়ান — না হলে কাস্টমারের ব্রাউজার পুরনো ক্যাশ দেখাতে পারে।
 * কোনো গেম সাময়িক বন্ধ করতে `enabled: false` দিন।
 */
export interface GameDef {
  id: string;
  /** public/ ফোল্ডারের ভেতরের পাথ */
  src: string;
  version: number;
  enabled: boolean;
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  /** কার্ডের ছোট ইমোজি আইকন — থাম্বনেইল ছবি (thumb) না থাকলে এটা ফলব্যাক হিসেবে দেখানো হয় */
  icon: string;
  /** কার্ডের থাম্বনেইল — public/ ফোল্ডারের ভেতরের পাথ, গেমের অ্যাকচুয়াল স্ক্রিনশট/আর্ট */
  thumb?: string;
}

export const GAMES: GameDef[] = [
  {
    id: 'stack-tower',
    src: '/games/stack-tower/index.html',
    version: 3,
    enabled: true,
    titleBn: 'স্ট্যাক টাওয়ার',
    titleEn: 'Stack Tower',
    descBn: 'ব্লক সাজিয়ে সবচেয়ে উঁচু টাওয়ার বানান',
    descEn: 'Stack the parcels as high as you can',
    icon: '📦',
    thumb: '/games/stack-tower/thumb.png',
  },
];

/** ওয়েটিং পেজ খোলার কত সময় পর "গেম খেলবেন?" পপআপ নিজে থেকে আসবে (শুধু ফুলস্ক্রিন পেজে)। */
export const GAME_INVITE_DELAY_MS = 40 * 1000;

/**
 * অর্ডার সাবমিটের কত সময় পর্যন্ত গেম খেলা যাবে। এটা StatusClient-এর WAIT_TIMEOUT_MS (৫ মিনিট)-এর সাথে
 * মেলানো — ওই সময়ে ওয়েটিং পেজ "বাড়তি সময় লাগছে" স্ক্রিনে চলে যায়।
 */
export const GAME_MAX_PLAY_MS = 5 * 60 * 1000;

export function getEnabledGames(): GameDef[] {
  return GAMES.filter((g) => g.enabled);
}

export function gameUrl(game: GameDef, lang: string): string {
  return `${game.src}?v=${game.version}${lang === 'en' ? '&lang=en' : ''}`;
}
