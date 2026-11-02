/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔖 বিল্ড-আইডি: ডেপ্লয় বদলেছে কিনা ধরতে (StaleTabReload + /api/build-id)। Cloudflare Workers Builds-এ কমিট SHA থাকে;
  // না পেলে খালি স্ট্রিং — তখন StaleTabReload আগের মতো সবসময় রিলোড করে (নিরাপদ ফলব্যাক)।
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.WORKERS_CI_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || '',
  },
  experimental: {
    // 🐢 পারফরম্যান্স ফিক্স (audit): critical CSS ইনলাইন করে বাকিটা async করে —
    // PageSpeed-এ ২টা render-blocking CSS চাঙ্ক (~1050ms) ফ্ল্যাগ হয়েছিল এর কারণে।
    optimizeCss: true,
    staleTimes: {
      // 🛡️ ফিক্স (audit P2-B9): আগে ৩০০ সেকেন্ড (৫ মিনিট) ছিল — অ্যাকাউন্ট/
      // অর্ডার পেজে ঘুরে আসার পর পুরনো অর্ডার-স্ট্যাটাস ৫ মিনিট পর্যন্ত দেখাতে
      // পারত। static পেজে (প্রোডাক্ট/হোম, কম ঘন ঘন বদলায়) ৫ মিনিটই রাখা হলো।
      dynamic: 30,
      static: 300,
    },
  },
  // ইনভয়েস PNG: satori + resvg-wasm (lib/invoice/renderInvoiceSvg.ts), কোনো Chromium/jsdom লাগে না।
  async headers() {
    return [
      {
        // ভার্সনসহ নামের ফাইল (three.r128) — একবার ডাউনলোড হলে ব্রাউজার আর নতুন করে আনবে না
        source: '/games/vendor/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
  images: {
    // ⚡ ব্যাচ ৩: `_next/image` (ফুটারের ২টা ছবি ও GuideBlocks-এর ছবি) — ডিফল্ট ৪ ঘণ্টা; মালিকের সিদ্ধান্তে ৭ দিন (৬০৪৮০০s)।
    minimumCacheTTL: 604800,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

module.exports = nextConfig;
