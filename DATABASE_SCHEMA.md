# 🗄️ Vangcur — Database Schema, RLS Policies & Stored Procedures (RPCs)
**সর্বশেষ অডিট তারিখ:** সেপ্টেম্বর ২০২৬  
**ডাটাবেজ ইঞ্জিন:** Supabase PostgreSQL 15+  
**সিকিউরিটি লেয়ার:** PostgreSQL Row Level Security (RLS) + Service Role Client + Rate Limiting RPCs

---

## 📌 ১. ওভারভিউ ও আর্কিটেকচারাল পলিসি (Overview)

Vangcur প্ল্যাটফর্মের ডাটাবেজ মডেলটি উচ্চ ট্রাফিকের সময়েও জিরো-ট্রাস্ট সিকিউরিটি, স্টক ওভারসেলিং প্রতিরোধ, স্বয়ংক্রিয় অর্ডার ট্র্যাকিং এবং ব্যবহারকারীর গোপনীয়তা নিশ্চিত করতে তৈরি করা হয়েছে। 

### মূল ডাটাবেজ সুরক্ষানীতি:
1. **Public/Anon ক্লায়েন্ট অ্যাক্সেস:** পাবলিক ক্লায়েন্ট শুধুমাত্র অনুমোদিত পণ্য (`custom_products`), সাধারণ সেটিংস (`store_settings`), অনুমোদিত রিভিউ (`product_reviews`) এবং প্রশ্নাবলি (`product_questions`) পড়তে পারে।
2. **অর্ডার ও স্টক মিউটেশন:** অর্ডারের আসল দাম যাচাই, স্টক কমানো এবং কুপন ব্যবহার শুধুমাত্র সার্ভার-সাইড `Service Role Client` ও সিকিউর Postgres RPC-র মাধ্যমে ঘটে।
3. **মডারেটর ও অ্যাডমিন রুল:** `mehedivibecoding@gmail.com` ইমেইলধারী ইউজার অথবা `profiles` টেবিলে `is_admin = true` / `role IN ('admin', 'moderator', 'super_admin')` চিহ্নিত ব্যবহারকারীরা কিউএন্ডএ এবং রিভিউ ব্যবস্থাপনায় মডারেশন অধিকার পান।

---

## 📋 ২. টেবিল গঠন ও স্কিমা বিবরণী (Tables Schema)

```
   ┌─────────────────────────────────────────────────────────────┐
   │                       auth.users                            │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ (1:1 / 1:N)
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │   profiles   │         │    orders    │         │product_review│
  └──────────────┘         └──────────────┘         └──────────────┘
                                                           │
  ┌──────────────┐         ┌──────────────┐                ▼
  │custom_product│◀────────┤product_quest.│◀────────┌──────────────┐
  └──────────────┘         └──────────────┘         │product_quest_│
                                                    │   _answers   │
  ┌──────────────┐         ┌──────────────┐         └──────────────┘
  │store_settings│         │abandoned_chk.│
  └──────────────┘         └──────────────┘
```

---

### ১. `custom_products` (পণ্য ক্যাটালগ)
ওয়েবসাইটের সমস্ত টেক গ্যাজেট ও লাইফস্টাইল অ্যাক্সেসরিজের প্রধান ডাটা টেবিল।

| কলামের নাম | ডাটা টাইপ | কনস্ট্রেইন্ট / ডিফল্ট | বিবরণ |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` / `TEXT` | `PRIMARY KEY` | ইউনিক প্রোডাক্ট আইডি। |
| `cat` | `TEXT` | `NOT NULL` | মূল ক্যাটাগরি স্লাগ (যেমন: `rgb`, `tws`, `smartwatch`)। |
| `cats` | `JSONB` / `TEXT[]` | `DEFAULT '[]'` | একাধিক ক্যাটাগরি ট্যাগিং অ্যারে। |
| `name` | `TEXT` | `NOT NULL` | পণ্যের মূল ইংরেজি/প্রমিত নাম। |
| `name_bn` | `TEXT` | `NULL` | পণ্যের বাংলা নাম (সার্চের জন্য)। |
| `price` | `NUMERIC` | `NOT NULL` | বর্তমান বিক্রয়মূল্য (টাকায়)। |
| `old` | `NUMERIC` | `NULL` | ছাড়ের পূর্বের পুরনো মূল্য। |
| `stock` | `INTEGER` | `NOT NULL, DEFAULT 0` | বর্তমান ইনভেন্টরি স্টক সংখ্যা। |
| `badge` | `TEXT` | `NULL` | কার্ডে প্রদর্শিত ব্যাজ (যেমন: `HOT`, `NEW`)। |
| `warranty` | `TEXT` | `NULL` (কোনো ডিফল্ট নেই) | ওয়ারেন্টির মেয়াদ টেক্সট। **খালি = ওয়ারেন্টি নেই** → প্রোডাক্ট পেজে সবুজ ওয়ারেন্টি অংশ দেখানো হয় না। যেভাবেই লেখা থাকুক (বাংলা/ইংরেজি), `lib/warrantyData.ts` মেয়াদ বুঝে সাইটের ভাষা অনুযায়ী লেবেল বানায়। |
| `rating` | `NUMERIC(2,1)` | `DEFAULT 4.8` | ডিফল্ট স্টার রেটিং। |
| `imgs` | `JSONB` | `DEFAULT '[]'` | ক্লাউডিনারি ইমেজ ইউআরএল অ্যারে। |
| `specs` | `JSONB` | `DEFAULT '{}'` | টেকনিক্যাল স্পেসিফিকেশন অবজেক্ট। |
| `desc_text` | `TEXT` | `NULL` | পণ্যের প্রাথমিক বর্ণনা। |
| `long_desc` | `TEXT` | `NULL` | বিস্তারিত বিবরণী (অনুচ্ছেদসহ)। |
| `features` | `JSONB` | `DEFAULT '[]'` | প্রধান ফিচারসমূহের বুলেট অ্যারে। |
| `faqs` | `JSONB` | `DEFAULT '[]'` | প্রোডাক্ট-ভিত্তিক সাধারণ প্রশ্নোত্তর। |
| `closing` | `TEXT` | `NULL` | ডেসক্রিপশনের সমাপ্তি নোট। |
| `power_info` | `TEXT` | `NULL` | পাওয়ার/কানেকশন বিস্তারিত। |
| `info_boxes` | `JSONB` | `DEFAULT '[]'` | অতিরিক্ত তথ্যের হাইলাইট কার্ডস। |
| `seo_h1` | `TEXT` | `NULL` | এসইও উপযোগী কাস্টম H1 হেডিং। |
| `meta_title` | `TEXT` | `NULL` | কাস্টম মেটা টাইটেল। |
| `meta_description`| `TEXT` | `NULL` | এসইও মেটা ডেসক্রিপশন। |
| `og_description` | `TEXT` | `NULL` | সোশ্যাল শেয়ারিং ওজি ডেসক্রিপশন। |
| `quick_specs_text`| `TEXT` | `NULL` | এক নজরে স্পেকস পিল টেক্সট (বুলেটযুক্ত)। |
| `packaging_content`| `TEXT`| `NULL` | বক্সের ভেতরে যা যা থাকবে। |

---

### ২. `orders` (অর্ডার ও পেমেন্ট রেকর্ড)
গ্রাহকদের সকল অনলাইন অর্ডার, অগ্রিম পেমেন্ট ও কুরিয়ার ট্র্যাকিং রেকর্ড।

| কলামের নাম | ডাটা টাইপ | কনস্ট্রেইন্ট / ডিফল্ট | বিবরণ |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` / `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | ইউনিক ডাটাবেজ অর্ডার আইডি। |
| `order_num` | `TEXT` | `NOT NULL, UNIQUE` | গ্রাহক প্রদর্শিত অর্ডার রেফারেন্স (যেমন: `#VC-1082`)। |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | অর্ডার তৈরির সময়কাল। |
| `user_id` | `UUID` | `NULL, REFERENCES auth.users(id)` | রেজিস্টার্ড ইউজারের আইডি (গেস্ট হলে NULL)। |
| `customer_name` | `TEXT` | `NOT NULL` | গ্রাহকের পূর্ণ নাম। |
| `customer_phone`| `TEXT` | `NOT NULL` | ১১ ডিজিটের মোবাইল নম্বর। |
| `customer_district`| `TEXT`| `NOT NULL` | নির্বাচিত জেলা (যেমন: ঢাকা, চট্টগ্রাম)। |
| `customer_address`| `TEXT` | `NOT NULL` | সম্পূর্ণ ডেলিভারি ঠিকানা। |
| `customer_email`| `TEXT` | `NULL` | ইনভয়েস পাঠানোর ঐচ্ছিক ইমেইল। |
| `items` | `JSONB` | `NOT NULL` | অর্ডারকৃত পণ্যের তালিকা (`[{id, name, emoji, price, qty}]`)। |
| `shipping` | `TEXT` | `NOT NULL` | শিপিং জোন (`dhaka`, `outside`, `bangladesh`)। |
| `shipping_cost` | `NUMERIC` | `NOT NULL, DEFAULT 70` | প্রযোজ্য ডেলিভারি চার্জ। |
| `subtotal` | `NUMERIC` | `NOT NULL` | পণ্যের মূল সাবটোটাল বিল। |
| `total` | `NUMERIC` | `NOT NULL` | সর্বমোট বিল (ডিসকাউন্ট ও শিপিং সহ)। |
| `discount_amount`| `NUMERIC`| `DEFAULT 0` | কুপনে প্রাপ্ত ছাড়ের পরিমাণ। |
| `coupon_code` | `TEXT` | `NULL` | ব্যবহৃত কুপন কোড। |
| `advance_paid` | `NUMERIC` | `NOT NULL, DEFAULT 200` | প্রদেয় অগ্রিম সেন্ড মানি (৳২০০ বা ৫%+১.৫% বিকাশ ফি)। |
| `payment_txn` | `TEXT` | `NULL, UNIQUE` | বিকাশ ১০ ডিজিটের ট্রানজেকশন আইডি (TxnID)। |
| `payment_last4` | `TEXT` | `NULL` | প্রেরক বিকাশ নম্বরের শেষ ৪ ডিজিট। |
| `fingerprint_id`| `TEXT` | `NULL` | অ্যান্টি-ফ্রড ব্রাউজার ফিঙ্গারপ্রিন্ট হ্যাশ। |
| `status` | `TEXT` | `DEFAULT 'pending'` | স্ট্যাটাস: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`, `rejected`। |

---

### ৩. `profiles` (গ্রাহক ও এডমিন প্রোফাইল)

| কলামের নাম | ডাটা টাইপ | কনস্ট্রেইন্ট / ডিফল্ট | বিবরণ |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, REFERENCES auth.users(id)` | সুপাবেস অথ ইউজার আইডি। |
| `name` | `TEXT` | `NULL` | গ্রাহকের পূর্ণ নাম। |
| `email` | `TEXT` | `NULL` | ইমেইল ঠিকানা। |
| `phone` | `TEXT` | `NULL` | মোবাইল নম্বর। |
| `address` | `TEXT` | `NULL` | ডেলিভারি ঠিকানা (Complete Your Profile ফিচার থেকে সংরক্ষিত)। |
| `avatar` | `TEXT` | `NULL` | প্রোফাইল ছবি ইউআরএল। |
| `role` | `TEXT` | `DEFAULT 'customer'` | ইউজার রোল (`customer`, `moderator`, `admin`, `super_admin`)। |
| `is_admin` | `BOOLEAN` | `DEFAULT FALSE` | এডমিন প্রিভিলেজ ফ্ল্যাগ। |
| `wishlist` | `JSONB` | `DEFAULT '[]'` | ইউজারের ক্লাউড সিঙ্কড উইশলিস্ট আইটেমস। |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | সর্বশেষ আপডেটের সময়। |

---

### ৪. `store_settings` (সেন্ট্রালাইজড স্টোর কনফিগারেশন)

| কলামের নাম | ডাটা টাইপ | কনস্ট্রেইন্ট | বিবরণ |
| :--- | :--- | :--- | :--- |
| `setting_key` | `TEXT` | `PRIMARY KEY` | কনফিগ কী (নিচে তালিকা দ্রষ্টব্য)। |
| `setting_value` | `JSONB` / `TEXT` | `NOT NULL` | সেটিংস পেলোড ডাটা। |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | সর্বশেষ আপডেটের সময়কাল। |

#### প্রধান `setting_key` রেজিস্ট্রি:
- `vc_categories`: ক্যাটাগরি লিস্ট ও ভেক্টর এসভিজি আইকনসমূহ।
- `vc_contact`: অফিসিয়াল বিকাশ নম্বর, হেল্পলাইন ফোন, হোয়াটসঅ্যাপ ও ইমেইল।
- `vc_shipping`: জেলা অনুযায়ী শিপিং রেট কনফিগ (`dhaka: 70, out: 120, bd: 120`)।
- `vc_footer`: ফুটার সোশ্যাল লিংক, কপিরাইট টেক্সট ও বিবরণী।
- `vc_logo`: লোগো টাইপ ও ইমেজ ইউআরএল।
- `vc_cath_cards`: হোমপেজ হিরো স্টোরি স্লাইডার কার্ডস ডাটা।
- `vc_faqs`: সাধারণ জিজ্ঞাসার প্রশ্নোত্তর তালিকা।
- `vc_about_desc`: এবাউট সেকশনের কাস্টম ব্র্যান্ড হিস্ট্রি।
- `vc_offer_popup`: অফার পেজ ও পপআপ কনফিগ (মডেল ১, ২, ৩)।
- `vc_prod_order`: প্রোডাক্ট গ্রিডের কাস্টম সর্টিং অর্ডার অ্যারে।

---

### ৫. `product_reviews` (কাস্টমার আনবক্সিং রিভিউ ও রেটিং)

| কলামের নাম | ডাটা টাইপ | কনস্ট্রেইন্ট / ডিফল্ট | বিবরণ |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PRIMARY KEY, GENERATED ALWAYS AS IDENTITY` | ইউনিক রিভিউ আইডি। |
| `product_id` | `TEXT` / `BIGINT` | `NOT NULL` | সংশ্লিষ্ট প্রোডাক্টের আইডি। |
| `user_id` | `UUID` | `NOT NULL, REFERENCES auth.users(id)` | রিভিউ প্রদানকারী ইউজারের আইডি। |
| `user_name` | `TEXT` | `NOT NULL` | কাস্টমারের নাম। |
| `rating` | `INTEGER` | `NOT NULL, CHECK (rating >= 1 AND rating <= 5)` | প্রদত্ত স্টার রেটিং (১ থেকে ৫)। |
| `review_text` | `TEXT` | `NOT NULL` | রিভিউ মতামত (কমপক্ষে ২০ অক্ষর)। |
| `image_url` | `TEXT` | `NULL` | ক্লাউডিনারি আনবক্সিং ইমেজ ইউআরএল (কমা সেপারেটেড)। |
| `like_count` | `INTEGER` | `DEFAULT 0` | অন্যান্য ইউজারের লাইক কাউন্ট। |
| `is_verified_buyer`| `BOOLEAN`| `DEFAULT FALSE` | অর্ডারের সাথে ম্যাচ করা ভেরিফায়েড বায়ার ফ্ল্যাগ। |
| `is_approved` | `BOOLEAN` | `DEFAULT FALSE` | মডারেশন অনুমোদন ফ্ল্যাগ (এডমিন/মডারেটরের রিভিউ সরাসরি True)। |
| `is_rejected` | `BOOLEAN` | `DEFAULT FALSE` | রিজেক্টেড ফ্ল্যাগ। |
| `rejection_reason`| `TEXT` | `NULL` | রিজেক্ট করার কারণ (কাস্টমার দেখতে পাবেন)। |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | সাবমিট করার সময়। |

---

### ৬. `product_questions` ও `product_question_answers` (কমিউনিটি Q&A)

#### `product_questions`:
| কলাম | টাইপ | বিবরণ |
| :--- | :--- | :--- |
| `id` | `BIGINT PRIMARY KEY` | ইউনিক প্রশ্ন আইডি। |
| `product_id` | `TEXT / BIGINT` | প্রোডাক্ট আইডি। |
| `user_id` | `UUID (Optional)` | প্রশ্নকারীর ইউজার আইডি। |
| `user_name` | `TEXT NOT NULL` | প্রশ্নকারীর নাম। |
| `question` | `TEXT NOT NULL` | মূল প্রশ্ন টেক্সট (১০-৩০০ অক্ষর)। |
| `created_at` | `TIMESTAMPTZ` | প্রশ্ন করার সময়কাল। |

#### `product_question_answers`:
| কলাম | টাইপ | বিবরণ |
| :--- | :--- | :--- |
| `id` | `BIGINT PRIMARY KEY` | ইউনিক উত্তর আইডি। |
| `question_id` | `BIGINT REFERENCES product_questions(id)` | সংশ্লিষ্ট প্রশ্নের রেফারেন্স। |
| `user_id` | `UUID (Optional)` | উত্তরদাতার আইডি। |
| `author_name` | `TEXT NOT NULL` | উত্তরদাতার নাম (এডমিন হলে "Vangcur টিম")। |
| `is_admin` | `BOOLEAN DEFAULT FALSE` | অফিসিয়াল উত্তর ফ্ল্যাগ। |
| `answer` | `TEXT NOT NULL` | উত্তরের টেক্সট (৫-৫০০ অক্ষর)। |
| `created_at` | `TIMESTAMPTZ` | উত্তর প্রকাশের সময়কাল। |

---

### ৭. `abandoned_checkouts` (অসম্পূর্ণ চেকআউট ড্রাফট)

| কলাম | টাইপ | বিবরণ |
| :--- | :--- | :--- |
| `id` | `BIGINT PRIMARY KEY` | ড্রাফট রেকর্ড আইডি। |
| `draft_id` | `TEXT NOT NULL` | ক্লায়েন্ট ড্রাফট রেফারেন্স। |
| `user_id` | `UUID REFERENCES auth.users(id)` | লগইন করা ইউজারের আইডি। |
| `customer_name`, `customer_phone`, `customer_district`, `customer_address`, `customer_email` | `TEXT` | আংশিক পূরণকৃত ফর্ম ডাটা। |
| `items` | `JSONB NOT NULL` | ড্রাফট কার্ট আইটেমস। |
| `shipping` | `TEXT` | নির্বাচিত শিপিং জোন। |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | ড্রাফট তৈরির সময়। |

---

### ৮. `order_risk` (অর্ডার ট্রাস্ট স্কোর — শুধু অ্যাডমিনের জন্য)

> 🔒 RLS চালু, **কোনো policy নেই**, `anon`/`authenticated`-এর সব গ্রান্ট বাতিল — শুধু service-role পড়ে/লেখে। কাস্টমার কখনো নিজের স্কোর দেখতে পায় না। (এ কারণেই স্কোর `orders`-এ কলাম হিসেবে নেই: `authenticated`-এর `orders`-এ টেবিল-লেভেল SELECT আছে, নতুন কলামও নিজের অর্ডারে পড়া যেত।)

| কলাম | টাইপ | বিবরণ |
| :--- | :--- | :--- |
| `order_id` | `UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE` | কোন অর্ডারের স্কোর। |
| `score` | `INTEGER NOT NULL CHECK (0..100)` | ১০০ নম্বরের ট্রাস্ট স্কোর। |
| `level` | `TEXT NOT NULL CHECK IN ('green','yellow','red')` | ≥৭৫ green (High), ৪৫–৭৪ yellow (Medium), <৪৫ বা হার্ড লিমিট red (Low)। |
| `hard_limit` | `BOOLEAN DEFAULT false` | হার্ড লিমিট ছোঁয়ার কারণে সরাসরি লাল কিনা। |
| `reasons` | `JSONB` | যে ফ্যাক্টরে পূর্ণ নম্বর মেলেনি, তার বাংলা কারণ। |
| `breakdown` | `JSONB` | প্রতিটা ফ্যাক্টরের `{key,label,points,max,tone,note}`। |
| `ip_city`, `ip_region`, `ip_country` | `TEXT` | অর্ডারের সময়ের Cloudflare আইপি-লোকেশন (request.cf)। |
| `engine_version` | `INTEGER DEFAULT 1` | ভবিষ্যতে ফর্মুলা বদলালে রি-স্কোর চিনতে। |
| `scored_at` | `TIMESTAMPTZ DEFAULT NOW()` | স্কোর হিসাবের সময়। |

লেখে: `lib/riskScoring.ts` (`after()`-এর ভেতর, `checkout.ts` থেকে)। ফর্মুলা: `lib/riskEngine.ts`।

---

### ৯. `limit_events` (কে কোন লিমিট ছুঁয়েছে — অ্যাডমিন-অনলি)

> 🔒 `order_risk`-এর মতোই লকড (RLS চালু, policy নেই, শুধু service-role)।

| কলাম | টাইপ | বিবরণ |
| :--- | :--- | :--- |
| `id` | `BIGINT IDENTITY PRIMARY KEY` | রেকর্ড আইডি। |
| `limit_type` | `TEXT NOT NULL` | `phone_daily`, `fingerprint_daily`, `coupon_fail_hourly` (হার্ড) · `phone_cooldown`, `ip_daily`, `pending_lock`, `coupon_burst` (সফট)। |
| `severity` | `TEXT NOT NULL CHECK IN ('hard','soft')` | `lib/limitEvents.ts`-এর `LIMIT_SEVERITY` থেকে ধরন অনুযায়ী নির্ধারিত — কলার ঠিক করে না। |
| `phone`, `fingerprint_id`, `user_id`, `ip` | `TEXT`/`UUID` | কে ছুঁয়েছে। কুপন-ঘটনায় শুধু `ip` ও `user_id` (সেশন থেকে) — ফোন/ডিভাইস ক্লায়েন্ট পাঠায়, তাই ফাঁসানো ঠেকাতে নয়। |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | ঘটনার সময়। স্কোরিং গত ৩০ দিন দেখে। |

নতুন কোনো লিমিট যোগ করলে ওই জায়গায় `recordLimitHit(service, { type, phone?, fingerprintId?, userId?, ip? })` কল করুন (এবং `LimitEventType`/`LIMIT_SEVERITY`-এ ধরনটা যোগ করুন) — স্কোরিং কোডে হাত দিতে হবে না। কোনো ধরন হার্ড হলে সেটা ফোন/ডিভাইস/লগইনের সাথে মিললে অর্ডার সরাসরি লাল হয়; শুধু আইপি মিললে কেবল পয়েন্ট কাটে (শেয়ার্ড মোবাইল-নেটওয়ার্ক আইপির কারণে সৎ কাস্টমারকে লাল না করার জন্য)।

---

## ⚙️ ৩. সংরক্ষিত ডাটাবেজ ফাংশন ও RPCসমূহ (Stored Procedures)

### ১. `decrement_product_stock(p_items JSONB)`
- **উদ্দেশ্য:** অর্ডার সাবমিট হওয়ামাত্র অটোমিকভাবে প্রতিটি পণ্যের স্টক ডাটাবেজে কমায়।
- **নিরাপত্তা:** কোনো পণ্যের স্টক অপ্রতুল হলে ট্রানজেকশন রোলব্যাক করে `INSUFFICIENT_STOCK` এক্সেপশন ছুঁড়ে দেয় (ওভারসেলিং অসম্ভব)।

### ২. `validate_and_apply_coupon(p_code TEXT, p_subtotal NUMERIC, p_phone TEXT, p_user_id UUID)`
- **উদ্দেশ্য:** কুপন কোডের সক্রিয়তা, মেয়াদ, ন্যূনতম অর্ডারের শর্ত, এবং পার-ইউজার ব্যবহার সীমা ডাটাবেজেই যাচাই করে মোট ডিসকাউন্ট ও ফ্রি ডেলিভারি স্ট্যাটাস রিটার্ন করে।

### ৩. `increment_coupon_usage(p_code TEXT)`
- **উদ্দেশ্য:** অর্ডার সফলভাবে সম্পন্ন হলে ব্যাকগ্রাউন্ডে কুপনের মোট ব্যবহার সংখ্যা ১ বৃদ্ধি করে।

### ۴. `check_and_set_rate_limit(p_phone TEXT)`
- **উদ্দেশ্য:** একই ফোন নম্বর থেকে গত ২৪ ঘণ্টায় ৩টির বেশি অর্ডারের চেষ্টা করলে `allowed: false` রিটার্ন করে ফেক বুকিং আটকায়।

### ৫. `check_and_set_fingerprint_limit(p_fingerprint_id TEXT)`
- **উদ্দেশ্য:** একই ডিভাইস ফিঙ্গারপ্রিন্ট থেকে দৈনিক ৩টির বেশি অর্ডার প্রচেষ্টা ব্লক করে।

### ৬. `get_guest_order(p_id TEXT, p_phone TEXT)`
- **উদ্দেশ্য:** গেস্ট ইউজারদের ফোন নম্বর এবং অর্ডার আইডি হুবহু মিললে সিকিউরলি অর্ডারের পূর্ণ বিবরণ ফেরত দেয় (অন্য কারো অর্ডার দেখার সুযোগ নেই)।

### ৭. `increment_review_like(p_review_id BIGINT)`
- **উদ্দেশ্য:** কাস্টমার রিভিউয়ের লাইক সংখ্যা অটোমিকভাবে ১ বাড়ায়।

---

## 🔒 ৪. রো লেভেল সিকিউরিটি পলিসি ম্যাপিং (Row Level Security - RLS)

| টেবিল | অপারেশন | পলিসি নিয়ম ও এক্সেস লেভেল |
| :--- | :--- | :--- |
| **`custom_products`** | `SELECT` | **পাবলিক (Anon / Auth):** সবাই পণ্য দেখতে পারে। |
| | `INSERT/UPDATE/DELETE` | **Service Role / Admin:** শুধুমাত্র এডমিন পরিবর্তন করতে পারে। |
| **`orders`** | `SELECT` | **Owner / Auth:** ইউজার কেবল নিজের `user_id`-এর অর্ডার দেখতে পারে।<br>**Service Role:** সম্পূর্ণ এক্সেস। |
| | `INSERT` | **Service Role / Server Action:** শুধুমাত্র সার্ভার অ্যাকশন দিয়ে অর্ডার ইনসার্ট হয়। |
| | `UPDATE/DELETE` | **Service Role / Admin:** ক্লায়েন্ট থেকে সরাসরি পরিবর্তন নিষিদ্ধ। |
| **`profiles`** | `SELECT / UPDATE` | **Owner:** ইউজার শুধুমাত্র নিজের প্রোফাইল রিড/এডিট করতে পারে (`auth.uid() = id`)। |
| **`store_settings`** | `SELECT` | **পাবলিক (Anon / Auth):** স্টোর কনফিগ সবাই পড়তে পারে। |
| | `INSERT/UPDATE/DELETE` | **Service Role / Admin:** শুধুমাত্র এডমিন সেটিং বদলাতে পারে। |
| **`product_reviews`** | `SELECT` | **পাবলিক:** `is_approved = true AND is_rejected = false` দেখতে পাবে।<br>**Owner:** নিজের আন-অ্যাপ্রুভড রিভিউ দেখতে পাবে। |
| | `INSERT` | **Authenticated User:** লগইন করা ইউজার নিজের রিভিউ সাবমিট করতে পারে। |
| | `UPDATE / DELETE` | **Owner (Only delete):** নিজের রিভিউ মুছতে পারে।<br>**Admin/Moderator:** অ্যাপ্রুভ, রিজেক্ট বা ডিলিট করতে পারে। |
| **`product_questions`** | `SELECT` | **পাবলিক:** সকল প্রোডাক্ট প্রশ্ন পড়তে পারে। |
| | `INSERT` | **Anon / Auth:** যেকোনো ভিজিটর প্রশ্ন সাবমিট করতে পারে। |
| | `DELETE` | **Owner / Admin:** নিজের প্রশ্ন অথবা এডমিন মুছতে পারে। |
| **`product_question_answers`** | `SELECT` | **পাবলিক:** সকল উত্তর দেখতে পাবে। |
| | `INSERT` | **Admin / Moderator:** অফিসিয়াল উত্তর দিতে পারে।<br>**Owner:** ফলো-আপ মন্তব্য দিতে পারে। |
