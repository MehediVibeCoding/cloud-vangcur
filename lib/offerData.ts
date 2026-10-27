import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchProductById } from '@/lib/productData';
import type { Product } from '@/types';

// /offers পেজের অফার কনফিগ (store_settings → vc_offer_popup) ও তার ভ্যালিডেশন।
// আগে এই কোড OffersClient-এর ভেতরে ছিল এবং শুধু ব্রাউজারে চলত; এখন সার্ভার (app/offers/page.tsx, ISR)
// ও ক্লায়েন্ট (ফলব্যাক) — দুই জায়গা থেকেই একই ফাংশন ব্যবহার হয়, তাই লজিক এক থাকে।

export interface OfferModel1 {
  title: string;
  body: string;
  btn_text: string;
  btn_url: string;
}
export interface OfferModel2 {
  img: string;
  url: string;
}
export interface OfferModel3 {
  product_id: string;
  badge_text: string;
}
export type OfferActiveModel = 'none' | 'model1' | 'model2' | 'model3';
export interface OfferConfig {
  active_model: OfferActiveModel;
  model1: OfferModel1;
  model2: OfferModel2;
  model3: OfferModel3;
}

export interface ActiveOffer {
  /** false = ডেটা আনা যায়নি (নেটওয়ার্ক/ডাটাবেজ ত্রুটি) — কলার তখন নিজে আবার চেষ্টা করতে পারে */
  ok: boolean;
  /** ভ্যালিড সক্রিয় অফার; না থাকলে null ("কোনো অফার নেই") */
  config: OfferConfig | null;
  model3Product: Product | null;
}

/**
 * সক্রিয় অফার আনে এবং আগের ক্লায়েন্ট-কোডের হুবহু নিয়মে যাচাই করে:
 * model1 → title লাগবে, model2 → img লাগবে, model3 → product_id ও প্রোডাক্ট পাওয়া যেতে হবে।
 */
export async function fetchActiveOffer(supabase: SupabaseClient): Promise<ActiveOffer> {
  let cfg: OfferConfig | null = null;
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('setting_value')
      .eq('setting_key', 'vc_offer_popup')
      .maybeSingle();
    if (error) return { ok: false, config: null, model3Product: null };
    if (data?.setting_value) {
      const raw = data.setting_value;
      const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object') cfg = parsed as OfferConfig;
    }
  } catch {
    return { ok: false, config: null, model3Product: null };
  }

  let validConfig: OfferConfig | null = null;
  let model3Product: Product | null = null;

  if (cfg && cfg.active_model && cfg.active_model !== 'none') {
    if (cfg.active_model === 'model1' && cfg.model1?.title?.trim()) {
      validConfig = cfg;
    } else if (cfg.active_model === 'model2' && cfg.model2?.img?.trim()) {
      validConfig = cfg;
    } else if (cfg.active_model === 'model3' && cfg.model3?.product_id) {
      model3Product = await fetchProductById(supabase, cfg.model3.product_id);
      if (model3Product) {
        validConfig = cfg;
      } else {
        // fetchProductById ত্রুটিতেও null দেয় — "প্রোডাক্ট নেই" আর "আনা যায়নি" আলাদা করা যায় না।
        // ISR-এ ভুল করে "কোনো অফার নেই" ১ ঘণ্টা ক্যাশ হওয়া ঠেকাতে ok:false দিই; কলার (পেজ) তখন
        // ক্লায়েন্টে আবার চেষ্টা করে (আগের আচরণ)।
        return { ok: false, config: null, model3Product: null };
      }
    }
  }

  return { ok: true, config: validConfig, model3Product };
}
