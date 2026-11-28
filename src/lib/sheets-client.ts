import { formatDay } from '@/domain/dates'
import type { Period } from '@/domain/period'
import { UnauthorizedError } from '@/lib/errors'
import {
  mockDeleteBooking,
  mockDeleteExpense,
  mockGetPeriod,
  mockListPeriods,
  mockLogin,
  mockSaveBooking,
  mockSaveExpense,
  mockSettleSlice,
} from '@/lib/mock-store'
import { canonicalSource } from '@/constants'
import type { Booking, BookingInput, ExpenseInput, PeriodData } from '@/types'

const SCRIPT_URL = (import.meta.env.VITE_APPS_SCRIPT_URL ?? '').trim()

export function isMockMode() {
  return SCRIPT_URL.length === 0
}

type ScriptOk = {
  ok: true
  periods?: Array<{ sheetName: string; start: string; end: string }>
  bookings?: PeriodData['bookings']
  expenses?: PeriodData['expenses']
  revenue?: PeriodData['revenue']
}

async function post(password: string, action: string, payload: Record<string, unknown> = {}): Promise<ScriptOk> {
  let response: Response
  try {
    response = await fetch(SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ password, action, ...payload }),
    })
  } catch {
    throw new Error('Không gọi được Google Apps Script. Kiểm tra URL deploy và mạng.')
  }

  const text = await response.text()
  let data: { ok?: boolean; error?: string }
  try {
    data = JSON.parse(text) as { ok?: boolean; error?: string }
  } catch {
    throw new Error('Google Apps Script không trả JSON. Hãy deploy lại Web app, chọn Execute as Me và Anyone.')
  }
  if (!data.ok) {
    if (data.error === 'UNAUTHORIZED') throw new UnauthorizedError()
    throw new Error(data.error || 'Google Sheet từ chối yêu cầu')
  }
  return data as ScriptOk
}

function toPeriod(item: { sheetName: string; start: string; end: string }): Period {
  return {
    sheetName: item.sheetName,
    start: item.start,
    end: item.end,
    label: `${formatDay(item.start)} - ${formatDay(item.end)}`,
  }
}

function asPeriodData(data: ScriptOk): PeriodData {
  if (!data.bookings || !data.expenses || !data.revenue) throw new Error('Dữ liệu kỳ không hợp lệ')
  return {
    bookings: data.bookings.map(normalizeLoadedBooking),
    expenses: data.expenses,
    revenue: data.revenue,
  }
}

function normalizeLoadedBooking(booking: Booking): Booking {
  return {
    ...booking,
    source: canonicalSource(booking.source) as Booking['source'],
    locked: booking.locked === true,
    settled: booking.settled === true,
  }
}

export const ledgerClient = {
  mode: isMockMode() ? ('mock' as const) : ('script' as const),
  async login(password: string) {
    if (isMockMode()) {
      mockLogin(password)
      return
    }
    await post(password, 'login')
  },
  async listPeriods(password: string) {
    if (isMockMode()) return mockListPeriods()
    const data = await post(password, 'listPeriods')
    return (data.periods ?? []).map(toPeriod).sort((a, b) => a.start.localeCompare(b.start))
  },
  async getPeriod(password: string, sheetName: string) {
    if (isMockMode()) return mockGetPeriod(sheetName)
    return asPeriodData(await post(password, 'getPeriod', { sheetName }))
  },
  async saveBooking(password: string, sheetName: string, booking: BookingInput) {
    if (isMockMode()) return mockSaveBooking(sheetName, booking)
    return asPeriodData(await post(password, 'saveBooking', { sheetName, booking }))
  },
  async deleteBooking(password: string, sheetName: string, id: string) {
    if (isMockMode()) return mockDeleteBooking(sheetName, id)
    return asPeriodData(await post(password, 'deleteBooking', { sheetName, id }))
  },
  async saveExpense(password: string, sheetName: string, expense: ExpenseInput) {
    if (isMockMode()) return mockSaveExpense(sheetName, expense)
    return asPeriodData(await post(password, 'saveExpense', { sheetName, expense }))
  },
  async deleteExpense(password: string, sheetName: string, id: string) {
    if (isMockMode()) return mockDeleteExpense(sheetName, id)
    return asPeriodData(await post(password, 'deleteExpense', { sheetName, id }))
  },
  async settleSlice(password: string, sheetName: string, start: string, end: string, settled: boolean) {
    if (isMockMode()) return mockSettleSlice(sheetName, start, end, settled)
    return asPeriodData(await post(password, 'settleSlice', { sheetName, start, end, settled }))
  },
}
