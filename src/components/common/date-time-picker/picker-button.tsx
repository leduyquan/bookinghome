import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useEffect, useRef } from 'react'
import type { DayButtonProps } from 'react-day-picker'

import { cn } from '@/lib/utils'

export function PickerNavButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md text-primary hover:bg-primary-50 disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}

export function PickerChevron({
  orientation,
  className,
}: {
  orientation?: 'left' | 'right' | 'up' | 'down'
  className?: string
  size?: number
  disabled?: boolean
}) {
  if (orientation === 'down') return <ChevronDown className={cn('size-3.5', className)} aria-hidden />
  const Icon = orientation === 'right' ? ChevronRight : ChevronLeft
  return <Icon className={cn('size-4', className)} aria-hidden />
}

export function PickerDayButton({ className, day: _day, modifiers, ...props }: DayButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return <button ref={ref} type="button" className={cn('rdp-day_button', className)} {...props} />
}
