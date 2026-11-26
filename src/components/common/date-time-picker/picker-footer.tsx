import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

export function PickerFooter({
  children,
  onCancel,
  onApply,
  applyDisabled,
}: {
  children: ReactNode
  onCancel: () => void
  onApply: () => void
  applyDisabled?: boolean
}) {
  return (
    <div>
      <div className="px-4 pt-3 pb-2">{children}</div>
      <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-3">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Hủy
        </Button>
        <Button size="sm" onClick={onApply} disabled={applyDisabled}>
          Chọn
        </Button>
      </div>
    </div>
  )
}
