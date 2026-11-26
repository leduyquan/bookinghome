import type { Booking, Expense, Revenue } from '@/types'

export function computeRevenue(bookings: Pick<Booking, 'net' | 'paid'>[], expenses: Pick<Expense, 'amount'>[]): Revenue {
  const doanhThu = bookings.reduce((sum, booking) => sum + (booking.paid ? booking.net : 0), 0)
  const doanhThuUocTinh = bookings.reduce((sum, booking) => sum + booking.net, 0)
  const chiPhi = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const loiNhuan = doanhThu - chiPhi
  const quanDuy = Math.round(loiNhuan / 2)
  const thuy = loiNhuan - quanDuy
  return { doanhThu, doanhThuUocTinh, chiPhi, loiNhuan, quanDuy, thuy }
}
