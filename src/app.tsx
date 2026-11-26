import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { LockScreen } from '@/components/auth/lock-screen'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import { Loading } from '@/components/common/loading'
import { DetailsView } from '@/components/details/details-view'
import { ExpensesView } from '@/components/expenses/expenses-view'
import { PeriodTabs } from '@/components/layout/period-tabs'
import { Sidebar } from '@/components/layout/sidebar'
import { RevenueView } from '@/components/revenue/revenue-view'
import { todayIso } from '@/domain/dates'
import { pickPeriod } from '@/domain/period'
import { UnauthorizedError, errorMessage } from '@/lib/errors'
import { useLedger } from '@/lib/ledger'
import { PERIOD_KEY, SECTION_KEY, requirePassword } from '@/lib/session'
import { ledgerClient } from '@/lib/sheets-client'
import { isSectionId, type SectionId } from '@/types'

const titles: Record<SectionId, string> = {
  booking: 'OCC',
  details: 'Booking',
  expenses: 'Chi phí',
  revenue: 'Doanh thu',
}

export function App() {
  const { password } = useLedger()
  if (!password) return <LockScreen />
  return <Workspace />
}

function Workspace() {
  const { mode, lock } = useLedger()
  const [section, setSection] = useState<SectionId>(() => {
    const saved = localStorage.getItem(SECTION_KEY)
    return isSectionId(saved) ? saved : 'booking'
  })
  const [activeName, setActiveName] = useState<string | null>(() => localStorage.getItem(PERIOD_KEY))

  const periodsQuery = useQuery({
    queryKey: ['periods'],
    queryFn: () => ledgerClient.listPeriods(requirePassword()),
  })
  const periodQuery = useQuery({
    queryKey: ['period', activeName],
    enabled: Boolean(activeName),
    queryFn: () => ledgerClient.getPeriod(requirePassword(), activeName as string),
  })

  useEffect(() => {
    if (!periodsQuery.data) return
    const next = pickPeriod(periodsQuery.data, localStorage.getItem(PERIOD_KEY), todayIso())
    setActiveName(next)
    if (next) localStorage.setItem(PERIOD_KEY, next)
  }, [periodsQuery.data])

  useEffect(() => {
    if (periodsQuery.error instanceof UnauthorizedError || periodQuery.error instanceof UnauthorizedError) lock()
  }, [periodsQuery.error, periodQuery.error, lock])

  const periods = periodsQuery.data ?? []
  const active = periods.find((period) => period.sheetName === activeName) ?? null

  function selectPeriod(sheetName: string) {
    setActiveName(sheetName)
    localStorage.setItem(PERIOD_KEY, sheetName)
  }

  function selectSection(next: SectionId) {
    setSection(next)
    localStorage.setItem(SECTION_KEY, next)
  }

  return (
    <div className="flex h-screen min-h-0 flex-col">
      {mode === 'mock' ? (
        <p className="bg-secondary-100 px-4 py-2 text-center text-sm text-secondary-900">
          Đang dùng dữ liệu trên máy này. Chưa nối Google Sheet — thay đổi chưa được ghi lên Google.
        </p>
      ) : null}
      <PeriodTabs periods={periods} active={activeName} onSelect={selectPeriod} />
      <div className="flex min-h-0 flex-1">
        <Sidebar section={section} onSelect={selectSection} onLock={lock} />
        <main className="min-w-0 flex-1 overflow-auto p-5">
          <header className="mb-4">
            <h2 className="text-xl font-semibold">{titles[section]}</h2>
            {active ? <p className="text-sm text-neutral-700">Kỳ {active.label}</p> : null}
          </header>
          {periodsQuery.isLoading ? <Loading /> : null}
          {periodsQuery.error && !(periodsQuery.error instanceof UnauthorizedError) ? (
            <p className="text-sm text-red-700">{errorMessage(periodsQuery.error)}</p>
          ) : null}
          {!periodsQuery.isLoading && periods.length === 0 ? (
            <p className="text-sm text-neutral-700">
              Chưa có sheet đúng tên kỳ. Tạo tab tên <span className="font-semibold">11.11.2026-10.01.2027</span>.
            </p>
          ) : null}
          {active && periodQuery.isLoading ? <Loading /> : null}
          {active && periodQuery.error && !(periodQuery.error instanceof UnauthorizedError) ? (
            <p className="text-sm text-red-700">{errorMessage(periodQuery.error)}</p>
          ) : null}
          {active && periodQuery.data && section === 'booking' ? (
            <BookingCalendar period={active} bookings={periodQuery.data.bookings} />
          ) : null}
          {active && periodQuery.data && section === 'details' ? <DetailsView period={active} data={periodQuery.data} /> : null}
          {active && periodQuery.data && section === 'expenses' ? <ExpensesView period={active} data={periodQuery.data} /> : null}
          {active && periodQuery.data && section === 'revenue' ? <RevenueView revenue={periodQuery.data.revenue} /> : null}
        </main>
      </div>
    </div>
  )
}
