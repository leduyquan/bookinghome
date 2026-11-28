import { CalendarRange, Lock, PanelLeftClose, PanelLeftOpen, ReceiptText, Table2, Wallet } from 'lucide-react'
import { useState } from 'react'

import { SECTIONS } from '@/constants'
import { SIDEBAR_KEY } from '@/lib/session'
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
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1')

  function toggle() {
    setCollapsed((current) => {
      const next = !current
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      return next
    })
  }

  function sectionButtons(bar: boolean) {
    return SECTIONS.map((item) => {
      const Icon = icons[item.id]
      const selected = section === item.id
      return (
        <button
          key={item.id}
          type="button"
          aria-current={selected ? 'page' : undefined}
          aria-label={item.label}
          title={item.label}
          className={`flex items-center rounded-md font-semibold ${
            bar
              ? 'flex-1 flex-col gap-1 px-1 py-2 text-[11px]'
              : `py-2.5 text-sm ${collapsed ? 'justify-center px-2' : 'gap-3 px-3 text-left'}`
          } ${selected ? 'bg-primary-50 text-primary' : 'text-neutral-800 hover:bg-white'}`}
          onClick={() => onSelect(item.id)}
        >
          <Icon className="size-4 shrink-0" />
          {bar || !collapsed ? item.label : null}
        </button>
      )
    })
  }

  return (
    <>
      <aside className={`hidden shrink-0 flex-col border-r border-neutral-100 bg-neutral-50 text-black lg:flex ${collapsed ? 'w-16' : 'w-52'}`}>
        <div className={`flex border-b border-neutral-100 ${collapsed ? 'justify-center px-2 py-3' : 'items-start justify-between gap-2 px-4 py-4'}`}>
          {collapsed ? null : (
            <div>
              <p className="text-xs tracking-wide text-primary uppercase">Sổ nhà</p>
              <h1 className="text-sm font-semibold text-neutral-800">4B Mạc Thiên Tích</h1>
            </div>
          )}
          <button
            type="button"
            aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            className="rounded-md p-2 text-neutral-800 hover:bg-white"
            onClick={toggle}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
        <nav className={`flex flex-1 flex-col gap-1 ${collapsed ? 'p-2' : 'p-3'}`}>{sectionButtons(false)}</nav>
        <button
          type="button"
          aria-label={collapsed ? 'Khóa' : undefined}
          title={collapsed ? 'Khóa' : undefined}
          className={`m-2 flex items-center rounded-md py-2 text-sm text-neutral-800 hover:bg-white ${collapsed ? 'justify-center px-2' : 'mx-3 gap-2 px-3'}`}
          onClick={onLock}
        >
          <Lock className="size-4 shrink-0" />
          {collapsed ? null : 'Khóa'}
        </button>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {sectionButtons(true)}
        <button
          type="button"
          aria-label="Khóa"
          className="flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-semibold text-neutral-800"
          onClick={onLock}
        >
          <Lock className="size-4" />
          Khóa
        </button>
      </nav>
    </>
  )
}
