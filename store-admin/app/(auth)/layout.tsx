import type { ReactNode } from 'react'
import { AuthGuard } from '@/components/auth-guard'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <AuthGuard />
      {/* Brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#6366f1] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] bg-white/10 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
              <span className="text-[#6366f1] font-bold text-sm">DT</span>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">DT Commerce</span>
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
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/90 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/50 text-sm">
          © {new Date().getFullYear()} DT Commerce. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
