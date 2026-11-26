import { ROOM_IDS, SOURCES } from '@/constants'

export type RoomId = (typeof ROOM_IDS)[number]
export type Source = (typeof SOURCES)[number]
export type SectionId = 'booking' | 'details' | 'expenses' | 'revenue'

export type Booking = {
  id: string
  source: Source
  guestName: string
  checkIn: string
  checkOut: string
  room: RoomId
  nights: number
  pricePerNight: number
  total: number
  cost: number
  net: number
  paid: boolean
  note: string
}

export type BookingInput = {
  id?: string
  source: Source
  guestName: string
  checkIn: string
  checkOut: string
  room: RoomId
  total: number
  cost: number
  paid?: boolean
  note: string
}

export type Expense = {
  id: string
  name: string
  detail: string
  date: string
  amount: number
}

export type ExpenseInput = {
  id?: string
  name: string
  detail: string
  date: string
  amount: number
}

export type Revenue = {
  doanhThu: number
  chiPhi: number
  loiNhuan: number
  quanDuy: number
  thuy: number
}

export type PeriodData = {
  bookings: Booking[]
  expenses: Expense[]
  revenue: Revenue
}

export function isRoomId(value: string): value is RoomId {
  return (ROOM_IDS as readonly string[]).includes(value)
}

export function isSource(value: string): value is Source {
  return (SOURCES as readonly string[]).includes(value)
}

export function isSectionId(value: string | null): value is SectionId {
  return value === 'booking' || value === 'details' || value === 'expenses' || value === 'revenue'
}
