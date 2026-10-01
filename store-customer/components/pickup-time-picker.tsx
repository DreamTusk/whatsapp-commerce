'use client'

import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { Calendar, ChevronLeft, ChevronRight } from '@deemlol/next-icons'

interface PickupTimePickerProps {
  value: string
  onChange: (value: string) => void
  minDate: Date
  className?: string
}

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function combine(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const combined = new Date(date)
  combined.setHours(h ?? 0, m ?? 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${combined.getFullYear()}-${pad(combined.getMonth() + 1)}-${pad(combined.getDate())}T${pad(combined.getHours())}:${pad(combined.getMinutes())}`
}

export default function PickupTimePicker({ value, onChange, minDate, className }: PickupTimePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedDate = value ? new Date(value) : undefined
  const selectedTime = value ? value.slice(11, 16) : ''

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleSelectDate(date: Date | undefined) {
    if (!date) return
    onChange(combine(date, selectedTime || '09:00'))
  }

  function handleSelectTime(time: string) {
    onChange(combine(selectedDate ?? minDate, time))
  }

  const display = selectedDate
    ? `${selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}${selectedTime ? `, ${selectedTime}` : ''}`
    : ''

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 text-left ${className}`}
      >
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className={display ? 'text-gray-900' : 'text-gray-300'}>
          {display || 'Select date & time'}
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 bg-white border border-gray-100 rounded-2xl shadow-lg p-4 space-y-3 w-[300px]">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelectDate}
            disabled={{ before: toDateOnly(minDate) }}
            classNames={{
              months: 'flex flex-col gap-2',
              month: 'flex flex-col gap-2',
              month_caption: 'flex items-center justify-center h-9 font-semibold text-sm text-gray-900',
              nav: 'flex items-center justify-between absolute inset-x-0 top-0 px-1',
              button_previous: 'p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30',
              button_next: 'p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex',
              weekday: 'flex-1 text-center text-[11px] font-medium text-gray-400 pb-1',
              week: 'flex w-full',
              day: 'flex-1 aspect-square p-0.5',
              day_button: 'w-full h-full flex items-center justify-center rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors',
              selected: '[&>button]:bg-primary [&>button]:text-white [&>button]:hover:opacity-90',
              today: 'font-bold c-primary',
              outside: 'text-gray-300',
              disabled: 'text-gray-200 cursor-not-allowed hover:bg-transparent',
              root: 'text-gray-900',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />,
            }}
          />

          <div className="border-t border-gray-100 pt-3">
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Time</label>
            <input
              type="time"
              value={selectedTime}
              onChange={e => handleSelectTime(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--color-primary)] transition-colors bg-white"
            />
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full h-9 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
