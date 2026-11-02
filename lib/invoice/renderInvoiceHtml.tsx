import 'server-only';
import type { Order } from '@/types';
import { InvoiceCardBody, INVOICE_FIXED_WIDTH, type InvoiceContact } from './InvoiceCardBody';
import { buildInvoiceViewModel } from './invoiceViewModel';

export const INVOICE_CARD_ELEMENT_ID = 'vc-invoice-capture-card';

/**
 * সম্পূর্ণ, স্বনির্ভর একটা HTML ডকুমেন্ট বানায় — যেটা Puppeteer/headless
 * Chrome-এ লোড করে ঠিক ওই ব্রাউজার-ইঞ্জিন দিয়েই screenshot নেওয়া হয় যেটা
 * গ্রাহক নিজের ফোনে ব্যবহার করেন। এর ফলে html2canvas-এর নিজস্ব (আসল
 * ব্রাউজার থেকে ভিন্ন) CSS/font/text-shaping ইঞ্জিনের কোনো limitation আর
 * প্রভাব ফেলে না — যা দেখা যায়, ঠিক তাই ডাউনলোড হয়।
 */
export async function renderInvoiceHtmlDocument(params: {
  order: Order;
  contact: InvoiceContact;
  assetBaseUrl: string;
}): Promise<string> {
  const { order, contact, assetBaseUrl } = params;
  const { ds, advancePaid, balanceDue, isFreeShipping, dueMsg } = buildInvoiceViewModel(order);

  // ডাইনামিক ইম্পোর্ট ইচ্ছাকৃত: 'react-dom/server' স্ট্যাটিকভাবে ইম্পোর্ট করলে
  // Next.js-এর বিল্ড-টাইম RSC চেকার এটাকে ব্লক করে (এমনকি Route Handler-এর
  // ভেতর থেকে ব্যবহার করলেও) — dynamic import() দিয়ে সেই স্ট্যাটিক-অ্যানালাইসিস
  // এড়ানো যায়। দেখুন: https://github.com/vercel/next.js/discussions/69244
  const { renderToStaticMarkup } = await import('react-dom/server');

  const cardMarkup = renderToStaticMarkup(
    <InvoiceCardBody
      order={order}
      ds={ds}
      contact={contact}
      dueMsg={dueMsg}
      advancePaid={advancePaid}
      balanceDue={balanceDue}
      isFreeShipping={isFreeShipping}
      assetBaseUrl={assetBaseUrl}
    />
  );

  // Hind Siliguri (বাংলা) + DM Sans (ল্যাটিন) — সরাসরি Google Fonts থেকে,
  // যাতে headless Chrome-এর নিজস্ব render pipeline দিয়ে চরিত্র-শেপিং সহ
  // পুরোপুরি সঠিকভাবে বাংলা যুক্তাক্ষর/মাত্রা আঁকা হয়।
  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    background: #FFFFFF;
    width: ${INVOICE_FIXED_WIDTH}px;
  }
  body {
    font-family: 'DM Sans', 'Hind Siliguri', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  #${INVOICE_CARD_ELEMENT_ID} {
    width: ${INVOICE_FIXED_WIDTH}px;
    background-color: #FFFFFF;
    color: #1E293B;
    border-radius: 20px;
    border: 1px solid #E2E8F0;
    overflow: hidden;
  }
</style>
</head>
<body>
  <div id="${INVOICE_CARD_ELEMENT_ID}">${cardMarkup}</div>
</body>
</html>`;
}
