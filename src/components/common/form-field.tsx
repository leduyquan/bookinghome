import type { ReactNode } from 'react'

type FormFieldProps = {
  id?: string
  label: string
  error?: string
  required?: boolean
  children: ReactNode
}

export function FormField({ id, label, error, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-neutral-900">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      {children}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
