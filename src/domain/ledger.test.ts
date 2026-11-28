import { describe, expect, it } from 'vitest'

import { sourceLink } from '@/constants'
import { isCheckoutInPeriod, monthSlices, nightsBetween, periodHalves } from '@/domain/dates'
import { bookingMatchesQuery, findOverlap, normalizeBooking, staysOverlap } from '@/domain/booking'
import { cellsForRoom, fortnightsCovering, halfCellsForRoom, groupWeeks, weeksCovering } from '@/domain/calendar'
import { bdcCost, formatVnd, pricePerNight } from '@/domain/money'
import { parsePeriodName, pickPeriod } from '@/domain/period'
import { checkoutSliceIndex, computeRevenue, revenueLines } from '@/domain/revenue'
import type { Booking, BookingInput } from '@/types'

const period = parsePeriodName('11.11.2026-10.01.2027')!

function booking(partial: Partial<Booking> & Pick<Booking, 'id' | 'room' | 'checkIn' | 'checkOut'>): Booking {
  return {
    source: 'Khách lẻ',
    guestName: 'Khách',
    locked: false,
    settled: false,
    nights: 1,
    pricePerNight: 1,
    total: 1,
    cost: 0,
    net: 1,
    paid: false,
    note: '',
    ...partial,
  }
}

describe('parsePeriodName', () => {
  it('parses a full date range and pads the label', () => {
    const parsed = parsePeriodName('11/1/2027-10/3/2027')
    expect(parsed).toMatchObject({
      sheetName: '11/1/2027-10/3/2027',
      start: '2027-01-11',
      end: '2027-03-10',
      label: '11/01/2027 - 10/03/2027',
    })
  })

  it('accepts dots because Google Sheets rejects slashes in tab names', () => {
    expect(parsePeriodName('11.11.2026-10.01.2027')).toMatchObject({
      start: '2026-11-11',
      end: '2027-01-10',
      label: '11/11/2026 - 10/01/2027',
    })
  })

  it('rejects names without a year and impossible dates', () => {
    expect(parsePeriodName('11/11-10/1')).toBeNull()
    expect(parsePeriodName('31/02/2026-10/03/2026')).toBeNull()
    expect(parsePeriodName('10/03/2026-11/02/2026')).toBeNull()
  })
})

describe('pickPeriod', () => {
  const periods = [
    parsePeriodName('11.09.2026-10.11.2026')!,
    parsePeriodName('11.11.2026-10.01.2027')!,
  ]

  it('keeps a stored sheet that still exists', () => {
    expect(pickPeriod(periods, '11.09.2026-10.11.2026', '2026-11-26')).toBe('11.09.2026-10.11.2026')
  })

  it('falls back to the period containing today, then the first sheet', () => {
    expect(pickPeriod(periods, 'missing', '2026-11-26')).toBe('11.11.2026-10.01.2027')
    expect(pickPeriod(periods, null, '2026-01-01')).toBe('11.09.2026-10.11.2026')
  })
})

describe('booking math', () => {
  it('counts nights exclusive of checkout and rounds the nightly price', () => {
    expect(nightsBetween('2026-11-11', '2026-11-15')).toBe(4)
    expect(pricePerNight(2_137_500, 4)).toBe(534_375)
    expect(pricePerNight(1_000, 3)).toBe(333)
    expect(bdcCost(1_950_000)).toBe(292_500)
    expect(bdcCost(1_667_250)).toBe(250_088)
  })

  it('matches a booking by source, name, room, or price', () => {
    const stay = booking({
      id: 'a',
      room: '201',
      checkIn: '2026-11-11',
      checkOut: '2026-11-13',
      guestName: 'Mario Sorgente',
      source: 'Booking.com',
      total: 1_200_000,
      cost: 120_000,
      pricePerNight: 600_000,
      net: 1_080_000,
    })
    expect(bookingMatchesQuery(stay, '  ')).toBe(true)
    expect(bookingMatchesQuery(stay, 'booking')).toBe(true)
    expect(sourceLink('BDC')).toBe('https://www.booking.com/')
    expect(sourceLink('Agoda')).toBe('https://www.agoda.com/')
    expect(sourceLink('Khách lẻ')).toBeUndefined()
    expect(bookingMatchesQuery(stay, 'mario')).toBe(true)
    expect(bookingMatchesQuery(stay, '201')).toBe(true)
    expect(bookingMatchesQuery(stay, '1.200.000')).toBe(true)
    expect(bookingMatchesQuery(stay, '1200000')).toBe(true)
    expect(bookingMatchesQuery(stay, '600.000')).toBe(false)
    expect(bookingMatchesQuery(stay, '1.080.000')).toBe(false)
    expect(bookingMatchesQuery(stay, 'agoda')).toBe(false)
    const locked = booking({
      id: 'k',
      room: '202',
      checkIn: '2026-11-16',
      checkOut: '2026-11-17',
      guestName: '',
      locked: true,
    })
    expect(bookingMatchesQuery(locked, 'khóa')).toBe(true)
  })

  it('treats checkout morning as free for the next guest', () => {
    expect(staysOverlap('2026-11-11', '2026-11-13', '2026-11-13', '2026-11-15')).toBe(false)
    expect(staysOverlap('2026-11-11', '2026-11-14', '2026-11-13', '2026-11-15')).toBe(true)
  })

  it('blocks an overlapping stay in the same room and allows an edit of itself', () => {
    const existing = [booking({ id: 'a', room: '201', checkIn: '2026-11-11', checkOut: '2026-11-13', guestName: 'Mario' })]
    const input: BookingInput = {
      source: 'Booking.com',
      guestName: 'An',
      checkIn: '2026-11-12',
      checkOut: '2026-11-14',
      room: '201',
      total: 900_000,
      cost: 0,
      note: '',
    }
    expect(() => normalizeBooking(input, period, existing, 'b')).toThrow(/Phòng 201 đã có Mario/)
    expect(normalizeBooking({ ...input, id: 'a' }, period, existing, 'a').guestName).toBe('An')
    expect(findOverlap(existing, '202', '2026-11-12', '2026-11-14')).toBeUndefined()
  })

  it('allows checkout on the morning after the last night of the period', () => {
    const input: BookingInput = {
      source: 'Booking.com',
      guestName: 'Charles',
      checkIn: '2027-01-09',
      checkOut: '2027-01-11',
      room: '301',
      total: 800_000,
      cost: 0,
      note: '',
    }
    expect(isCheckoutInPeriod('2027-01-11', period.start, period.end)).toBe(true)
    expect(normalizeBooking(input, period, [], 'c').nights).toBe(2)
    expect(() => normalizeBooking({ ...input, checkOut: '2027-01-12' }, period, [], 'c')).toThrow(/trong kỳ/)
    expect(() => normalizeBooking({ ...input, checkIn: '2027-01-11', checkOut: '2027-01-12' }, period, [], 'c')).toThrow(/trong kỳ/)
  })

  it('rejects a stay that crosses the period boundary', () => {
    const input: BookingInput = {
      source: 'Khách lẻ',
      guestName: 'Bay Tsui',
      checkIn: '2026-11-09',
      checkOut: '2026-11-13',
      room: '202',
      total: 1_000_000,
      cost: 0,
      note: '',
    }
    expect(() => normalizeBooking(input, period, [], 'x')).toThrow(/trong kỳ/)
  })

  it('accepts a total of zero and rejects a negative total', () => {
    const input: BookingInput = {
      source: 'Khách lẻ',
      guestName: 'Khách',
      checkIn: '2026-11-20',
      checkOut: '2026-11-21',
      room: '201',
      total: 0,
      cost: 0,
      note: '',
    }
    const saved = normalizeBooking(input, period, [], 'z')
    expect(saved.total).toBe(0)
    expect(saved.pricePerNight).toBe(0)
    expect(saved.net).toBe(0)
    expect(() => normalizeBooking({ ...input, total: -1 }, period, [], 'z')).toThrow(/Tổng giá/)
  })

  it('treats a missing payment flag as unpaid', () => {
    const input: BookingInput = {
      source: 'Khách lẻ',
      guestName: 'Tiểu Quy',
      checkIn: '2026-11-20',
      checkOut: '2026-11-21',
      room: '201',
      total: 550_000,
      cost: 0,
      note: 'Đã thu khách',
    }
    expect(normalizeBooking(input, period, [], 'tq').paid).toBe(false)
    expect(normalizeBooking({ ...input, paid: true }, period, [], 'tq').paid).toBe(true)
  })

  it('stores a legacy BDC source as Booking.com and locks one night without a guest', () => {
    const named = normalizeBooking(
      {
        source: 'BDC',
        guestName: 'An',
        checkIn: '2026-11-20',
        checkOut: '2026-11-21',
        room: '202',
        total: 100_000,
        cost: 0,
        note: '',
      } as unknown as BookingInput,
      period,
      [],
      'bdc',
    )
    expect(named.source).toBe('Booking.com')
    const locked = normalizeBooking(
      {
        source: '',
        guestName: '',
        checkIn: '2026-11-22',
        checkOut: '2026-11-23',
        room: '201',
        total: 0,
        cost: 0,
        paid: true,
        note: '',
        locked: true,
      },
      period,
      [],
      'lock',
    )
    expect(locked).toMatchObject({ source: '', guestName: '', total: 0, paid: true, locked: true, nights: 1 })
    expect(() => normalizeBooking({ ...locked, id: undefined, locked: false, guestName: '' }, period, [], 'x')).toThrow(/tên khách|Chọn nguồn/)
  })
})

describe('calendar', () => {
  it('covers 11/11/2026-10/01/2027 with nine Monday weeks', () => {
    expect(weeksCovering('2026-11-11', '2027-01-10')).toHaveLength(9)
  })

  it('folds weeks into two blocks, keeping a leftover week with the previous block', () => {
    const weeks = weeksCovering('2026-11-11', '2027-01-10')
    expect(groupWeeks(weeks).map((group) => group.length)).toEqual([4, 5])
    expect(groupWeeks([1, 2, 3, 4, 5, 6, 7, 8]).map((group) => group.length)).toEqual([4, 4])
  })

  it('merges occupied nights and leaves the checkout morning empty', () => {
    const week = weeksCovering('2026-11-11', '2027-01-10')[0]!
    const stay = booking({
      id: 'bay',
      room: '202',
      guestName: 'Bay Tsui',
      checkIn: '2026-11-11',
      checkOut: '2026-11-15',
      note: 'Phát sinh 400k',
    })
    const cells = cellsForRoom(week, [stay], '202')
    expect(cells.map((cell) => (cell.kind === 'stay' ? `stay:${cell.span}` : cell.kind))).toEqual([
      'outside',
      'outside',
      'stay:4',
      'empty',
    ])
    const stayCell = cells.find((cell) => cell.kind === 'stay')
    expect(stayCell?.kind === 'stay' && stayCell.booking.note).toBe('Phát sinh 400k')
  })

  it('paints a stay from the check-in afternoon through the checkout morning', () => {
    const week = weeksCovering('2026-11-11', '2027-01-10')[0]!
    const stay = booking({
      id: 'bay',
      room: '202',
      guestName: 'Bay Tsui',
      checkIn: '2026-11-11',
      checkOut: '2026-11-15',
    })
    const cells = halfCellsForRoom(week, [stay], '202')
    expect(cells.map((cell) => {
      if (cell.kind === 'stay') return `stay:${cell.span}`
      if (cell.kind === 'gap') return `gap:${cell.iso}:${cell.bookable ? 'book' : 'blank'}`
      if (cell.kind === 'empty') return `empty:${cell.iso}`
      return `outside:${cell.span}`
    })).toEqual(['outside:4', 'gap:2026-11-11:blank', 'stay:8', 'gap:2026-11-15:book'])
    expect(cells.reduce((sum, cell) => sum + cell.span, 0)).toBe(week.length * 2)
  })

  it('splits a turnover day between the guest leaving and the guest arriving', () => {
    const week = weeksCovering('2026-11-11', '2027-01-10')[0]!
    const leaving = booking({
      id: 'a',
      room: '202',
      guestName: 'A',
      checkIn: '2026-11-12',
      checkOut: '2026-11-15',
    })
    const arriving = booking({
      id: 'b',
      room: '202',
      guestName: 'B',
      checkIn: '2026-11-15',
      checkOut: '2026-11-16',
    })
    const cells = halfCellsForRoom(week, [leaving, arriving], '202')
    const stays = cells.filter((cell) => cell.kind === 'stay')
    expect(stays.map((cell) => (cell.kind === 'stay' ? `${cell.booking.id}:${cell.span}` : ''))).toEqual(['a:6', 'b:1'])
    const afternoon = cells.find((cell) => cell.kind === 'gap' && cell.iso === '2026-11-15')
    expect(afternoon).toBeUndefined()
    expect(cells.reduce((sum, cell) => sum + cell.span, 0)).toBe(week.length * 2)
  })

  it('keeps days after the period gray when a stay runs past the end', () => {
    const fortnight = fortnightsCovering('2026-11-11', '2026-11-15')[0]!
    const stay = booking({
      id: 'late',
      room: '301',
      guestName: 'Late',
      checkIn: '2026-11-14',
      checkOut: '2026-11-20',
    })
    const cells = halfCellsForRoom(fortnight, [stay], '301')
    expect(cells.map((cell) => {
      if (cell.kind === 'stay') return `stay:${cell.span}`
      if (cell.kind === 'gap') return `gap:${cell.iso}:${cell.bookable ? 'book' : 'blank'}`
      if (cell.kind === 'empty') return `empty:${cell.iso}`
      return `outside:${cell.span}`
    })).toEqual([
      'outside:4',
      'empty:2026-11-11',
      'empty:2026-11-12',
      'empty:2026-11-13',
      'gap:2026-11-14:blank',
      'stay:3',
      'outside:14',
    ])
    expect(cells.reduce((sum, cell) => sum + cell.span, 0)).toBe(fortnight.length * 2)
  })
})

describe('revenue and money', () => {
  it('splits profit so the two shares sum to the exact đồng', () => {
    expect(formatVnd(1_816_875)).toBe('1.816.875 đ')
    expect(formatVnd(-101)).toBe('-101 đ')
    expect(
      computeRevenue(
        [
          { net: 1_000, paid: true },
          { net: 500, paid: false },
        ],
        [{ amount: 400 }],
      ),
    ).toEqual({
      doanhThu: 1_000,
      doanhThuUocTinh: 1_500,
      chiPhi: 400,
      loiNhuan: 600,
    })
    expect(computeRevenue([{ net: 101, paid: true }], [])).toEqual({
      doanhThu: 101,
      doanhThuUocTinh: 101,
      chiPhi: 0,
      loiNhuan: 101,
    })
  })

  it('counts a stay in the 11–10 month that contains checkout, and totals every two months', () => {
    const start = '2027-01-11'
    const end = '2027-05-10'
    expect(monthSlices(start, end).map((slice) => slice.start)).toEqual([
      '2027-01-11',
      '2027-02-11',
      '2027-03-11',
      '2027-04-11',
    ])
    expect(periodHalves(start, end)).toEqual([
      { start: '2027-01-11', end: '2027-03-10' },
      { start: '2027-03-11', end: '2027-05-10' },
    ])
    const slices = monthSlices(start, end)
    expect(checkoutSliceIndex('2027-02-05', slices, end)).toBe(0)
    expect(checkoutSliceIndex('2027-02-15', slices, end)).toBe(1)
    expect(checkoutSliceIndex('2027-05-11', slices, end)).toBe(3)
    const lines = revenueLines(
      start,
      end,
      [
        booking({
          id: 'early',
          room: '201',
          checkIn: '2027-01-20',
          checkOut: '2027-02-05',
          net: 100,
          paid: true,
          total: 100,
        }),
        booking({
          id: 'later',
          room: '202',
          checkIn: '2027-01-20',
          checkOut: '2027-02-15',
          net: 40,
          paid: true,
          total: 40,
        }),
      ],
      [{ id: 'e', name: 'Điện', detail: '', date: '2027-02-01', amount: 10 }],
    )
    expect(lines.map((line) => line.kind)).toEqual(['month', 'month', 'total', 'month', 'month', 'total'])
    expect(lines[0]).toMatchObject({ doanhThu: 100, chiPhi: 10, loiNhuan: 90 })
    expect(lines[1]).toMatchObject({ doanhThu: 40, chiPhi: 0, loiNhuan: 40 })
    expect(lines[2]).toMatchObject({ kind: 'total', doanhThu: 140, chiPhi: 10, loiNhuan: 130 })
  })
})
