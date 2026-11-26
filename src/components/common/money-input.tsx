import { useEffect, useState } from 'react'

import { FormField } from '@/components/common/form-field'
import { formatGrouped } from '@/domain/money'
import { fieldClassName } from '@/lib/utils'

type MoneyInputProps = {
  id: string
  label: string
  value: number | null
  onChange: (value: number | null) => void
  error?: string
  required?: boolean
  disabled?: boolean
  allowEmpty?: boolean
}

export function MoneyInput({ id, label, value, onChange, error, required, disabled, allowEmpty = true }: MoneyInputProps) {
  const [text, setText] = useState(value === null ? '' : formatGrouped(value))

  useEffect(() => {
    setText(value === null ? '' : formatGrouped(value))
  }, [value])

  return (
    <FormField id={id} label={label} error={error} required={required}>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          className={`${fieldClassName} pr-8`}
          aria-invalid={Boolean(error)}
          value={text}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12)
            if (!digits) {
              setText('')
              onChange(allowEmpty ? null : 0)
              return
            }
            const amount = Number(digits)
            setText(formatGrouped(amount))
            onChange(amount)
          }}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-neutral-700">đ</span>
      </div>
    </FormField>
  )
}
