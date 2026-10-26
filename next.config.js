/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // isomorphic-dompurify/jsdom are kept external: jsdom's
  // html-encoding-sniffer dependency pulls in an ESM-only module
  // (@exodus/bytes), which webpack's bundled require() can't load —
  // "Error: require() of ES Module ... not supported" at runtime on any
  // page that calls sanitizeSvgHtml() server-side (ERR_REQUIRE_ESM).
  //
  // 🗑️ Cloudflare মাইগ্রেশন নোট: @sparticuz/chromium ও puppeteer-core এখান
  // থেকে সরানো হয়েছে — ইনভয়েস PNG রুট এখন satori + resvg-wasm ব্যবহার করে
  // (দেখুন lib/invoice/renderInvoiceSvg.ts), কোনো Chromium বাইনারি আর লাগে
  // না। সেই সাথে পুরনো outputFileTracingIncludes ব্লকও বাদ দেওয়া হলো, কারণ
  // ওটা শুধু Chromium বাইনারির জন্যই ছিল।
  serverExternalPackages: [
    'isomorphic-dompurify',
    'jsdom',
  ],
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
