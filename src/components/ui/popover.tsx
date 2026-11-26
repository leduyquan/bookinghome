import { Popover } from 'radix-ui'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export const PopoverRoot = Popover.Root
export const PopoverTrigger = Popover.Trigger

export function PopoverContent({ className, align = 'start', sideOffset = 6, ...props }: ComponentProps<typeof Popover.Content>) {
  return (
    <Popover.Portal>
      <Popover.Content
        data-calendar-popover=""
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          'z-[80] w-auto max-w-[min(40rem,calc(100vw-1.5rem))] overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xl outline-none',
          className,
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
        {...props}
      />
    </Popover.Portal>
  )
}
