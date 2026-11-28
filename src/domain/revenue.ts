import type { DateSpan } from '@/domain/dates'
import { formatShort, monthSlices } from '@/domain/dates'
import type { Booking, Expense, Revenue } from '@/types'

export type RevenueLine = Revenue & {
  kind: 'month' | 'total'
  label: string
  start: string
  end: string
  settled: boolean
}

export function computeRevenue(bookings: Pick<Booking, 'net' | 'paid'>[], expenses: Pick<Expense, 'amount'>[]): Revenue {
  const doanhThu = bookings.reduce((sum, booking) => sum + (booking.paid ? booking.net : 0), 0)
  const doanhThuUocTinh = bookings.reduce((sum, booking) => sum + booking.net, 0)
  const chiPhi = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  return { doanhThu, doanhThuUocTinh, chiPhi, loiNhuan: doanhThu - chiPhi }
}

/** The whole stay is counted in the month that contains the checkout date. */
export function checkoutSliceIndex(checkOut: string, slices: DateSpan[], periodEnd: string): number {
  const day = checkOut > periodEnd ? periodEnd : checkOut
  const index = slices.findIndex((slice) => day >= slice.start && day <= slice.end)
  return index === -1 ? Math.max(slices.length - 1, 0) : index
}

export function revenueLines(start: string, end: string, bookings: Booking[], expenses: Expense[]): RevenueLine[] {
  const slices = monthSlices(start, end)
  const months: RevenueLine[] = slices.map((slice, index) => {
    const stays = bookings.filter((booking) => checkoutSliceIndex(booking.checkOut, slices, end) === index)
    const costs = expenses.filter((expense) => expense.date >= slice.start && expense.date <= slice.end)
    const money = computeRevenue(stays, costs)
    return {
      kind: 'month',
      label: `${formatShort(slice.start)} – ${formatShort(slice.end)}`,
      start: slice.start,
      end: slice.end,
      ...money,
      settled: stays.length > 0 && stays.every((booking) => booking.settled),
    }
  })

  const lines: RevenueLine[] = []
  months.forEach((month, index) => {
    lines.push(month)
    if (index % 2 === 1) {
      const pair = months.slice(index - 1, index + 1)
      const doanhThu = pair.reduce((sum, row) => sum + row.doanhThu, 0)
      const doanhThuUocTinh = pair.reduce((sum, row) => sum + row.doanhThuUocTinh, 0)
      const chiPhi = pair.reduce((sum, row) => sum + row.chiPhi, 0)
      lines.push({
        kind: 'total',
        label: `Tổng ${formatShort(pair[0]!.start)} – ${formatShort(pair[1]!.end)}`,
        start: pair[0]!.start,
        end: pair[1]!.end,
        doanhThu,
        doanhThuUocTinh,
        chiPhi,
        loiNhuan: doanhThu - chiPhi,
        settled: false,
      })
    }
  })
  return lines
}
