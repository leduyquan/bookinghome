import type { InputHTMLAttributes } from 'react'

import { FormField } from '@/components/common/form-field'
import { fieldClassName } from '@/lib/utils'

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  required?: boolean
}

export function FormInput({ id, label, error, required, className, ...props }: FormInputProps) {
  return (
    <FormField id={id} label={label} error={error} required={required}>
      <input id={id} className={fieldClassName + (className ? ` ${className}` : '')} aria-invalid={Boolean(error)} {...props} />
    </FormField>
  )
}
