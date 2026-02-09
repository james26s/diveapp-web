import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { Waves } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Forgot Password' }

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Waves className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold">DiveApp</span>
      </Link>
      <ForgotPasswordForm />
    </div>
  )
}
