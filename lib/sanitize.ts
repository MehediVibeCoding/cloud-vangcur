import DOMPurify from 'dompurify';

export function sanitizeSvgHtml(html?: string | null): string {
  if (!html) return '';

  // সার্ভার-সাইড: শুধু regex-ভিত্তিক best-effort ফিল্টার (jsdom লাগে না, Workers-এ চলে না)।
  // INTENTIONAL: ইনপুট শুধু অ্যাডমিন-লেখা কনটেন্ট (গেস্ট/কাস্টমার এখানে SVG দিতে পারে না);
  // ব্রাউজারে হাইড্রেশনের সময় নিচের DOMPurify পুরো স্যানিটাইজ করে। কাস্টমার-ইনপুটে এটা ব্যবহার করবেন না।
  if (typeof window === 'undefined') {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi, '');
  }

  // ক্লায়েন্ট ব্রাউজারে সম্পূর্ণ DOMPurify দিয়ে স্যানিটাইজেশন
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'polygon', 'line', 'g', 'defs', 'linearGradient', 'radialGradient', 'stop', 'ellipse'],
  });
}

export { sanitizeHref } from './security';
