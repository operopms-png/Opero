'use client'
import type { Metadata } from 'next'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import './globals.css'

const PUBLIC_ROUTES = ['/login', '/staff-login', '/reset-password']

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))

  return (
    <html lang="en">
      <head>
        <title>Opero — Vacation Rental Operations</title>
        <meta name="description" content="Operations platform for vacation rental managers" />
      </head>
      <body style={{ margin: 0, background: '#F7F8FA', display: 'flex' }}>
        {isPublicRoute ? (
          <main style={{ flex: 1, minHeight: '100vh' }}>
            {children}
          </main>
        ) : (
          <>
            <Sidebar />
            <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
              {children}
            </main>
          </>
        )}
      </body>
    </html>
  )
}
