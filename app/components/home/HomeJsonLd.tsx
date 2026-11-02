import { DEFAULT_FAQS } from '@/lib/faqData';
import { DEFAULT_FOOTER } from '@/lib/footerData';
import { SUPPORT_PHONE_INTL } from '@/lib/siteContact';

const SITE_URL = 'https://vangcur.com';

function stripInlineMarkdown(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
}

export default function HomeJsonLd() {
  const { social, contact } = DEFAULT_FOOTER;

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Vangcur',
        alternateName: 'ভাঙচুর',
        url: SITE_URL,
        logo: `${SITE_URL}/vangcur-logo.png`,
        description:
          'Vangcur (ভাঙচুর) is a Bangladeshi e-commerce brand selling gadgets, RGB and neon lights, crystal items and accessories with home delivery across all 64 districts.',
        sameAs: [social.fb, social.ig, social.tk, social.yt],
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
