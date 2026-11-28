// 🧰 vangcur-api — ছোট API-গুলোর Worker। লজিক আছে handlers.js-এ; এই ফাইল শুধু Workers-এর প্রবেশপথ।
// বিস্তারিত: ../README.md

import { WorkerEntrypoint } from 'cloudflare:workers';
import { handle, resetMemory } from './handlers.js';

export default class extends WorkerEntrypoint {
  async fetch(request) {
    return handle(request, this.env, this.ctx);
  }

  /**
   * মূল Worker `env.API_WORKER.purge()` দিয়ে ডাকে (Service Binding RPC — পাবলিক HTTP-তে পৌঁছায় না)।
   * অ্যাডমিন প্রোডাক্ট বদলালে (`revalidate-catalog`) /api/search-index-এর এজ-ক্যাশ মোছে, যাতে ১ ঘণ্টা অপেক্ষা করতে না হয়।
   * ব্যর্থ হলে কিছু ভাঙে না — ক্যাশ সর্বোচ্চ ১ ঘণ্টায় নিজে ঠিক হয়।
   */
  async purge() {
    resetMemory();
    try {
      await this.ctx.cache.purge({ purgeEverything: true });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }
}
