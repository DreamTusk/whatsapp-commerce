import { cn } from '@/lib/utils'

export function AuthBrandMark({ centered = false, className }: { centered?: boolean; className?: string }) {
  return (
    <div className={cn('flex mb-6 lg:hidden', centered && 'justify-center', className)}>
      <img src="/app-assets/logo-with-name.png" alt="Dreambiz" className="h-8 w-auto object-contain" />
    </div>
  )
}
