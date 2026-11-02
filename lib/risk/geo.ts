// [NEW FILE] ফাইলের পাথ: lib/risk/geo.ts
//
// বাংলাদেশের বিভাগ/জেলা/উপজেলা/ইউনিয়ন তালিকার সাথে ফ্রি-টেক্সট ঠিকানা মেলানো।
// উৎস ডেটা: lib/risk/data/bd-geo.ts (nuhil/bangladesh-geocode, MIT লাইসেন্স)

import { DISTRICTS, DIVISIONS, UNIONS, UPAZILAS } from './data/bd-geo';
import { bnKey, enKey } from './text';

interface Entry { id: number; parentId: number; en: string; bn: string; keyBn: string; keyEn: string }

function buildIndex(rows: [number, number, string, string][]): { list: Entry[] } {
  const list: Entry[] = rows.map(([id, parentId, en, bn]) => ({
    id, parentId, en, bn, keyBn: bnKey(bn), keyEn: enKey(en),
  }));
  return { list };
}

const districtIdx = buildIndex(DISTRICTS);
const upazilaIdx = buildIndex(UPAZILAS);
const unionIdx = buildIndex(UNIONS);
const divisionList: Entry[] = DIVISIONS.map(([id, en, bn]) => ({ id, parentId: 0, en, bn, keyBn: bnKey(bn), keyEn: enKey(en) }));

// পারফরম্যান্স: প্রতি অর্ডারে ৪৫৪০টা ইউনিয়ন লিনিয়ার সার্চ না করে, জেলা/উপজেলা
// মিললেই সেই বাবা-এন্ট্রির সন্তানদের মধ্যে সীমাবদ্ধ সার্চ (১০–১৫টা এন্ট্রি মাত্র)।
const upazilaByDistrict = new Map<number, Entry[]>();
for (const e of upazilaIdx.list) {
  const arr = upazilaByDistrict.get(e.parentId) ?? [];
  arr.push(e);
  upazilaByDistrict.set(e.parentId, arr);
}
const unionByUpazila = new Map<number, Entry[]>();
for (const e of unionIdx.list) {
  const arr = unionByUpazila.get(e.parentId) ?? [];
  arr.push(e);
  unionByUpazila.set(e.parentId, arr);
}

export type GeoLevel = 'division' | 'district' | 'upazila' | 'union';
export interface GeoMatch { level: GeoLevel; en: string; bn: string; id: number; parentId: number }

/** টেক্সটের ভেতর কোনো এন্ট্রি (জেলা/উপজেলা/ইউনিয়ন/বিভাগ) খুঁজে পেলে ফেরত দেয় — সরাসরি সাবস্ট্রিং মিল (bnKey/enKey নরমালাইজড) */
function findInText(text: string, idx: { list: Entry[] }, level: GeoLevel): GeoMatch[] {
  const bk = bnKey(text);
  const ek = enKey(text);
  const found: GeoMatch[] = [];
  for (const e of idx.list) {
    const hit = (e.keyBn.length >= 3 && bk.includes(e.keyBn)) || (e.keyEn.length >= 3 && ek.includes(e.keyEn));
    if (hit) found.push({ level, en: e.en, bn: e.bn, id: e.id, parentId: e.parentId });
  }
  // লম্বা নাম আগে (যেমন "দক্ষিণ সুরমা" যেন শুধু "সুরমা"-র চেয়ে অগ্রাধিকার পায়)
  return found.sort((a, b) => Math.max(b.bn.length, b.en.length) - Math.max(a.bn.length, a.en.length));
}

export interface GeoAnalysis {
  division?: GeoMatch;
  district?: GeoMatch;
  upazila?: GeoMatch;
  union?: GeoMatch;
  /** claimed district (ড্রপডাউন) ও ঠিকানার টেক্সটে পাওয়া জেলা না মিললে */
  districtMismatch: boolean;
}

/**
 * ফ্রি-টেক্সট ঠিকানায় যত ভৌগোলিক স্তর শনাক্ত করা যায় (জেলা/উপজেলা/ইউনিয়ন) — আলাদা কোনো
 * ফর্ম ফিল্ড ছাড়াই, কাস্টমার যদি নিজের ঠিকানায় উপজেলা/ইউনিয়নের নাম লিখে থাকে সেটাও ধরা পড়ে।
 * claimedDistrict দিলে (Vangcur-এর জেলা ড্রপডাউন) টেক্সটের সাথে মিল যাচাই করে।
 */
export function analyzeGeo(addressText: string, claimedDistrict?: string): GeoAnalysis {
  const district = findInText(addressText, districtIdx, 'district')[0];

  // জেলা মিললে শুধু ওই জেলার উপজেলাগুলোর মধ্যে খোঁজা (৪৯৪টার বদলে গড়ে ৮টা)
  const upazilaScope = district ? { list: upazilaByDistrict.get(district.id) ?? [] } : upazilaIdx;
  const upazila = findInText(addressText, upazilaScope, 'upazila')[0];

  // ইউনিয়নের নাম প্রায়ই ছোট/সাধারণ শব্দ হওয়ায় সারা দেশের ৪৫৪০টার মধ্যে আনস্কোপড খুঁজলে
  // ভুল মিল (false positive) হওয়ার ঝুঁকি বেশি। তাই উপজেলা নিশ্চিত না হলে ইউনিয়ন খোঁজা হয় না।
  const union = upazila ? findInText(addressText, { list: unionByUpazila.get(upazila.id) ?? [] }, 'union')[0] : undefined;

  const divisionEntry = district
    ? divisionList.find((d) => DISTRICTS.find(([id]) => id === district.id)?.[1] === d.id)
    : undefined;
  const division: GeoMatch | undefined = divisionEntry
    ? { level: 'division', en: divisionEntry.en, bn: divisionEntry.bn, id: divisionEntry.id, parentId: 0 }
    : (district ? undefined : findInText(addressText, { list: divisionList }, 'division')[0]);

  let districtMismatch = false;
  if (claimedDistrict && district) {
    const ck = bnKey(claimedDistrict) || enKey(claimedDistrict);
    const dk = bnKey(district.bn) || enKey(district.en);
    districtMismatch = ck.length > 0 && dk.length > 0 && !ck.includes(dk) && !dk.includes(ck);
  }

  return { division, district, upazila, union, districtMismatch };
}
