import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import { toast } from 'sonner'

import { BookingDialog, type BookingSeed } from '@/components/details/booking-dialog'
import { ROOMS, WEEKDAY_LABELS } from '@/constants'
import { cellsForRoom, groupWeeks, weeksCovering } from '@/domain/calendar'
import { formatShort } from '@/domain/dates'
import type { Period } from '@/domain/period'
import { UnauthorizedError } from '@/lib/errors'
import { useLedger } from '@/lib/ledger'
import { requirePassword } from '@/lib/session'
import { ledgerClient } from '@/lib/sheets-client'
import type { Booking, BookingInput, PeriodData } from '@/types'

export function BookingCalendar({ period, bookings }: { period: Period; bookings: Booking[] }) {
  const { lock } = useLedger()
  const queryClient = useQueryClient()
  const [seed, setSeed] = useState<BookingSeed | null>(null)
  const weeks = weeksCovering(period.start, period.end)
  const blocks = groupWeeks(weeks)

  const save = useMutation({
    mutationFn: (input: BookingInput) => ledgerClient.saveBooking(requirePassword(), period.sheetName, input),
    onSuccess: (next: PeriodData) => queryClient.setQueryData(['period', period.sheetName], next),
  })

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap gap-5 text-sm text-neutral-800">
        {ROOMS.map((room) => (
          <span key={room.id} className="inline-flex items-center gap-2">
            <span className="size-4 rounded-sm" style={{ backgroundColor: room.header }} />
            {room.id} · {room.type}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-6 overflow-x-auto pb-2">
        {blocks.map((block) => {
          const first = block[0]?.[0]?.iso
          const lastWeek = block.at(-1)
          const last = lastWeek?.at(-1)?.iso
          return (
            <section key={first} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <div className="bg-primary-400 px-3 py-1.5 text-sm font-semibold text-white text-center">
                {first && last ? `${formatShort(first)} – ${formatShort(last)}` : ''}
              </div>
              <table className="w-full min-w-[820px] border-collapse text-xs">
                <thead>
                  <tr className="bg-primary-400 text-center font-semibold text-white">
                    <th className="h-6 w-14 border border-primary-300">ROOM</th>
                    <th className="w-16 border border-primary-300">TYPE</th>
                    {WEEKDAY_LABELS.map((label) => (
                      <th key={label} className="border border-primary-300 px-1">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.map((week) => (
                    <Fragment key={week[0]?.iso}>
                      <tr className="bg-primary-500 text-center text-white">
                        <th className="h-6 border border-neutral-200 bg-neutral-100" />
                        <th className="border border-neutral-200 bg-neutral-100" />
                        {week.map((day) => (
                          <th
                            key={day.iso}
                            className={`border border-neutral-200 font-semibold ${day.inPeriod ? 'text-neutral-50' : 'text-neutral-800'}`}
                          >
                            {formatShort(day.iso)}
                          </th>
                        ))}
                      </tr>
                      {ROOMS.map((room) => {
                      const cells = cellsForRoom(week, bookings, room.id)
                      return (
                        <tr key={room.id}>
                          <th className="h-8 border border-neutral-200 text-xs" style={{ backgroundColor: room.header, color: room.label }}>
                            {room.id}
                          </th>
                          <th className="border border-neutral-200 text-[11px]" style={{ backgroundColor: room.header, color: room.label }}>
                            {room.type}
                          </th>
                          {cells.map((cell, index) => {
                            if (cell.kind === 'stay') {
                              return (
                                <td
                                  key={`${room.id}-${index}`}
                                  colSpan={cell.span}
                                  className="border border-neutral-200 px-1.5 py-0.5 text-center align-middle"
                                  style={{ backgroundColor: room.cell, color: room.ink }}
                                >
                                  <div className="truncate text-xs leading-4 font-semibold">{cell.booking.guestName}</div>
                                  {cell.booking.note ? <div className="truncate text-[10px] leading-3">{cell.booking.note}</div> : null}
                                </td>
                              )
                            }
                            if (cell.kind === 'empty') {
                              return (
                                <td key={`${room.id}-${index}`} className="border border-neutral-200 bg-white p-0">
                                  <button
                                    type="button"
                                    className="h-8 w-full cursor-pointer px-1 text-[10px] font-medium text-transparent transition hover:bg-primary-50 hover:text-primary focus-visible:bg-primary-50 focus-visible:text-primary"
                                    onClick={() => setSeed({ room: room.id, checkIn: cell.iso })}
                                  >
                                    Tạo booking
                                  </button>
                                </td>
                              )
                            }
                            return <td key={`${room.id}-${index}`} className="border border-neutral-200 bg-neutral-100" />
                          })}
                        </tr>
                      )
                    })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </section>
          )
        })}
      </div>
      <BookingDialog
        open={seed !== null}
        period={period}
        bookings={bookings}
        seed={seed}
        pending={save.isPending}
        onOpenChange={(open) => {
          if (!open) setSeed(null)
        }}
        onSubmit={async (input) => {
          try {
            await save.mutateAsync(input)
            toast.success('Đã tạo booking')
            setSeed(null)
          } catch (error) {
            if (error instanceof UnauthorizedError) lock()
            throw error
          }
        }}
      />
    </div>
  )
}
