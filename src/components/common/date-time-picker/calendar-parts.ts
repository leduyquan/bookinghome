import type { ClassNames, Formatters } from 'react-day-picker'

import { PickerChevron, PickerDayButton, PickerNavButton } from '@/components/common/date-time-picker/picker-button'

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export const calendarComponents = {
  PreviousMonthButton: PickerNavButton,
  NextMonthButton: PickerNavButton,
  Chevron: PickerChevron,
  DayButton: PickerDayButton,
}

export const calendarFormatters: Partial<Formatters> = {
  formatCaption: (month) => `Tháng ${month.getMonth() + 1}/${month.getFullYear()}`,
  formatWeekdayName: (date) => WEEKDAYS[date.getDay()] ?? '',
}

export const calendarClassNames: Partial<ClassNames> = {
  root: 'rdp-root booking-day-picker',
  months: 'rdp-months flex',
  month: 'rdp-month relative',
  month_caption: 'rdp-month_caption flex h-(--rdp-nav-height) items-center justify-center text-sm font-semibold text-neutral-900',
  caption_label: 'rdp-caption_label text-sm font-semibold text-neutral-900',
  weekday: 'rdp-weekday text-[11px] font-semibold tracking-wide text-neutral-700 uppercase',
  day: 'rdp-day p-0 text-center',
  today: 'rdp-today font-semibold text-neutral-900',
  button_previous: 'rdp-button_previous',
  button_next: 'rdp-button_next',
}
