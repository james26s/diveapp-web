import { Suspense } from 'react'
import { SignInForm } from '@/components/auth/sign-in-form'
import { Waves } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Sign In' }

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-primary lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="space-y-4 px-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Waves className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground">
            Dive into your footage
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            AI-powered species detection, automatic highlight reels, and dive logs that write themselves.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Waves className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">DiveApp</span>
        </Link>
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  )
}
