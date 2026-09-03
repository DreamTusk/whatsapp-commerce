'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value: string          // ISO string or ''
  onChange: (value: string) => void
  placeholder?: string
}

export function DateTimePicker({ value, onChange, placeholder = 'Pick date & time' }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)

  const date = value ? new Date(value) : undefined
  const timeStr = date
    ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : '00:00'

  function handleDaySelect(selected: Date | undefined) {
    if (!selected) { onChange(''); return }
    const [h, m] = timeStr.split(':').map(Number)
    selected.setHours(h, m, 0, 0)
    onChange(selected.toISOString())
    setOpen(false)
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const [h, m] = e.target.value.split(':').map(Number)
    const base = date ?? new Date()
    base.setHours(h, m, 0, 0)
    onChange(base.toISOString())
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex h-11 w-full items-center rounded-lg border border-input bg-background px-3 text-base font-normal shadow-sm transition-colors hover:bg-accent text-left',
          !date && 'text-muted-foreground',
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0 text-gray-400" />
        {date ? format(date, 'dd MMM yyyy, HH:mm') : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDaySelect}
          autoFocus
        />
        <div className="px-4 pb-4 pt-2 border-t">
          <p className="text-xs text-gray-500 mb-2">Time</p>
          <Input
            type="time"
            className="h-9 text-sm"
            value={timeStr}
            onChange={handleTimeChange}
          />
          {date && (
            <div
              role="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="w-full mt-2 text-center text-xs text-gray-400 hover:text-red-500 py-1 rounded hover:bg-red-50 transition-colors"
            >
              Clear
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
