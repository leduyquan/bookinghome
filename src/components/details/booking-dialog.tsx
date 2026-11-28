import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form'
import { z } from 'zod'

import { FormInput } from '@/components/common/form-input'
import { FormSelect } from '@/components/common/form-select'
import { FormTextarea } from '@/components/common/form-textarea'
import { MoneyInput } from '@/components/common/money-input'
import { StayRangeField } from '@/components/common/stay-range-field'
import { Button } from '@/components/ui/button'
import { DialogShell } from '@/components/ui/dialog-shell'
import { ROOMS, SOURCES } from '@/constants'
import { findOverlap } from '@/domain/booking'
import { nightsBetween } from '@/domain/dates'
import { canonicalSource } from '@/constants'
import { formatVnd, pricePerNight } from '@/domain/money'
import type { Period } from '@/domain/period'
import { UnauthorizedError, errorMessage } from '@/lib/errors'
import { isRoomId, isSource, type Booking, type BookingInput, type RoomId } from '@/types'

const schema = z
  .object({
    source: z.string(),
    guestName: z.string(),
    checkIn: z.string(),
    checkOut: z.string(),
    room: z.string(),
    total: z.number({ invalid_type_error: 'Nhập tổng giá' }).int().min(0, 'Tổng giá phải là số nguyên không âm'),
    cost: z.number({ invalid_type_error: 'Nhập chi phí' }).int().min(0, 'Chi phí phải là số nguyên không âm'),
    paid: z.boolean(),
    note: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!isSource(value.source)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['source'], message: 'Chọn nguồn' })
    if (!value.guestName.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['guestName'], message: 'Nhập tên khách' })
    if (!value.checkIn) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['checkIn'], message: 'Chọn ngày nhận phòng' })
    if (value.checkIn && !value.checkOut) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['checkOut'], message: 'Chọn ngày trả phòng' })
    }
    if (!isRoomId(value.room)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['room'], message: 'Chọn phòng' })
  })

type FormValues = {
  source: string
  guestName: string
  checkIn: string
  checkOut: string
  room: string
  total: number | null
  cost: number | null
  paid: boolean
  note: string
}

const emptyValues: FormValues = {
  source: 'Khách lẻ',
  guestName: '',
  checkIn: '',
  checkOut: '',
  room: '',
  total: null,
  cost: 0,
  paid: false,
  note: '',
}

export type BookingSeed = {
  room: RoomId
  checkIn: string
}

type BookingDialogProps = {
  open: boolean
  period: Period
  bookings: Booking[]
  initial?: Booking | null
  seed?: BookingSeed | null
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: BookingInput) => Promise<void>
}

export function BookingDialog({ open, period, bookings, initial, seed, pending, onOpenChange, onSubmit }: BookingDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const { control, register, handleSubmit, reset, setError, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: emptyValues,
  })
  const checkIn = useWatch({ control, name: 'checkIn' })
  const checkOut = useWatch({ control, name: 'checkOut' })
  const total = useWatch({ control, name: 'total' })
  const cost = useWatch({ control, name: 'cost' })
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0
  const nightly = nights > 0 && typeof total === 'number' ? pricePerNight(total, nights) : 0
  const net = typeof total === 'number' ? total - (typeof cost === 'number' ? cost : 0) : 0

  useEffect(() => {
    if (!open) return
    setFormError(null)
    reset(
      initial
        ? {
            source: canonicalSource(initial.source),
            guestName: initial.guestName,
            checkIn: initial.checkIn,
            checkOut: initial.checkOut,
            room: initial.room,
            total: initial.total,
            cost: initial.cost,
            paid: initial.paid,
            note: initial.note,
          }
        : { ...emptyValues, room: seed?.room ?? '', checkIn: seed?.checkIn ?? '' },
    )
  }, [open, initial, seed, reset])

  return (
    <DialogShell
      open={open}
      className="max-w-lg"
      title={initial ? 'Sửa booking' : 'Tạo booking'}
      onOpenChange={onOpenChange}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async (values) => {
          if (!isSource(values.source) || !isRoomId(values.room) || values.total === null || values.cost === null) return
          const input: BookingInput = {
            id: initial?.id,
            source: values.source,
            guestName: values.guestName,
            checkIn: values.checkIn,
            checkOut: values.checkOut,
            room: values.room,
            total: values.total,
            cost: values.cost,
            paid: values.paid,
            note: values.note,
            locked: false,
            settled: initial?.settled === true,
          }
          const clash = findOverlap(bookings, input.room, input.checkIn, input.checkOut, initial?.id)
          if (clash) {
            setError('room', { message: `Phòng ${input.room} đã có ${clash.locked ? 'khóa' : clash.guestName} trong các đêm này` })
            return
          }
          setFormError(null)
          try {
            await onSubmit(input)
          } catch (error) {
            if (error instanceof UnauthorizedError) return
            setFormError(errorMessage(error))
          }
        })}
      >
        {formError ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput
            id="booking-guest"
            label="Tên khách"
            required
            error={formState.errors.guestName?.message}
            {...register('guestName')}
          />
          <Controller
            control={control}
            name="source"
            render={({ field }) => (
              <FormSelect
                id="booking-source"
                label="Nguồn"
                value={field.value}
                error={formState.errors.source?.message}
                options={[{ value: '', label: 'Chọn nguồn' }, ...SOURCES.map((item) => ({ value: item, label: item }))]}
                onValueChange={(next) => {
                  field.onChange(next)
                  setValue('paid', next === 'Agoda')
                }}
              />
            )}
          />
        </div>
        <StayRangeField
          checkIn={checkIn}
          checkOut={checkOut}
          min={period.start}
          max={period.end}
          checkInError={formState.errors.checkIn?.message}
          checkOutError={formState.errors.checkOut?.message}
          onChange={(range) => {
            setValue('checkIn', range.checkIn, { shouldValidate: formState.isSubmitted })
            setValue('checkOut', range.checkOut, { shouldValidate: formState.isSubmitted })
          }}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            control={control}
            name="room"
            render={({ field }) => (
              <FormSelect
                id="booking-room"
                label="Phòng"
                required
                placeholder="Chọn phòng"
                value={field.value}
                error={formState.errors.room?.message}
                options={[
                  { value: '', label: 'Chọn phòng' },
                  ...ROOMS.map((room) => ({ value: room.id, label: `${room.id} · ${room.type}` })),
                ]}
                onValueChange={field.onChange}
              />
            )}
          />
          <FormInput id="booking-nights" label="Số đêm" value={nights > 0 ? String(nights) : ''} disabled />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            control={control}
            name="total"
            render={({ field }) => (
              <MoneyInput
                id="booking-total"
                label="Tổng giá"
                required
                value={field.value}
                error={formState.errors.total?.message}
                onChange={field.onChange}
              />
            )}
          />
          <FormInput id="booking-price" label="Giá bán" value={nights > 0 && typeof total === 'number' ? formatVnd(nightly) : ''} disabled />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            control={control}
            name="cost"
            render={({ field }) => (
              <MoneyInput
                id="booking-cost"
                label="Chi phí"
                allowEmpty={false}
                value={field.value}
                error={formState.errors.cost?.message}
                onChange={field.onChange}
              />
            )}
          />
          <FormInput id="booking-net" label="Giá thu" value={typeof total === 'number' ? formatVnd(net) : ''} disabled />
        </div>
        <Controller
          control={control}
          name="paid"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <span id="booking-paid-label" className="text-sm leading-5 font-semibold whitespace-nowrap text-neutral-900">
                Thanh toán?
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                aria-labelledby="booking-paid-label"
                onClick={() => field.onChange(!field.value)}
                className={`relative inline-flex h-6 w-[3.8rem] shrink-0 items-center rounded-full text-xs font-semibold text-white ${field.value ? 'bg-green-700' : 'bg-orange-500'}`}
              >
                <span
                  className={`pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${field.value ? 'translate-x-9' : 'translate-x-0'}`}
                />
                <span className={`pointer-events-none w-full ${field.value ? 'pl-2 text-left' : 'pr-2 text-right'}`}>
                  {field.value ? 'Yes' : 'No'}
                </span>
              </button>
            </div>
          )}
        />
        <FormTextarea id="booking-note" label="Ghi chú" {...register('note')} />
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
