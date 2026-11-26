import { isRealIso, isWithinPeriod, nightsBetween } from '@/domain/dates'
import { pricePerNight } from '@/domain/money'
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
  if (!guestName) throw new Error('Nhập tên khách')
  if (!isSource(input.source)) throw new Error('Nguồn không hợp lệ')
  if (!isRoomId(input.room)) throw new Error('Chọn phòng')
  if (!isRealIso(input.checkIn) || !isRealIso(input.checkOut)) throw new Error('Ngày nhận và trả phòng không hợp lệ')
  if (!isWithinPeriod(input.checkIn, period.start, period.end) || !isWithinPeriod(input.checkOut, period.start, period.end)) {
    throw new Error('Ngày nhận và trả phòng phải nằm trong kỳ đang mở')
  }
  if (input.checkOut <= input.checkIn) throw new Error('Ngày trả phòng phải sau ngày nhận')

  const total = input.total
  const cost = input.cost
  if (!Number.isInteger(total) || total <= 0) throw new Error('Tổng giá phải là số nguyên lớn hơn 0')
  if (!Number.isInteger(cost) || cost < 0) throw new Error('Chi phí phải là số nguyên không âm')

  const clash = findOverlap(existing, input.room, input.checkIn, input.checkOut, input.id)
  if (clash) {
    throw new Error(`Phòng ${input.room} đã có ${clash.guestName} trong các đêm này`)
  }

  const nights = nightsBetween(input.checkIn, input.checkOut)
  return {
    id,
    source: input.source,
    guestName,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    room: input.room,
    nights,
    pricePerNight: pricePerNight(total, nights),
    total,
    cost,
    net: total - cost,
    note: input.note.trim(),
  }
}

export function sortBookings(bookings: Booking[]): Booking[] {
  return [...bookings].sort(
    (a, b) => a.checkIn.localeCompare(b.checkIn) || a.guestName.localeCompare(b.guestName, 'vi') || a.id.localeCompare(b.id),
  )
}
