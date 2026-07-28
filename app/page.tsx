import { NavHeader } from '@/components/nav-header'
import { SiteFooter } from '@/components/site-footer'
import { HomeContent } from '@/components/home-content'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <HomeContent />
      </main>
      <SiteFooter />
    </div>
  )
}
