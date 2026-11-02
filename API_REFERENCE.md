# 🔌 Vangcur — API & Server Actions Technical Reference
**সর্বশেষ অডিট তারিখ:** সেপ্টেম্বর ২০২৬  
**আওতাভুক্ত ইঞ্জিন:** Next.js 16 Server Actions, Route Handlers (`/api/*`), External Service Integrations

---

## 📌 ১. ওভারভিউ (Overview)

Vangcur প্ল্যাটফর্মের ব্যাকএন্ড যোগাযোগ প্রধানত Next.js 16-এর টাইপ-সেফ **Server Actions** এবং নির্দিষ্ট কিছু হাই-পারফরম্যান্স **Route Handlers**-এর মাধ্যমে পরিচালিত হয়। সংবেদনশীল অপারেশনগুলোতে ক্লায়েন্টকে দ্রুত রেসপন্স দিতে এবং ব্যাকগ্রাউন্ড টাস্ক সম্পন্ন করতে Next.js 16-এর নেটিভ `after()` প্রিমিটিভ ব্যবহার করা হয়।

---

## ⚡ ২. সার্ভার অ্যাকশনস (Server Actions)

### `createOrder(payload: OrderPayload)`
- **ফাইলের অবস্থান:** `app/actions/checkout.ts`
- **এক্সিকিউশন এনভায়রনমেন্ট:** Server-side Only (`'use server'`)
- **প্রবেশাধিকার (Access):** পাবলিক (ক্লায়েন্ট চেকআউট পেজ থেকে কল করা হয়)
- **অথরিটেটিভ মডেল:** জিরো-ট্রাস্ট (ক্লায়েন্টের পাঠানো কোনো দাম বা ফি বিশ্বাস করা হয় না)

#### ১. রিকোয়েস্ট পেলোড ইন্টারফেস (`OrderPayload`):
```typescript
interface OrderPayload {
  name: string;                   // গ্রাহকের নাম (৩-৩০ অক্ষর)
  phone: string;                  // ১১ ডিজিটের বৈধ বাংলাদেশি নম্বর (01XXXXXXXXX)
  district: string;               // ৬৪ জেলার একটি
  address: string;                // বিস্তারিত ডেলিভারি ঠিকানা (৮-৩০০ অক্ষর)
  email?: string;                 // ঐচ্ছিক ইনভয়েস ইমেইল
  shipping: string;               // 'dhaka' | 'outside' | 'bangladesh'
  items: { id: string; qty: number }[]; // শুধুমাত্র প্রোডাক্ট আইডি ও পরিমাণ
  paymentTxn?: string;            // ১০ ক্যারেক্টারের বিকাশ TxnID (বিকল্প ১)
  paymentLast4?: string;          // প্রেরক বিকাশ নম্বরের শেষ ৪ ডিজিট (বিকল্প ২)
  fingerprintId: string;          // ব্রাউজার ফিঙ্গারপ্রিন্ট আইডি
  couponCode?: string;            // ঐচ্ছিক কুপন কোড
  lang?: 'bn' | 'en';             // এরর মেসেজের ভাষা নির্বাচন
}
```

#### ২. রেসপন্স স্ট্রাকচার (`ActionResponse<CreateOrderResult>`):
- **সফল রেসপন্স:**
  ```json
  {
    "ok": true,
    "data": {
      "id": 1082,
      "orderNum": "#VC-1082"
    }
  }
  ```
- **ব্যর্থ রেসপন্স:**
  ```json
  {
    "ok": false,
    "error": "দুঃখিত, একটি পণ্য স্টকে নেই বা পরিমাণ যথেষ্ট নেই"
  }
  ```

#### ৩. অভ্যন্তরীণ এক্সিকিউশন ধাপ ও আরপিসি কলস:
1. **ইনপুট ফিল্টারিং:** `validateName`, `validatePhone`, `validateAddress`, `validateTxnId`।
2. **মডারেটর চেক:** `mehedivibecoding@gmail.com` ইমেইল হলে রেট লিমিট ও ২০k সীমা বাইপাস।
3. **রেট লিমিটিং RPC:** `check_and_set_rate_limit(phone)` এবং `check_and_set_fingerprint_limit(fingerprintId)`।
4. **ডাটাবেজ প্রাইস ভেরিফিকেশন:** সুপাবেস `custom_products` থেকে রিয়েল-টাইম ডাটা ফেচ।
5. **কুপন ভ্যালিডেশন RPC:** `validate_and_apply_coupon(code, subtotal, phone, userId)`।
6. **৩-টায়ার পেমেন্ট ও ২০k গার্ড:** `calculateAdvancePayment(total)` হিসাব। ২০,০০০ টাকার বেশি হলে রিজেক্ট।
7. **অটোমিক স্টক ডিক্রিমেন্ট RPC:** `decrement_product_stock(items)` — স্টক কম থাকলে রোলব্যাক।
8. **ডাটাবেজ ইনসার্ট:** `serviceClient` দিয়ে `orders` টেবিলে অর্ডার রেকর্ড।
9. **Next.js 16 `after()` ব্যাকগ্রাউন্ড টাস্ক:**
   - `increment_coupon_usage(code)`
   - `sendTelegramOrderNotification(order)`

---

## 🌐 ৩. রুট হ্যান্ডলার্স (Next.js Route Handlers)

### ১. `POST /api/lead`
- **ফাইলের অবস্থান:** `app/api/lead/route.ts`
- **দায়িত্ব:** অসম্পূর্ণ চেকআউট ড্রাফট লিড এবং আউট-অব-স্টক নোটিফিকেশন রিকোয়েস্ট গুগল শিটে পুশ করা।
- **সুরক্ষা:**
  - **স্প্রেডশিট ফর্মুলা ইনজেকশন ফিল্টার (`sanitizeSpreadsheetValue`):** `=`, `+`, `-`, `@` দিয়ে শুরু হওয়া ইনপুট থেকে প্রিফিক্স মুছে ফেলা হয়।
  - **এজ আইপি রেট লিমিটার:** প্রতি আইপিতে ১০ মিনিটে সর্বোচ্চ ২০টি রিকোয়েস্ট।
  - **Next.js 16 `after()`:** গুগল শিটে রিকোয়েস্ট ব্যাকগ্রাউন্ডে পাঠিয়ে ক্লায়েন্টকে তাৎক্ষণিক ০.০১ সেকেন্ডে `{ ok: true }` রিটার্ন করে।

#### অ্যাকশন ১: ড্রাফট লিড ক্যাপচার (`action: 'addLead'`)
```json
// Request Payload:
{
  "action": "addLead",
  "leadId": "LD-1725438920123",
  "name": "Rahim Ahmed",
  "phone": "01812345678",
  "dist": "Dhaka",
  "addr": "Road 12, Dhanmondi",
  "email": "rahim@gmail.com",
  "items": "RGB Desk Lamp x1, TWS Pro x2",
  "total": 3450
}
```

#### অ্যাকশন ২: স্টক নোটিফিকেশন রিকোয়েস্ট (`action: 'addStockRequest'`)
```json
// Request Payload:
{
  "action": "addStockRequest",
  "productName": "Crystal Ball Lamp",
  "customerName": "Karim Hossain",
  "mobileNumber": "01712345678",
  "productId": "15"
}
```

---

### ২. `POST /api/verify-turnstile`
- **ফাইলের অবস্থান:** `app/api/verify-turnstile/route.ts`
- **দায়িত্ব:** ক্লাউডফ্লেয়ার টার্নস্টাইল স্মার্ট ক্যাপচা টোকেন সার্ভার-সাইডে ভেরিফাই করা।
- **সুরক্ষা:** ১০ সেকেন্ডের উইন্ডোতে সর্বোচ্চ ১০টি ভেরিফিকেশন প্রতি আইপি। টোকেন সাইজ সর্বোচ্চ ২০৪৮ ক্যারেক্টার লক।
- **এক্সটার্নাল কল:** POST `https://challenges.cloudflare.com/turnstile/v0/siteverify` (`TURNSTILE_SECRET_KEY` সহ)।

```json
// Request:
{
  "token": "0.xxxxxx.yyyyyy..."
}

// Response (Success):
{
  "success": true
}

// Response (Failed / Rate-limited):
{
  "success": false,
  "error": "rate_limited" // or "invalid_token"
}
```

---

## 📡 ৪. এক্সটার্নাল সার্ভিস ইন্টিগ্রেশন (External Services)

### ১. টেলিগ্রাম অর্ডার নোটিফিকেশন (`lib/telegram.ts`)
- **ফাংশন:** `sendTelegramOrderNotification(order)`
- **মেথড:** POST `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
- **পেলোড:** HTML ফরম্যাটেড রিয়েল-টাইম অর্ডার ডিটেইলস (অর্ডার নম্বর, কাস্টমার নাম, ফোন, জেলা, ঠিকানা, পণ্যের তালিকা, শিপিং, সর্বমোট বিল, বিকাশ ট্রানজেকশন তথ্য, ৩-টায়ার অগ্রিম প্রদেয় ও কুরিয়ারের জন্য বাকি COD বিল)।
- **টাইমআউট:** `AbortSignal.timeout(5000)`।

### ২. ক্লাউডিনারি ক্লায়েন্ট আপলোড (`lib/cloudinaryUpload.ts`)
- **ফাংশন:** `uploadReviewImageToCloudinary(file)`
- **মেথড:** POST `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
- **প্রাক-প্রসেসিং:** ক্লায়েন্ট ডিভাইসেই HTML5 Canvas ব্যবহার করে ইমেজ সাইজ সর্বোচ্চ ১০০০px ও WebP ফরম্যাটে ৮০% কম্প্রেশন।
- **ফোল্ডার:** `vangcur/reviews`।

### ৩. ওপেন-মেটিও লাইভ ওয়েদার API (`lib/accountData.ts`)
- **ফাংশন:** `getWeatherCode(lat, lon)`
- **মেথড:** GET `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
- **ক্যাশিং:** ২ ঘণ্টার লোকাল স্টোরেজ ক্যাশ (`vc_weather_cache`)।
- **উদ্দেশ্য:** কাস্টমারের জেলা অনুযায়ী বৃষ্টি হচ্ছে কি না তা শনাক্ত করে প্রোফাইলে লাইভ বৃষ্টির অ্যানিমেশন প্রদর্শন।
