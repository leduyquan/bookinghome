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
