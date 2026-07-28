import { NavHeader } from '@/components/nav-header'
import { SiteFooter } from '@/components/site-footer'
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1 flex items-center justify-center py-12">
        <LoginForm />
      </main>
      <SiteFooter />
    </div>
  )
}
