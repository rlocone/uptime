import { NavHeader } from '@/components/nav-header'
import { SiteFooter } from '@/components/site-footer'
import { RegisterForm } from '@/components/register-form'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1 flex items-center justify-center py-12">
        <RegisterForm />
      </main>
      <SiteFooter />
    </div>
  )
}
