import { Dialog } from 'radix-ui'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DialogShellProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}

function isFloatingLayer(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('[data-calendar-popover], [data-radix-popper-content-wrapper], [data-select-content]'))
  )
}

export function DialogShell({ open, onOpenChange, title, description, children, className }: DialogShellProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-5 shadow-xl',
            className,
          )}
          onFocusOutside={(event) => {
            if (isFloatingLayer(event.target)) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (isFloatingLayer(event.target)) event.preventDefault()
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className="text-lg font-semibold text-neutral-900">{title}</Dialog.Title>
          {description ? <Dialog.Description className="mt-1 text-sm text-neutral-700">{description}</Dialog.Description> : null}
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
