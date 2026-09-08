import type { ReactNode } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { Check } from '@deemlol/next-icons'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <AuthGuard />
      {/* Brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#7c3aed] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] bg-white/10 rounded-full" />

        <div className="relative z-10">
          <div className="inline-flex items-center bg-white rounded-2xl shadow-md px-5 py-3">
            <img src="/app-assets/logo-with-name.png" alt="Dreambiz" className="h-12 w-auto object-contain" />
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Your store.<br />Your customers.<br />One platform.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Manage your catalogue, orders, and customers — all from one place.
          </p>

          <div className="space-y-4 pt-2">
            {[
              'Automated order taking via messaging',
              'Real-time order tracking for customers',
              'Multi-tenant store management',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <span className="text-white/90 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/50 text-sm">
          © {new Date().getFullYear()} Dreambiz. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
