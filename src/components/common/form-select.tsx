import { FormField } from '@/components/common/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const BLANK = '__blank__'

export type SelectOption = {
  value: string
  label: string
}

type FormSelectProps = {
  id?: string
  label: string
  placeholder?: string
  value: string
  options: SelectOption[]
  error?: string
  required?: boolean
  onValueChange: (value: string) => void
}

export function FormSelect({ id, label, placeholder = 'Chọn', value, options, error, required, onValueChange }: FormSelectProps) {
  const hasBlank = options.some((option) => option.value === '')
  const current = value === '' ? (hasBlank ? BLANK : undefined) : value

  return (
    <FormField id={id} label={label} error={error} required={required}>
      <Select value={current} onValueChange={(next) => onValueChange(next === BLANK ? '' : next)}>
        <SelectTrigger id={id} aria-invalid={Boolean(error)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value || BLANK} value={option.value === '' ? BLANK : option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}
