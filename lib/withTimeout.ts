/**
 * withTimeout
 * ─────────────────────────────────────────────────────────────────────
 * 🛡️ "অনবরত লোডিং" (infinite loading skeleton) প্রতিরোধক।
 *
 * কেন দরকার: Fetch API-র কোনো বিল্ট-ইন টাইমআউট নেই — নেটওয়ার্ক স্লো/আনস্টেবল
 * হলে (দুর্বল সিগন্যাল, iOS Low Power Mode ব্যাকগ্রাউন্ড থ্রটলিং ইত্যাদি), একটা
 * `fetch()`/Supabase কোয়েরি কখনো resolve বা reject না হয়ে পুরোপুরি ঝুলে থাকতে
 * পারে। এরকম হলে `await`-এর পরের কোনো কোড (এমনকি try/catch-এর catch ব্লকও)
 * কখনো রান হয় না — `setLoading(false)` কল হয় না, UI চিরকাল স্কেলিটন/স্পিনারে
 * আটকে থাকে। এটা সব ব্রাউজারেই সম্ভব, কিন্তু দুর্বল নেটওয়ার্ক/পুরনো ডিভাইসে
 * (iPhone 7, কম ব্যাটারি) বেশি দেখা যায়।
 *
 * `withTimeout` যেকোনো promise-কে একটা সময়সীমার সাথে race করায় — সময়সীমা
 * পার হলে promise reject করে (বা fallbackValue দেওয়া থাকলে resolve করে),
 * যাতে caller-এর try/catch/finally সবসময় একটা নির্দিষ্ট সময়ের মধ্যে চলে এবং
 * loading state কখনো চিরস্থায়ীভাবে আটকে না থাকে।
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms = 12000,
  fallbackValue?: T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (fallbackValue !== undefined) resolve(fallbackValue);
      else reject(new Error('টাইমআউট: নির্দিষ্ট সময়ের মধ্যে রেসপন্স আসেনি'));
    }, ms);

    Promise.resolve(promise).then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
