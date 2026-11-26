import { Button } from '@/components/ui/button'
import { DialogShell } from '@/components/ui/dialog-shell'

type ConfirmModalProps = {
  open: boolean
  title: string
  description: string
  confirmText?: string
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmText = 'Xóa',
  pending,
  onOpenChange,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <DialogShell
      open={open}
      title={title}
      description={description}
      className="max-w-md"
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" disabled={pending} onClick={() => onOpenChange(false)}>
          Hủy
        </Button>
        <Button variant="destructive" className="flex-1" disabled={pending} onClick={onConfirm}>
          {pending ? 'Đang xóa...' : confirmText}
        </Button>
      </div>
    </DialogShell>
  )
}
