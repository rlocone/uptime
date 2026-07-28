import { JetBrains_Mono, Share_Tech_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'

export const dynamic = 'force-dynamic'

const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400','500','600','700'] })
const shareTech = Share_Tech_Mono({ subsets: ['latin'], variable: '--font-display', weight: '400' })

export const metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Uptime Project — Competitive Uptime Tracking',
  description: 'Track your server uptime and compete on global leaderboards. Join the competitive uptime tracking community.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  openGraph: { images: ['/og-image.png'] },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head />
      <body className={`${jetbrains.variable} ${shareTech.variable} font-mono antialiased`}>
        <Providers>
          {children}
          <Toaster />
          <ChunkLoadErrorHandler />
        </Providers>
      </body>
    </html>
  )
}
