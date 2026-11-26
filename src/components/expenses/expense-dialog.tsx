import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'

import { DateField } from '@/components/common/date-field'
import { FormInput } from '@/components/common/form-input'
import { FormTextarea } from '@/components/common/form-textarea'
import { MoneyInput } from '@/components/common/money-input'
import { Button } from '@/components/ui/button'
import { DialogShell } from '@/components/ui/dialog-shell'
import type { Period } from '@/domain/period'
import { UnauthorizedError, errorMessage } from '@/lib/errors'
import type { Expense, ExpenseInput } from '@/types'

const schema = z
  .object({
    name: z.string(),
    detail: z.string(),
    date: z.string(),
    amount: z.number({ invalid_type_error: 'Nhập số tiền' }).int().min(0, 'Số tiền phải là số nguyên không âm'),
  })
  .superRefine((value, ctx) => {
    if (!value.name.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Nhập tên chi phí' })
    if (!value.date) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date'], message: 'Chọn ngày chi' })
  })

type FormValues = {
  name: string
  detail: string
  date: string
  amount: number | null
}

const emptyValues: FormValues = { name: '', detail: '', date: '', amount: null }

type ExpenseDialogProps = {
  open: boolean
  period: Period
  initial?: Expense | null
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: ExpenseInput) => Promise<void>
}

export function ExpenseDialog({ open, period, initial, pending, onOpenChange, onSubmit }: ExpenseDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const { control, register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    reset(
      initial
        ? { name: initial.name, detail: initial.detail, date: initial.date, amount: initial.amount }
        : emptyValues,
    )
  }, [open, initial, reset])

  return (
    <DialogShell open={open} className="max-w-lg" title={initial ? 'Sửa chi phí' : 'Tạo chi phí'} onOpenChange={onOpenChange}>
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async (values) => {
          if (values.amount === null) return
          setFormError(null)
          try {
            await onSubmit({
              id: initial?.id,
              name: values.name,
              detail: values.detail,
              date: values.date,
              amount: values.amount,
            })
          } catch (error) {
            if (error instanceof UnauthorizedError) return
            setFormError(errorMessage(error))
          }
        })}
      >
        {formError ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p> : null}
        <FormInput id="expense-name" label="Chi phí" required error={formState.errors.name?.message} {...register('name')} />
        <FormTextarea id="expense-detail" label="Chi tiết" {...register('detail')} />
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <DateField
              id="expense-date"
              label="Ngày chi"
              required
              value={field.value}
              min={period.start}
              max={period.end}
              error={formState.errors.date?.message}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <MoneyInput
              id="expense-amount"
              label="Số tiền"
              required
              value={field.value}
              error={formState.errors.amount?.message}
              onChange={field.onChange}
            />
          )}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Hủy
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </form>
    </DialogShell>
  )
}
