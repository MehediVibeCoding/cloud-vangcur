// কোম্পানির যোগাযোগ নম্বর — এক জায়গায়। নম্বর বদলাতে হলে শুধু এই ফাইল বদলান।
// (lib/risk/data/wordlists.ts ও lib/security.ts-এর নম্বরগুলো ফিল্টার/উদাহরণ ডেটা, কোম্পানির নম্বর নয়; ওগুলো এখানে আসে না।)

/** সাপোর্ট / WhatsApp নম্বর (দেশীয় ফরম্যাট) */
export const SUPPORT_PHONE = '01897804055';
/** দেখানোর ফরম্যাট */
export const SUPPORT_PHONE_LABEL = '01897-804055';
/** tel: লিংক */
export const SUPPORT_PHONE_HREF = `tel:${SUPPORT_PHONE}`;
/** আন্তর্জাতিক ফরম্যাট (JSON-LD ইত্যাদির জন্য) */
export const SUPPORT_PHONE_INTL = `+88${SUPPORT_PHONE}`;
/** WhatsApp লিংক */
export const SUPPORT_WA_LINK = `https://wa.me/88${SUPPORT_PHONE}`;
/** বিকাশ পেমেন্ট নম্বর */
export const BKASH_NUMBER = '01816365504';
