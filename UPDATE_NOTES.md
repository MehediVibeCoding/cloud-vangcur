# Vangcur আপডেট — যা যা বদলেছে

এই zip-এর ভেতরের ফাইলগুলো রেপোর একই পাথে বসিয়ে দিন (পুরনোটা রিপ্লেস করে)।

| ফাইল | পরিবর্তন |
|---|---|
| lib/security.ts | বাংলা সংখ্যা অটো ইংরেজি; ফোন নম্বর ০১[৩-৯] ফরম্যাটে স্মার্ট ফিল্টার |
| app/checkout/page.tsx | শেষ ৪ ডিজিটের ঘরেও বাংলা সংখ্যা ইংরেজি হয় |
| app/components/product/ProductReviews.tsx | তারিখের পাশের ভেরিফাই আইকন সরানো (লজিক অপরিবর্তিত); কাস্টম delete/reject dialog |
| app/components/product/ProductQnA.tsx | প্রশ্ন/উত্তর মোছায় কাস্টম dialog |
| lib/confirm.ts (নতুন) | confirmDialog()/promptDialog() API |
| app/components/ui/ConfirmDialog.tsx (নতুন) | বাংলা-ইংরেজি কাস্টম confirm/prompt UI |
| app/components/GlobalOverlays.tsx | ConfirmDialog মাউন্ট |
| lib/i18n/dictionary.ts | নতুন dialog টেক্সটের ইংরেজি অনুবাদ |
| app/components/home/ProductGrid.tsx | "সকল প্রোডাক্ট দেখুন" বাটন ফ্ল্যাট, শ্যাডো/থ্রিডি নেই |
| app/components/home/CategoryShowcase.tsx | কার্ড টাইটেল দুই লাইনে, নিচে নামানো |
| public/games/stack-tower/index.html | লেয়ার করা একটানা ঘাস, বক্সের গায়ে ঘাস/ফুল/পাতা নেই, ডেস্কটপে পুরো স্ক্রিন |
| app/components/checkout/WaitingGame.tsx | ডেস্কটপে গেমের ফ্রেম পুরো স্ক্রিন |

গেম ক্যাশ: ব্রাউজারে পুরনো গেম দেখালে একবার Ctrl+Shift+R দিন।
