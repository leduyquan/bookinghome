import { describe, expect, it } from 'vitest'

import { nightsBetween } from '@/domain/dates'
import { findOverlap, normalizeBooking, staysOverlap } from '@/domain/booking'
import { cellsForRoom, groupWeeks, weeksCovering } from '@/domain/calendar'
import { bdcCost, formatVnd, pricePerNight } from '@/domain/money'
import { parsePeriodName, pickPeriod } from '@/domain/period'
import { computeRevenue } from '@/domain/revenue'
import type { Booking, BookingInput } from '@/types'

const period = parsePeriodName('11.11.2026-10.01.2027')!

function booking(partial: Partial<Booking> & Pick<Booking, 'id' | 'room' | 'checkIn' | 'checkOut'>): Booking {
  return {
    source: '',
    guestName: 'Khách',
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

  it('treats checkout morning as free for the next guest', () => {
    expect(staysOverlap('2026-11-11', '2026-11-13', '2026-11-13', '2026-11-15')).toBe(false)
    expect(staysOverlap('2026-11-11', '2026-11-14', '2026-11-13', '2026-11-15')).toBe(true)
  })

  it('blocks an overlapping stay in the same room and allows an edit of itself', () => {
    const existing = [booking({ id: 'a', room: '201', checkIn: '2026-11-11', checkOut: '2026-11-13', guestName: 'Mario' })]
    const input: BookingInput = {
      source: 'BDC',
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

  it('rejects a stay that crosses the period boundary', () => {
    const input: BookingInput = {
      source: '',
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
      quanDuy: 300,
      thuy: 300,
    })
    expect(computeRevenue([{ net: 101, paid: true }], [])).toEqual({
      doanhThu: 101,
      doanhThuUocTinh: 101,
      chiPhi: 0,
      loiNhuan: 101,
      quanDuy: 51,
      thuy: 50,
    })
  })
})
