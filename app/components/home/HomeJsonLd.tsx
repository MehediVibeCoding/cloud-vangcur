import { DEFAULT_FAQS } from '@/lib/faqData';
import { DEFAULT_FOOTER } from '@/lib/footerData';
import { SUPPORT_PHONE_INTL } from '@/lib/siteContact';

const SITE_URL = 'https://vangcur.com';

// অফিশিয়াল সোশ্যাল/প্রোফাইল তালিকা — public/llms.txt, Linktree ও সব সোশ্যাল বায়োর সাথে হুবহু এক রাখুন।
const EXTRA_SAME_AS = [
  'https://www.threads.com/@vangcurgadgets',
  'https://x.com/vangcurgadgets',
  'https://www.pinterest.com/Vangcur.com/',
  'https://www.reddit.com/user/vangcurgadgets/',
  'https://linktr.ee/vangcur.com',
  'https://g.page/r/CWBIx6Qm9RYREAE',
];

function stripInlineMarkdown(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
}

export default function HomeJsonLd() {
  const { social, contact } = DEFAULT_FOOTER;

  const sameAs = Array.from(new Set([social.fb, social.ig, social.tk, social.yt, ...EXTRA_SAME_AS].filter(Boolean)));

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'OnlineStore'],
        '@id': `${SITE_URL}/#organization`,
        name: 'Vangcur - ভাঙচুর',
        alternateName: ['Vangcur', 'Vangchur', 'Vangcur Gadgets', 'Vangchur Gadgets', 'ভাঙচুর', 'ভাঙচুর গ্যাজেটস'],
        url: SITE_URL,
        logo: `${SITE_URL}/vangcur-logo.png`,
        foundingDate: '2023',
        description:
          'Vangcur (ভাঙচুর, also written Vangchur) is a Bangladeshi e-commerce brand founded in 2023, selling gadgets, RGB and neon lights, crystal items and accessories with home delivery across all 64 districts. Trusted by 3,000+ happy customers.',
        founder: {
          '@type': 'Person',
          name: 'Mehedi Wilq',
          sameAs: ['https://www.facebook.com/share/1KaujBArJg/'],
        },
        sameAs,
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            telephone: SUPPORT_PHONE_INTL,
            email: contact.email,
            areaServed: 'BD',
            availableLanguage: ['bn', 'en'],
          },
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Vangcur',
        inLanguage: 'bn-BD',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        inLanguage: 'bn-BD',
        mainEntity: DEFAULT_FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: stripInlineMarkdown(f.a),
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, '\\u003c'),
      }}
    />
  );
}
