import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Have-it Messenger',
    short_name: 'Have-it',
    description: 'Fast, secure and real-time messaging across all mobile and desktop devices.',
    start_url: '/chat',
    display: 'standalone',
    background_color: '#111b21',
    theme_color: '#03cafc',
    orientation: 'portrait-primary',
    categories: ['social', 'productivity', 'communication'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
}
