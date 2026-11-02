import type { SupabaseClient } from '@supabase/supabase-js';
import { logWarn } from './logger';

export interface ProductDetailFields {
  desc: string;
  longDesc: string;
  features: string[];
  faqs: { q: string; a: string }[];
  specs: Record<string, string>;
  powerInfo: string;
  infoBoxes: { title: string; body: string }[];
  metaTitle: string;
  metaDescription: string;
  ogDescription: string;
  quickSpecsText: string;
  packagingContent: string;
}

function parseJsonish<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val as T;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

export async function fetchProductDetail(
  supabase: SupabaseClient,
  id: number | string,
): Promise<ProductDetailFields | null> {
  try {
    const { data, error } = await supabase
      .from('custom_products')
      .select('id,desc_text,features,faqs,specs,power_info,info_boxes,meta_title,meta_description,og_description,quick_specs_text,packaging_content')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      desc: data.desc_text || '',
      longDesc: data.desc_text || '',
      features: Array.isArray(data.features) ? data.features : parseJsonish<string[]>(data.features, []),
      faqs: Array.isArray(data.faqs) ? data.faqs : parseJsonish<{ q: string; a: string }[]>(data.faqs, []),
      specs: parseJsonish<Record<string, string>>(data.specs, data.specs || {}),
      powerInfo: data.power_info || '',
      infoBoxes: Array.isArray(data.info_boxes) ? data.info_boxes : parseJsonish<{ title: string; body: string }[]>(data.info_boxes, []),
      metaTitle: data.meta_title || '',
      metaDescription: data.meta_description || '',
      ogDescription: data.og_description || '',
      quickSpecsText: data.quick_specs_text || '',
      packagingContent: data.packaging_content || '',
    };
  } catch (e) {
    logWarn('[Vangcur] fetchProductDetail failed:', e);
    return null;
  }
}
