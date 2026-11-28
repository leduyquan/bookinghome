import { canonicalSource } from '@/constants'
import { isCheckoutInPeriod, isRealIso, isWithinPeriod, nightsBetween } from '@/domain/dates'
import { formatGrouped, pricePerNight } from '@/domain/money'
import type { Period } from '@/domain/period'
import { isRoomId, isSource, type Booking, type BookingInput } from '@/types'

export function staysOverlap(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return aIn < bOut && bIn < aOut
}

export function findOverlap(
  bookings: Booking[],
  room: string,
  checkIn: string,
  checkOut: string,
  excludeId?: string,
): Booking | undefined {
  return bookings.find(
    (booking) =>
      booking.room === room &&
      booking.id !== excludeId &&
      staysOverlap(booking.checkIn, booking.checkOut, checkIn, checkOut),
  )
}

export function normalizeBooking(input: BookingInput, period: Period, existing: Booking[], id: string): Booking {
  const guestName = input.guestName.trim()
  if (!isRoomId(input.room)) throw new Error('Chọn phòng')
  if (!isRealIso(input.checkIn) || !isRealIso(input.checkOut)) throw new Error('Ngày nhận và trả phòng không hợp lệ')
  if (!isWithinPeriod(input.checkIn, period.start, period.end) || !isCheckoutInPeriod(input.checkOut, period.start, period.end)) {
    throw new Error('Ngày nhận và trả phòng phải nằm trong kỳ đang mở')
  }
  if (input.checkOut <= input.checkIn) throw new Error('Ngày trả phòng phải sau ngày nhận')

  const total = input.total
  const cost = input.cost
  if (!Number.isInteger(total) || total < 0) throw new Error('Tổng giá phải là số nguyên không âm')
  if (!Number.isInteger(cost) || cost < 0) throw new Error('Chi phí phải là số nguyên không âm')

  const clash = findOverlap(existing, input.room, input.checkIn, input.checkOut, input.id)
  if (clash) {
    const who = clash.locked ? 'khóa' : clash.guestName
    throw new Error(`Phòng ${input.room} đã có ${who} trong các đêm này`)
  }

  const nights = nightsBetween(input.checkIn, input.checkOut)
  const locked = input.locked === true
  if (locked) {
    return {
      id,
      source: '',
      guestName: '',
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      room: input.room,
      nights,
      pricePerNight: 0,
      total: 0,
      cost: 0,
      net: 0,
      paid: true,
      note: input.note.trim(),
      locked: true,
      settled: input.settled === true,
    }
  }

  const source = canonicalSource(input.source)
  if (!guestName) throw new Error('Nhập tên khách')
  if (!isSource(source)) throw new Error('Chọn nguồn')
  if (!Number.isInteger(total) || total < 0) throw new Error('Tổng giá phải là số nguyên không âm')
  if (!Number.isInteger(cost) || cost < 0) throw new Error('Chi phí phải là số nguyên không âm')

  return {
    id,
    source,
    guestName,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    room: input.room,
    nights,
    pricePerNight: pricePerNight(total, nights),
    total,
    cost,
    net: total - cost,
    paid: input.paid === true,
    note: input.note.trim(),
    locked: false,
    settled: input.settled === true,
  }
}

export function bookingMatchesQuery(booking: Booking, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('vi')
  if (!needle) return true
  const name = booking.locked ? `${booking.guestName} Khóa` : booking.guestName
  const text = [canonicalSource(booking.source), name, booking.room].join(' ').toLocaleLowerCase('vi')
  if (text.includes(needle)) return true
  const digits = needle.replace(/[.\sđ]/g, '')
  const grouped = formatGrouped(booking.total).toLocaleLowerCase('vi')
  return grouped.includes(needle) || (/\d/.test(digits) && String(Math.round(booking.total)).includes(digits))
}

export function sortBookings(bookings: Booking[]): Booking[] {
  return [...bookings].sort(
    (a, b) => a.checkIn.localeCompare(b.checkIn) || a.guestName.localeCompare(b.guestName, 'vi') || a.id.localeCompare(b.id),
  )
}
