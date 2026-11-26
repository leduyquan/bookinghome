import { addDays, format, parseISO } from 'date-fns'

export function isRealIso(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const date = parseISO(iso)
  return !Number.isNaN(date.getTime()) && format(date, 'yyyy-MM-dd') === iso
}

export function formatDay(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy')
}

export function formatShort(iso: string): string {
  return format(parseISO(iso), 'dd/MM')
}

export function toIso(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!isRealIso(checkIn) || !isRealIso(checkOut)) return 0
  const start = parseISO(checkIn).getTime()
  const end = parseISO(checkOut).getTime()
  return Math.round((end - start) / 86_400_000)
}

export function isWithinPeriod(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end
}

export function addDaysIso(iso: string, days: number): string {
  return format(addDays(parseISO(iso), days), 'yyyy-MM-dd')
}

/** Checkout is the morning after the last night, so it may be the day after the period ends. */
export function latestCheckout(periodEnd: string): string {
  return addDaysIso(periodEnd, 1)
}

export function isCheckoutInPeriod(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= latestCheckout(end)
}
