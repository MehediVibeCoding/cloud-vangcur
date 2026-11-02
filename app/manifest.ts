import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vangcur Gadgets',
    short_name: 'Vangcur',
    description: 'Vangcur Gadgets — অনলাইন গ্যাজেট শপ',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#44A7FC',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
