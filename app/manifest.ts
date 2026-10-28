import type { MetadataRoute } from 'next'

// Home-screen app details (name + NOVOURQ icons) for phones and tablets.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The NOVOURQ Portal',
    short_name: 'NOVOURQ',
    description: 'The NOVOURQ staff, owner, landlord and tenant portal.',
    start_url: '/login',
    display: 'standalone',
    background_color: '#FBF4E6',
    theme_color: '#89CFF0',
    icons: [
      { src: '/logo-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/logo-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
