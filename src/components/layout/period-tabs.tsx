import { useEffect, useRef, useState } from 'react'

import type { Period } from '@/domain/period'

function Triangle({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 12 12" className="size-3 fill-current" aria-hidden="true">
      {direction === 'left' ? <polygon points="9,1 3,6 9,11" /> : <polygon points="3,1 9,6 3,11" />}
    </svg>
  )
}

export function PeriodTabs({
  periods,
  active,
  onSelect,
}: {
  periods: Period[]
  active: string | null
  onSelect: (sheetName: string) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const [edges, setEdges] = useState({ left: true, right: true })

  function updateEdges() {
    const element = scroller.current
    if (!element) return
    setEdges({
      left: element.scrollLeft <= 2,
      right: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
    })
  }

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
    updateEdges()
  }, [active, periods])

  return (
    <div className="flex items-stretch border-b border-neutral-100 bg-white">
      <button
        type="button"
        aria-label="Kỳ trước"
        disabled={edges.left}
        className="flex w-11 items-center justify-center text-primary disabled:text-neutral-400"
        onClick={() => scroller.current?.scrollBy({ left: -260, behavior: 'smooth' })}
      >
        <Triangle direction="left" />
      </button>
      <div ref={scroller} className="period-scroll flex min-w-0 flex-1 overflow-x-auto" onScroll={updateEdges}>
        {periods.map((period) => {
          const selected = period.sheetName === active
          return (
            <button
              key={period.sheetName}
              ref={selected ? activeRef : undefined}
              type="button"
              aria-pressed={selected}
              className={`shrink-0 border-r border-neutral-100 px-5 py-3 text-sm font-semibold whitespace-nowrap ${selected ? 'bg-primary text-white' : 'bg-white text-neutral-800 hover:bg-primary-50'}`}
              onClick={() => onSelect(period.sheetName)}
            >
              {period.label}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        aria-label="Kỳ sau"
        disabled={edges.right}
        className="flex w-11 items-center justify-center text-primary disabled:text-neutral-400"
        onClick={() => scroller.current?.scrollBy({ left: 260, behavior: 'smooth' })}
      >
        <Triangle direction="right" />
      </button>
    </div>
  )
}
