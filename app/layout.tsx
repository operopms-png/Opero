import type { Metadata } from 'next'
import Sidebar from '@/components/Sidebar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Opero — Vacation Rental Operations',
  description: 'Operations platform for vacation rental managers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#F7F8FA', display: 'flex' }}>
        <Sidebar />
        <main style={{ marginLeft: 260, flex: 1, minHeight: '100vh' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
