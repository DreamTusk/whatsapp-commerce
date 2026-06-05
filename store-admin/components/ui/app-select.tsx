'use client'

import { cn } from '@/lib/utils'
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select'

export interface SelectOption {
  value: string
  label: string
}

interface AppSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

/**
 * Shadcn Select wrapper that always shows the correct label.
 * Base UI's SelectValue only registers item text after first open,
 * so pre-populated edit forms show raw IDs. This derives the label
 * directly from the options array instead.
 */
export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  className,
}: AppSelectProps) {
  const displayLabel = value ? options.find(o => o.value === value)?.label : undefined

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn('w-full h-11 text-base', className)}>
        <span className={cn('flex-1 text-left truncate', !displayLabel && 'text-muted-foreground')}>
          {displayLabel ?? placeholder}
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
