import { normalizeBooking } from '@/domain/booking'
import { normalizeExpense } from '@/domain/expense'
import { computeRevenue } from '@/domain/revenue'
import { parsePeriodName, type Period } from '@/domain/period'
import { UnauthorizedError } from '@/lib/errors'
import type { Booking, BookingInput, Expense, ExpenseInput, PeriodData } from '@/types'

const STORAGE_KEY = 'bookinghome.mock'
const LOCAL_PASSWORD = 'quanduy123'

type Bucket = { bookings: Booking[]; expenses: Expense[] }
type MockDb = Record<string, Bucket>

const PERIOD_NAMES = ['11.09.2026-10.11.2026', '11.11.2026-10.01.2027', '11.01.2027-10.03.2027'] as const

function seedBooking(periodName: string, existing: Booking[], input: BookingInput, id: string): Booking {
  const period = parsePeriodName(periodName)
  if (!period) throw new Error('Kỳ mẫu không hợp lệ')
  return normalizeBooking({ ...input, id }, period, existing, id)
}

function seedExpense(periodName: string, input: ExpenseInput, id: string): Expense {
  const period = parsePeriodName(periodName)
  if (!period) throw new Error('Kỳ mẫu không hợp lệ')
  return normalizeExpense({ ...input, id }, period, id)
}

export function createSeed(): MockDb {
  const early = '11.09.2026-10.11.2026'
  const current = '11.11.2026-10.01.2027'
  const earlyBookings: Booking[] = []
  earlyBookings.push(
    seedBooking(
      early,
      earlyBookings,
      {
        source: 'Agoda',
        guestName: 'Vũ Nguyễn',
        checkIn: '2026-09-12',
        checkOut: '2026-09-14',
        room: '301',
        total: 800_000,
        cost: 80_000,
        note: '',
      },
      'seed-vu',
    ),
  )

  const currentBookings: Booking[] = []
  const addCurrent = (input: BookingInput, id: string) => {
    currentBookings.push(seedBooking(current, currentBookings, input, id))
  }
  addCurrent(
    {
      source: 'BDC',
      guestName: 'Mario Sorgente',
      checkIn: '2026-11-11',
      checkOut: '2026-11-13',
      room: '201',
      total: 1_200_000,
      cost: 120_000,
      note: '',
    },
    'seed-mario',
  )
  addCurrent(
    {
      source: 'BDC',
      guestName: 'Bay Tsui',
      checkIn: '2026-11-11',
      checkOut: '2026-11-15',
      room: '202',
      total: 2_137_500,
      cost: 320_625,
      note: '',
    },
    'seed-bay',
  )
  addCurrent(
    {
      source: '',
      guestName: 'Khách Anh Quân',
      checkIn: '2026-11-13',
      checkOut: '2026-11-16',
      room: '201',
      total: 1_800_000,
      cost: 0,
      note: '',
    },
    'seed-quan',
  )
  addCurrent(
    {
      source: 'Khách lẻ',
      guestName: 'Chị Giang',
      checkIn: '2026-11-15',
      checkOut: '2026-11-16',
      room: '202',
      total: 500_000,
      cost: 0,
      note: 'Phát sinh 400k',
    },
    'seed-giang',
  )
  addCurrent(
    {
      source: 'Air bnb',
      guestName: 'Thuan Phan',
      checkIn: '2026-11-15',
      checkOut: '2026-11-17',
      room: '301',
      total: 700_000,
      cost: 0,
      note: '',
    },
    'seed-thuan',
  )

  return {
    [early]: { bookings: earlyBookings, expenses: [] },
    [current]: {
      bookings: currentBookings,
      expenses: [
        seedExpense(current, { name: 'Dọn phòng', detail: '', date: '2026-11-12', amount: 250_000 }, 'seed-clean'),
        seedExpense(current, { name: 'Tiền điện', detail: 'Tháng 11', date: '2026-11-20', amount: 871_020 }, 'seed-power'),
      ],
    },
    '11.01.2027-10.03.2027': { bookings: [], expenses: [] },
  }
}

function load(): MockDb {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seeded = createSeed()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
  return JSON.parse(raw) as MockDb
}

function persist(db: MockDb) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function snapshot(bucket: Bucket): PeriodData {
  return {
    bookings: bucket.bookings,
    expenses: bucket.expenses,
    revenue: computeRevenue(bucket.bookings, bucket.expenses),
  }
}

function bucketOf(db: MockDb, sheetName: string): { period: Period; bucket: Bucket } {
  const period = parsePeriodName(sheetName)
  const bucket = db[sheetName]
  if (!period || !bucket) throw new Error('Không tìm thấy kỳ')
  return { period, bucket }
}

export function mockLogin(password: string) {
  if (password !== LOCAL_PASSWORD) throw new UnauthorizedError()
}

export function mockListPeriods(): Period[] {
  const db = load()
  return Object.keys(db)
    .map((name) => parsePeriodName(name))
    .filter((period): period is Period => period !== null)
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function mockGetPeriod(sheetName: string): PeriodData {
  const db = load()
  return snapshot(bucketOf(db, sheetName).bucket)
}

export function mockSaveBooking(sheetName: string, input: BookingInput): PeriodData {
  const db = load()
  const { period, bucket } = bucketOf(db, sheetName)
  const id = input.id || crypto.randomUUID()
  if (input.id && !bucket.bookings.some((booking) => booking.id === input.id)) {
    throw new Error('Không tìm thấy booking')
  }
  const next = normalizeBooking(input, period, bucket.bookings, id)
  const index = bucket.bookings.findIndex((booking) => booking.id === id)
  if (index >= 0) bucket.bookings[index] = next
  else bucket.bookings.push(next)
  persist(db)
  return snapshot(bucket)
}

export function mockDeleteBooking(sheetName: string, id: string): PeriodData {
  const db = load()
  const { bucket } = bucketOf(db, sheetName)
  const next = bucket.bookings.filter((booking) => booking.id !== id)
  if (next.length === bucket.bookings.length) throw new Error('Không tìm thấy booking')
  bucket.bookings = next
  persist(db)
  return snapshot(bucket)
}

export function mockSaveExpense(sheetName: string, input: ExpenseInput): PeriodData {
  const db = load()
  const { period, bucket } = bucketOf(db, sheetName)
  const id = input.id || crypto.randomUUID()
  if (input.id && !bucket.expenses.some((expense) => expense.id === input.id)) {
    throw new Error('Không tìm thấy chi phí')
  }
  const next = normalizeExpense(input, period, id)
  const index = bucket.expenses.findIndex((expense) => expense.id === id)
  if (index >= 0) bucket.expenses[index] = next
  else bucket.expenses.push(next)
  persist(db)
  return snapshot(bucket)
}

export function mockDeleteExpense(sheetName: string, id: string): PeriodData {
  const db = load()
  const { bucket } = bucketOf(db, sheetName)
  const next = bucket.expenses.filter((expense) => expense.id !== id)
  if (next.length === bucket.expenses.length) throw new Error('Không tìm thấy chi phí')
  bucket.expenses = next
  persist(db)
  return snapshot(bucket)
}

export const mockPeriodNames = PERIOD_NAMES
