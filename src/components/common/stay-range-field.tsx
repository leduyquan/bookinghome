import { CalendarIcon } from 'lucide-react'
import { vi } from 'date-fns/locale'
import { useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'

import { calendarClassNames, calendarComponents, calendarFormatters } from '@/components/common/date-time-picker/calendar-parts'
import { PickerFooter } from '@/components/common/date-time-picker/picker-footer'
import { FormField } from '@/components/common/form-field'
import { PopoverContent, PopoverRoot, PopoverTrigger } from '@/components/ui/popover'
import { formatDay, toIso } from '@/domain/dates'
import { fieldClassName } from '@/lib/utils'

type StayRangeFieldProps = {
  checkIn: string
  checkOut: string
  min: string
  max: string
  checkInError?: string
  checkOutError?: string
  onChange: (value: { checkIn: string; checkOut: string }) => void
}

function parseDay(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

export function StayRangeField({ checkIn, checkOut, min, max, checkInError, checkOutError, onChange }: StayRangeFieldProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>()
  const minDate = parseDay(min)
  const maxDate = parseDay(max)
  const committed: DateRange | undefined = checkIn
    ? { from: parseDay(checkIn), to: checkOut ? parseDay(checkOut) : undefined }
    : undefined
  const from = draft?.from ? toIso(draft.from) : ''
  const to = draft?.to ? toIso(draft.to) : ''
  const canApply = Boolean(from && to && from !== to)

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField id="check-in" label="Check-in" error={checkInError} required>
        <PopoverRoot
          open={open}
          onOpenChange={(next) => {
            if (next) setDraft(committed)
            setOpen(next)
          }}
        >
          <PopoverTrigger asChild>
            <button id="check-in" type="button" className={`${fieldClassName} flex items-center gap-2 text-left`}>
              <CalendarIcon className="size-4 shrink-0 text-primary" />
              <span className={checkIn ? 'text-black' : 'text-neutral-700'}>{checkIn ? formatDay(checkIn) : 'Chọn khoảng ngày'}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <PickerFooter
              applyDisabled={!canApply}
              onCancel={() => setOpen(false)}
              onApply={() => {
                if (!canApply) return
                onChange({ checkIn: from, checkOut: to })
                setOpen(false)
              }}
            >
              <DayPicker
                mode="range"
                locale={vi}
                weekStartsOn={1}
                navLayout="around"
                numberOfMonths={2}
                showOutsideDays
                selected={draft}
                defaultMonth={draft?.from ?? committed?.from ?? minDate}
                startMonth={minDate}
                endMonth={maxDate}
                disabled={{ before: minDate, after: maxDate }}
                components={calendarComponents}
                classNames={calendarClassNames}
                formatters={calendarFormatters}
                onSelect={(range) => {
                  if (!range?.from) {
                    setDraft(undefined)
                    return
                  }
                  const start = toIso(range.from)
                  const end = range.to ? toIso(range.to) : ''
                  setDraft({ from: range.from, to: end && end !== start ? range.to : undefined })
                }}
              />
            </PickerFooter>
          </PopoverContent>
        </PopoverRoot>
      </FormField>
      <FormField id="check-out" label="Check-out" error={checkOutError} required>
        <input
          id="check-out"
          className={fieldClassName}
          value={checkOut ? formatDay(checkOut) : ''}
          placeholder="Chọn ngày trả"
          disabled
        />
      </FormField>
    </div>
  )
}
