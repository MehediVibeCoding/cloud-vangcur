import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// ESLint 9 flat config (Next 16-এ `next lint` নেই, সরাসরি `eslint` চালাতে হয়)।
//
// নিয়ম-নীতি:
// - `react-hooks/rules-of-hooks` ও বাকি বাস্তব-বাগ নিয়ম ERROR থাকে (CI ফেল করবে)।
// - নিচের React-Compiler-স্টাইলের নিয়মগুলো উপদেশমূলক: এই প্রজেক্টে `reactCompiler` চালু নেই,
//   তাই এগুলো আচরণ ভাঙে না। প্রথম দিনেই ১০০+ error দিয়ে CI লাল না করতে এগুলো WARN।
//   ভবিষ্যতে কমিয়ে আনলে ধাপে ধাপে error করা যাবে।
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      // INTENTIONAL: প্রজেক্টে `next/image` ইচ্ছা করে ব্যবহার হয় না — ছবি Cloudflare `/cdn-cgi/image/...` দিয়ে
      // ছোট/WebP হয়ে আসে (lib/cloudinaryUrl.ts, বিস্তারিত IMAGE_SYSTEM.md)। তাই কাঁচা <img> ঠিক; নিয়মটা বন্ধ।
      '@next/next/no-img-element': 'off',
    },
  },
  {
    ignores: ['.next/**', '.open-next/**', 'node_modules/**', 'public/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
