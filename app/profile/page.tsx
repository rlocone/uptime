import { NavHeader } from '@/components/nav-header'
import { SiteFooter } from '@/components/site-footer'
import { ProfileContent } from '@/components/profile-content'

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <ProfileContent />
      </main>
      <SiteFooter />
    </div>
  )
}
