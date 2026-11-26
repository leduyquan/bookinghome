import { formatDay, isRealIso } from '@/domain/dates'

export type Period = {
  sheetName: string
  start: string
  end: string
  label: string
}

const PERIOD_NAME = /^(\d{1,2})[./](\d{1,2})[./](\d{4})-(\d{1,2})[./](\d{1,2})[./](\d{4})$/

function partsToIso(day: number, month: number, year: number): string | null {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return isRealIso(iso) ? iso : null
}

export function parsePeriodName(name: string): Period | null {
  const sheetName = name.trim()
  const match = sheetName.match(PERIOD_NAME)
  if (!match) return null

  const start = partsToIso(Number(match[1]), Number(match[2]), Number(match[3]))
  const end = partsToIso(Number(match[4]), Number(match[5]), Number(match[6]))
  if (!start || !end || start > end) return null

  return {
    sheetName,
    start,
    end,
    label: `${formatDay(start)} - ${formatDay(end)}`,
  }
}

export function pickPeriod(periods: Period[], stored: string | null, today: string): string | null {
  if (stored && periods.some((period) => period.sheetName === stored)) return stored
  const containing = periods.find((period) => today >= period.start && today <= period.end)
  return containing?.sheetName ?? periods[0]?.sheetName ?? null
}
