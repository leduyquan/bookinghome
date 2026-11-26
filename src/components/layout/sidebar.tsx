import { CalendarRange, Lock, ReceiptText, Table2, Wallet } from 'lucide-react'

import { SECTIONS } from '@/constants'
import type { SectionId } from '@/types'

const icons = {
  booking: CalendarRange,
  details: Table2,
  expenses: ReceiptText,
  revenue: Wallet,
} as const

export function Sidebar({
  section,
  onSelect,
  onLock,
}: {
  section: SectionId
  onSelect: (section: SectionId) => void
  onLock: () => void
}) {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-neutral-100 bg-neutral-50 text-black">
      <div className="border-b border-neutral-100 px-4 py-4">
        <p className="text-xs tracking-wide text-primary uppercase">Sổ nhà</p>
        <h1 className="text-lg font-semibold text-neutral-800">Booking Home</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {SECTIONS.map((item) => {
          const Icon = icons[item.id]
          const selected = section === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold ${selected ? 'bg-primary-50 text-primary' : 'text-neutral-800 hover:bg-white'}`}
              onClick={() => onSelect(item.id)}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <button type="button" className="m-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-800 hover:bg-white" onClick={onLock}>
        <Lock className="size-4" />
        Khóa
      </button>
    </aside>
  )
}
