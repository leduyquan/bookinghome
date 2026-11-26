import { CalendarIcon } from 'lucide-react'
import { vi } from 'date-fns/locale'
import { useState } from 'react'
import { DayPicker } from 'react-day-picker'

import { calendarClassNames, calendarComponents, calendarFormatters } from '@/components/common/date-time-picker/calendar-parts'
import { PickerFooter } from '@/components/common/date-time-picker/picker-footer'
import { FormField } from '@/components/common/form-field'
import { PopoverContent, PopoverRoot, PopoverTrigger } from '@/components/ui/popover'
import { formatDay, toIso } from '@/domain/dates'
import { fieldClassName } from '@/lib/utils'

type DateFieldProps = {
  id: string
  label: string
  value: string
  min: string
  max: string
  error?: string
  required?: boolean
  onChange: (value: string) => void
}

function parseDay(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

export function DateField({ id, label, value, min, max, error, required, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date | undefined>()
  const minDate = parseDay(min)
  const maxDate = parseDay(max)

  return (
    <FormField id={id} label={label} error={error} required={required}>
      <PopoverRoot
        open={open}
        onOpenChange={(next) => {
          if (next) setDraft(value ? parseDay(value) : undefined)
          setOpen(next)
        }}
      >
        <PopoverTrigger asChild>
          <button id={id} type="button" className={`${fieldClassName} flex items-center gap-2 text-left`}>
            <CalendarIcon className="size-4 shrink-0 text-primary" />
            <span className={value ? 'text-black' : 'text-neutral-700'}>{value ? formatDay(value) : 'Chọn ngày'}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <PickerFooter
            applyDisabled={!draft}
            onCancel={() => setOpen(false)}
            onApply={() => {
              if (!draft) return
              onChange(toIso(draft))
              setOpen(false)
            }}
          >
            <DayPicker
              mode="single"
              locale={vi}
              weekStartsOn={1}
              navLayout="around"
              showOutsideDays
              selected={draft}
              defaultMonth={draft ?? minDate}
              startMonth={minDate}
              endMonth={maxDate}
              disabled={{ before: minDate, after: maxDate }}
              components={calendarComponents}
              classNames={calendarClassNames}
              formatters={calendarFormatters}
              onSelect={(date) => setDraft(date)}
            />
          </PickerFooter>
        </PopoverContent>
      </PopoverRoot>
    </FormField>
  )
}
