export function Loading({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 text-sm text-neutral-700">
      <span className="size-4 animate-spin rounded-full border-2 border-neutral-300 border-t-primary" />
      {label}
    </div>
  )
}
