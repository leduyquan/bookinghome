import type { TextareaHTMLAttributes } from 'react'

import { FormField } from '@/components/common/form-field'

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
}

export function FormTextarea({ id, label, error, ...props }: FormTextareaProps) {
  return (
    <FormField id={id} label={label} error={error}>
      <textarea
        id={id}
        className="min-h-20 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary"
        aria-invalid={Boolean(error)}
        {...props}
      />
    </FormField>
  )
}
