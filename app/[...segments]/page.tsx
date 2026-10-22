// ফাইলের পাথ: app/[...segments]/page.tsx
// [NEW — আগে app/guides/[slug]/page.tsx, তারপর app/guides/[[...segments]]/page.tsx
// ছিল] সব প্রোগ্রামেটিক SEO গাইড পেজ এই একটামাত্র root-level required catch-all
// রুট দিয়েই চলে — কোনো ভাগাভাগি "/guides" ছাতা নেই, প্রতিটা টেমপ্লেট তার নিজের
// url_prefix অনুযায়ী সরাসরি রুটে নিজস্ব namespace পায় (পিলার '' → /[slug],
// কম্প্যারিজন 'compare' → /compare/[slug], ইনস্টলেশন 'install' → /install/[slug],
// ইত্যাদি) — নতুন টেমপ্লেট/prefix যোগ করতে এই ফাইলে হাত দেওয়ার দরকার নেই, কারণ
// segments array-এর শেষ অংশটাই সবসময় slug, বাকিটা prefix — DB থেকে ম্যাচ করে
// যাচাই হয় (fetchGuidePageBySlug-এর expectedPrefixSegments প্যারামিটার দেখুন)।
//
// ⚠️ Required catch-all ([...segments], "[[ ]]" optional-catch-all না) ইচ্ছাকৃত —
// root-এ app/page.tsx (হোমপেজ) আগে থেকেই "/" পাথ handle করে; optional catch-all
// ব্যবহার করলে সেটাও "/" ম্যাচ করার চেষ্টা করত এবং route conflict হতো। Required
// catch-all শুধু ১+ সেগমেন্ট থাকা পাথেই match করে, তাই "/"-এর সাথে সংঘর্ষ হয় না।
// Next.js সবসময় বেশি specific static রুট (category, product, checkout, ইত্যাদি)
// আগে ম্যাচ করায়, তাই এই catch-all শুধু বাকি (অন্য কোনো রুটে না পড়া) পাথগুলোই
// পায় — কিন্তু এর মানে নতুন কোনো টেমপ্লেটের url_prefix ভুলে কোনো existing static
// রুটের নাম (account, checkout, ইত্যাদি) হয়ে গেলে সংঘর্ষ হতে পারে, তাই
// RESERVED_URL_PREFIXES (types/guides.ts) সবসময় হালনাগাদ রাখা জরুরি।

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getServerLang } from '@/lib/i18n/getServerLang';
import {
  fetchGuidePageBySlug,
  resolveProductSnapshots,
  resolveRelatedLinkHrefs,
  collectFaqEntries,
  collectHowToSteps,
} from '@/lib/guidePageData';
import { guidePageUrlPath } from '@/types/guides';
import GuidePageClient from './GuidePageClient';

const SITE_URL = 'https://vangcur.com';

// ২ ঘণ্টা পর পর ব্যাকগ্রাউন্ডে ফ্রেশ ডাটা ক্যাশ আপডেট হবে (Edge ISR) — এছাড়া
// Mehediadmin সেভ/পাবলিশ করলে on-demand revalidation-ও হয় (app/api/revalidate-guide দেখুন)
export const revalidate = 7200;

// ⚡ খালি generateStaticParams: বিল্ডের সময় কিছু প্রি-রেন্ডার হয় না, কিন্তু প্রথম ভিজিটে পেজ
// বানিয়ে CDN-এ ক্যাশ হয় এবং `revalidate` অনুযায়ী ব্যাকগ্রাউন্ডে নবায়ন হয় (on-demand ISR)।
export async function generateStaticParams() {
  return [];
}


function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

function splitSegments(segments: string[]): { slug: string; prefixSegments: string[] } {
  const slug = segments[segments.length - 1];
  const prefixSegments = segments.slice(0, -1);
  return { slug, prefixSegments };
}

const getPage = cache(async (slug: string, prefixSegments: string[]) => {
  const supabase = getSupabase();
  return fetchGuidePageBySlug(supabase, slug, prefixSegments);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}): Promise<Metadata> {
  const { segments } = await params;
  const split = splitSegments(segments);

  const [result, lang] = await Promise.all([getPage(split.slug, split.prefixSegments), getServerLang()]);
  if (!result) return { title: 'Vangcur' };

  const { page, template } = result;
  const title = lang === 'en' ? page.meta_title_en : page.meta_title_bn;
  const description = lang === 'en' ? page.meta_description_en : page.meta_description_bn;
  const url = `${SITE_URL}${guidePageUrlPath(page.slug, template.url_prefix)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Vangcur',
      locale: lang === 'en' ? 'en_US' : 'bn_BD',
      type: 'article',
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params;
  const split = splitSegments(segments);

  const [result, lang] = await Promise.all([getPage(split.slug, split.prefixSegments), getServerLang()]);
  if (!result) notFound();
  const { page, template } = result;

  const supabase = getSupabase();
  const [productSnapshots, relatedLinkHrefs] = await Promise.all([
    resolveProductSnapshots(supabase, page),
    resolveRelatedLinkHrefs(supabase, page),
  ]);

  const url = `${SITE_URL}${guidePageUrlPath(page.slug, template.url_prefix)}`;
  const h1 = lang === 'en' ? page.h1_en : page.h1_bn;
  const templateName = { bn: template.name_bn, en: template.name_en };

  const faqEntries = collectFaqEntries(page, lang);
  const howToSteps = collectHowToSteps(page, lang);

  // ⚠️ আগে এখানে "Home → টেমপ্লেটের নাম → H1" — ৩ লেভেলের BreadcrumbList ছিল,
  // "/guides" একটা শেয়ার্ড হাব পেজ ছিল বলে মাঝের লেভেলটার নিজস্ব বাস্তব URL ছিল।
  // এখন প্রতিটা টেমপ্লেট নিজের namespace-এ, কোনো কমন হাব পেজ নেই — তাই schema.org
  // BreadcrumbList-এ শুধু বাস্তব URL থাকা আইটেমই রাখা হচ্ছে (Home → H1), মাঝের
  // টেমপ্লেট-নাম UI ব্রেডক্রাম্বে (GuidePageClient.tsx) প্লেইন টেক্সট হিসেবে
  // থেকে যাচ্ছে, structured data-তে না।
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: lang === 'en' ? 'Home' : 'হোম', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: h1, item: url },
      ],
    },
    {
      '@type': 'WebPage',
      name: h1,
      url,
      inLanguage: lang === 'en' ? 'en' : 'bn',
    },
  ];

  if (faqEntries.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqEntries.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  if (howToSteps && howToSteps.length > 0) {
    graph.push({
      '@type': 'HowTo',
      name: h1,
      step: howToSteps.map((s) => ({ '@type': 'HowToStep', name: s.name, text: s.text })),
    });
  }

  const jsonLd = { '@context': 'https://schema.org', '@graph': graph };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GuidePageClient
        page={page}
        templateName={templateName}
        productSnapshots={productSnapshots}
        relatedLinkHrefs={relatedLinkHrefs}
      />
    </>
  );
    }
