import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { formatShort } from '@/domain/dates'
import { revenueLines, type RevenueLine } from '@/domain/revenue'
import { formatVnd } from '@/domain/money'
import type { Period } from '@/domain/period'
import { UnauthorizedError, errorMessage } from '@/lib/errors'
import { useLedger } from '@/lib/ledger'
import { requirePassword } from '@/lib/session'
import { ledgerClient } from '@/lib/sheets-client'
import type { Booking, Expense } from '@/types'

export function RevenueView({ period, bookings, expenses }: { period: Period; bookings: Booking[]; expenses: Expense[] }) {
  const { lock } = useLedger()
  const queryClient = useQueryClient()
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const lines = revenueLines(period.start, period.end, bookings, expenses)
  const settle = useMutation({
    mutationFn: (line: RevenueLine) =>
      ledgerClient.settleSlice(requirePassword(), period.sheetName, line.start, line.end, !line.settled),
    onSuccess: (next) => queryClient.setQueryData(['period', period.sheetName], next),
  })

  async function toggle(line: RevenueLine) {
    setPendingKey(line.start)
    try {
      await settle.mutateAsync(line)
    } catch (error) {
      if (error instanceof UnauthorizedError) lock()
      else toast.error(errorMessage(error))
    } finally {
      setPendingKey(null)
    }
  }

  const groups = revenueGroups(lines)

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={`${group[0]!.start}-${group.at(-1)!.end}`} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="bg-primary-400 px-3 py-1.5 text-center text-sm font-semibold text-white">
            {formatShort(group[0]!.start)} – {formatShort(group.at(-1)!.end)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-semibold text-neutral-700">
                  <th className="px-3 py-2">Tháng</th>
                  <th className="px-3 py-2 text-right">Doanh thu ước tính</th>
                  <th className="px-3 py-2 text-right">Doanh thu</th>
                  <th className="px-3 py-2 text-right">Chi phí</th>
                  <th className="px-3 py-2 text-right">Lợi nhuận</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {group.map((line) => (
                  <tr key={`${line.kind}-${line.start}`} className={line.kind === 'total' ? 'bg-neutral-50 font-semibold' : ''}>
                    <td className="px-3 py-2">{line.label}</td>
                    <Money amount={line.doanhThuUocTinh} />
                    <Money amount={line.doanhThu} />
                    <Money amount={line.chiPhi} />
                    <Money amount={line.loiNhuan} />
                    <td className="px-3 py-2 text-right">
                      {line.kind === 'month' ? (
                        <Button
                          variant={line.settled ? 'outline' : 'primary'}
                          className="min-w-24"
                          disabled={pendingKey === line.start}
                          onClick={() => void toggle(line)}
                        >
                          {pendingKey === line.start ? 'Đang lưu...' : line.settled ? 'Bỏ chốt' : 'Chốt'}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}

function revenueGroups(lines: RevenueLine[]): RevenueLine[][] {
  const groups: RevenueLine[][] = []
  let current: RevenueLine[] = []
  lines.forEach((line) => {
    current.push(line)
    if (line.kind === 'total') {
      groups.push(current)
      current = []
    }
  })
  if (current.length) groups.push(current)
  return groups
}

function Money({ amount }: { amount: number }) {
  return (
    <td className={`px-3 py-2 text-right ${amount < 0 ? 'text-red-700' : ''}`}>{formatVnd(amount || 0)}</td>
  )
}
