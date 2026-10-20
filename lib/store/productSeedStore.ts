// ফাইলের পাথ: lib/store/productSeedStore.ts (নতুন ফাইল)
// কার্ডে ক্লিক করার মুহূর্তে প্রোডাক্টের যে তথ্য (নাম, দাম, ছবি) ব্রাউজারে আগে থেকেই আছে,
// সেটা এখানে রাখা হয় — যাতে আসল পেজ নেটওয়ার্ক থেকে আসার আগেই ProductNavShell তাৎক্ষণিক
// একটা শেল দেখাতে পারে। এটা শুধু দেখানোর জন্য; দাম/স্টকের সত্য সবসময় আসল পেজ ও চেকআউট থেকেই আসে।
import { create } from 'zustand';

// 🔌 কিল-সুইচ: কোনো সমস্যা হলে এটা false করলেই শেল পুরোপুরি বন্ধ (বাকি সাইট অপরিবর্তিত)
export const OPTIMISTIC_PRODUCT_SHELL_ENABLED = true;

export interface ProductSeed {
  /** গন্তব্য পাথ, যেমন /product/led-lamp-12 — pathname এর সাথে মিললেই শেল সরে যায় */
  href: string;
  name: string;
  price: number;
  old?: number;
  /** কার্ডে যে ছবির URL ইতিমধ্যে ব্রাউজারে লোড হয়েছে (হুবহু সেটাই, তাই ক্যাশ থেকে আসে) */
  img?: string;
}

interface ProductSeedState {
  pending: ProductSeed | null;
  begin: (seed: ProductSeed) => void;
  clear: () => void;
}

export const useProductSeedStore = create<ProductSeedState>((set) => ({
  pending: null,
  begin: (seed) => set({ pending: seed }),
  clear: () => set((s) => (s.pending ? { pending: null } : s)),
}));
