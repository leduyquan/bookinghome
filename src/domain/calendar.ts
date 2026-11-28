import { addDays, format, parseISO, startOfWeek } from 'date-fns'

import type { Booking, RoomId } from '@/types'

export type WeekDay = {
  iso: string
  inPeriod: boolean
}

export type CalendarCell =
  | { kind: 'outside' }
  | { kind: 'empty'; iso: string }
  | { kind: 'stay'; span: number; booking: Booking }

/** Groups week rows into blocks of `size`. A single leftover week stays with the previous block. */
export function groupWeeks<T>(weeks: T[], size = 4): T[][] {
  const groups: T[][] = []
  for (let index = 0; index < weeks.length; index += size) {
    groups.push(weeks.slice(index, index + size))
  }
  const tail = groups.at(-1)
  if (groups.length > 1 && tail && tail.length === 1) {
    groups[groups.length - 2]!.push(...tail)
    groups.pop()
  }
  return groups
}

export function weeksCovering(start: string, end: string): WeekDay[][] {
  const first = startOfWeek(parseISO(start), { weekStartsOn: 1 })
  const last = startOfWeek(parseISO(end), { weekStartsOn: 1 })
  const weeks: WeekDay[][] = []

  for (let cursor = first; cursor.getTime() <= last.getTime(); cursor = addDays(cursor, 7)) {
    const days: WeekDay[] = []
    for (let index = 0; index < 7; index += 1) {
      const iso = format(addDays(cursor, index), 'yyyy-MM-dd')
      days.push({ iso, inPeriod: iso >= start && iso <= end })
    }
    weeks.push(days)
  }

  return weeks
}

/** Monday-aligned rows of 14 days covering a half of the period. */
export function fortnightsCovering(start: string, end: string): WeekDay[][] {
  const first = startOfWeek(parseISO(start), { weekStartsOn: 1 })
  const last = startOfWeek(parseISO(end), { weekStartsOn: 1 })
  const rows: WeekDay[][] = []

  for (let cursor = first; cursor.getTime() <= last.getTime(); cursor = addDays(cursor, 14)) {
    const days: WeekDay[] = []
    for (let index = 0; index < 14; index += 1) {
      const iso = format(addDays(cursor, index), 'yyyy-MM-dd')
      days.push({ iso, inPeriod: iso >= start && iso <= end })
    }
    rows.push(days)
  }

  return rows
}

export function cellsForRoom(days: WeekDay[], bookings: Booking[], room: RoomId): CalendarCell[] {
  const cells: CalendarCell[] = []
  let index = 0

  while (index < days.length) {
    const day = days[index]
    if (!day?.inPeriod) {
      cells.push({ kind: 'outside' })
      index += 1
      continue
    }

    const booking = bookings.find(
      (item) => item.room === room && day.iso >= item.checkIn && day.iso < item.checkOut,
    )
    if (!booking) {
      cells.push({ kind: 'empty', iso: day.iso })
      index += 1
      continue
    }

    let span = 1
    while (index + span < days.length) {
      const next = days[index + span]
      if (!next?.inPeriod || next.iso < booking.checkIn || next.iso >= booking.checkOut) break
      span += 1
    }

    cells.push({ kind: 'stay', span, booking })
    index += span
  }

  return cells
}

export type HalfCell =
  | { kind: 'outside'; span: number }
  | { kind: 'empty'; iso: string; span: number }
  | { kind: 'gap'; iso: string; span: number; bookable: boolean }
  | { kind: 'stay'; span: number; booking: Booking }

type HalfSlot =
  | { kind: 'outside' }
  | { kind: 'empty'; iso: string; side: 'morning' | 'afternoon' }
  | { kind: 'stay'; booking: Booking }

/** Morning belongs to the guest leaving at noon. Afternoon belongs to the guest arriving at noon. */
function stayOnHalf(bookings: Booking[], room: RoomId, iso: string, side: 'morning' | 'afternoon'): Booking | undefined {
  return bookings.find((item) => {
    if (item.room !== room) return false
    if (side === 'morning') return item.checkIn < iso && item.checkOut >= iso
    return item.checkIn <= iso && item.checkOut > iso
  })
}

/**
 * Splits each day into two equal halves. A stay paints the afternoon of check-in
 * through the morning of checkout, and stops at the period edge. Days outside the
 * period stay gray even when a booking still covers them. Spans count halves, so a
 * date column is always two.
 */
export function halfCellsForRoom(days: WeekDay[], bookings: Booking[], room: RoomId): HalfCell[] {
  const slots: HalfSlot[] = []
  for (const day of days) {
    for (const side of ['morning', 'afternoon'] as const) {
      if (!day.inPeriod) {
        slots.push({ kind: 'outside' })
        continue
      }
      const booking = stayOnHalf(bookings, room, day.iso, side)
      if (booking) slots.push({ kind: 'stay', booking })
      else slots.push({ kind: 'empty', iso: day.iso, side })
    }
  }

  const cells: HalfCell[] = []
  let index = 0
  while (index < slots.length) {
    const slot = slots[index]
    if (!slot) break

    if (slot.kind === 'stay') {
      let span = 1
      while (index + span < slots.length) {
        const next = slots[index + span]
        if (next?.kind !== 'stay' || next.booking.id !== slot.booking.id) break
        span += 1
      }
      cells.push({ kind: 'stay', span, booking: slot.booking })
      index += span
      continue
    }

    if (slot.kind === 'outside') {
      let span = 1
      while (index + span < slots.length && slots[index + span]?.kind === 'outside') span += 1
      cells.push({ kind: 'outside', span })
      index += span
      continue
    }

    const next = slots[index + 1]
    if (slot.side === 'morning' && next?.kind === 'empty' && next.iso === slot.iso && next.side === 'afternoon') {
      cells.push({ kind: 'empty', iso: slot.iso, span: 2 })
      index += 2
      continue
    }

    cells.push({ kind: 'gap', iso: slot.iso, span: 1, bookable: slot.side === 'afternoon' })
    index += 1
  }

  return cells
}
