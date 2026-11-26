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
  root: 'booking-day-picker',
  months: 'flex flex-wrap',
  month: 'relative',
  month_caption: 'flex items-center justify-center text-sm font-semibold text-neutral-900',
  caption_label: 'text-sm font-semibold text-neutral-900',
  weekday: 'text-[11px] font-semibold tracking-wide text-neutral-700 uppercase',
  day: 'p-0 text-center',
  today: 'font-semibold text-stone-900',
}
