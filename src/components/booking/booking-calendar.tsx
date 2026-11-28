import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import { toast } from 'sonner'

import { BookingDialog, type BookingSeed } from '@/components/details/booking-dialog'
import { PopoverClose, PopoverContent, PopoverRoot, PopoverTrigger } from '@/components/ui/popover'
import { ROOMS, WEEKDAY_LABELS, sourceLink, sourceMark } from '@/constants'
import { fortnightsCovering, halfCellsForRoom, type HalfCell } from '@/domain/calendar'
import { addDaysIso, formatShort, periodHalves } from '@/domain/dates'
import type { Period } from '@/domain/period'
import { UnauthorizedError, errorMessage } from '@/lib/errors'
import { useLedger } from '@/lib/ledger'
import { requirePassword } from '@/lib/session'
import { ledgerClient } from '@/lib/sheets-client'
import type { Booking, BookingInput, PeriodData, RoomId } from '@/types'

export function BookingCalendar({ period, bookings }: { period: Period; bookings: Booking[] }) {
  const { lock } = useLedger()
  const queryClient = useQueryClient()
  const [seed, setSeed] = useState<BookingSeed | null>(null)
  const [editing, setEditing] = useState<Booking | null>(null)
  const [locking, setLocking] = useState<{ room: RoomId; iso: string } | null>(null)
  const halves = periodHalves(period.start, period.end)

  const save = useMutation({
    mutationFn: (input: BookingInput) => ledgerClient.saveBooking(requirePassword(), period.sheetName, input),
    onSuccess: (next: PeriodData) => queryClient.setQueryData(['period', period.sheetName], next),
  })

  async function lockNight(room: RoomId, iso: string) {
    setLocking({ room, iso })
    try {
      await save.mutateAsync({
        source: '',
        guestName: '',
        checkIn: iso,
        checkOut: addDaysIso(iso, 1),
        room,
        total: 0,
        cost: 0,
        paid: true,
        note: '',
        locked: true,
      })
      toast.success('Đã khóa phòng')
    } catch (error) {
      if (error instanceof UnauthorizedError) lock()
      else toast.error(errorMessage(error))
    } finally {
      setLocking(null)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* <div className="flex flex-wrap gap-3 text-xs text-neutral-800 sm:gap-5 sm:text-sm">
        {ROOMS.map((room) => (
          <span key={room.id} className="inline-flex items-center gap-2">
            <span className="size-3.5 rounded-sm sm:size-4" style={{ backgroundColor: room.header }} />
            {room.id} · {room.type}
          </span>
        ))}
      </div> */}
      <div className="flex min-w-0 flex-col gap-5">
        {halves.map((half) => {
          const rows = fortnightsCovering(half.start, half.end)
          return (
            <section key={half.start} className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <div className="bg-primary-400 px-3 py-1.5 text-center text-xs font-semibold text-white sm:text-sm">
                {formatShort(half.start)} – {formatShort(half.end)}
              </div>
              <div className="occ-scroll">
              <table className="w-full min-w-[40rem] table-fixed border-collapse text-[10px] sm:text-xs">
                <colgroup>
                  <col className="w-9 sm:w-12" />
                  <col className="w-10 sm:w-14" />
                  {Array.from({ length: (rows[0]?.length ?? 0) * 2 }, (_, index) => (
                    <col key={index} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="bg-primary-400 text-center font-semibold text-white">
                    <th className="h-6 w-9 border border-primary-300 sm:w-12">ROOM</th>
                    <th className="w-10 border border-primary-300 sm:w-14">TYPE</th>
                    {rows[0]?.map((day, index) => (
                      <th key={`${day.iso}-head`} colSpan={2} className="border border-primary-300 px-0.5">
                        {WEEKDAY_LABELS[index % 7]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((fortnight) => (
                    <Fragment key={fortnight[0]?.iso}>
                      <tr className="bg-primary-500 text-center text-white">
                        <th className="h-5 border border-neutral-200 bg-neutral-100" />
                        <th className="border border-neutral-200 bg-neutral-100" />
                        {fortnight.map((day) => (
                          <th
                            key={day.iso}
                            colSpan={2}
                            className={`border border-neutral-200 text-[9px] font-semibold sm:text-[11px] ${day.inPeriod ? 'text-neutral-50' : 'text-neutral-800'}`}
                          >
                            {formatShort(day.iso)}
                          </th>
                        ))}
                      </tr>
                      {ROOMS.map((room) => {
                        const cells = halfCellsForRoom(fortnight, bookings, room.id)
                        return (
                          <tr key={room.id}>
                            <th
                              className="h-7 border border-neutral-200 text-[10px] sm:text-xs"
                              style={{ backgroundColor: room.header, color: room.label }}
                            >
                              {room.id}
                            </th>
                            <th
                              className="border border-neutral-200 text-[9px] sm:text-[11px]"
                              style={{ backgroundColor: room.header, color: room.label }}
                            >
                              {room.type}
                            </th>
                            {cells.map((cell, index) => {
                              if (cell.kind === 'stay' && cell.booking.locked) {
                                return (
                                  <td
                                    key={`${room.id}-${index}`}
                                    colSpan={cell.span}
                                    className="h-px overflow-hidden border border-neutral-200 bg-neutral-950 p-0 text-center align-middle text-[10px] font-semibold text-white"
                                  >
                                    <div className="flex h-full min-h-7 items-center justify-center px-0.5">Khóa</div>
                                  </td>
                                )
                              }
                              if (cell.kind === 'stay') {
                                return (
                                  <td
                                    key={`${room.id}-${index}`}
                                    colSpan={cell.span}
                                    className="h-px overflow-hidden border border-neutral-200 p-0 align-middle"
                                    style={{ backgroundColor: room.cell, color: room.ink }}
                                  >
                                    <StayMenu booking={cell.booking} onEdit={() => setEditing(cell.booking)} />
                                  </td>
                                )
                              }
                              if ((cell.kind === 'empty' || cell.kind === 'gap') && isLockingCell(cell, room.id, locking)) {
                                return (
                                  <td
                                    key={`${room.id}-${index}`}
                                    colSpan={cell.span}
                                    className="h-px border border-neutral-200 bg-white p-0"
                                  >
                                    <div className="flex h-full min-h-7 items-center justify-center" role="status" aria-label="Đang khóa">
                                      <span className="size-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-primary" />
                                    </div>
                                  </td>
                                )
                              }
                              if (cell.kind === 'empty' || cell.kind === 'gap') {
                                return (
                                  <td
                                    key={`${room.id}-${index}`}
                                    colSpan={cell.span}
                                    className="h-px border border-neutral-200 bg-white p-0"
                                  >
                                    {cell.kind === 'empty' || cell.bookable ? (
                                      <EmptyNight
                                        disabled={save.isPending}
                                        onBook={() => setSeed({ room: room.id, checkIn: cell.iso })}
                                        onLock={() => void lockNight(room.id, cell.iso)}
                                      />
                                    ) : null}
                                  </td>
                                )
                              }
                              return (
                                <td
                                  key={`${room.id}-${index}`}
                                  colSpan={cell.span}
                                  className="border border-neutral-200 bg-neutral-100"
                                />
                              )
                            })}
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              </div>
            </section>
          )
        })}
      </div>
      <BookingDialog
        open={seed !== null || editing !== null}
        period={period}
        bookings={bookings}
        initial={editing}
        seed={seed}
        pending={save.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setSeed(null)
            setEditing(null)
          }
        }}
        onSubmit={async (input) => {
          try {
            await save.mutateAsync(input)
            toast.success(input.id ? 'Đã cập nhật booking' : 'Đã tạo booking')
            setSeed(null)
            setEditing(null)
          } catch (error) {
            if (error instanceof UnauthorizedError) lock()
            throw error
          }
        }}
      />
    </div>
  )
}

function isLockingCell(cell: HalfCell, room: RoomId, locking: { room: RoomId; iso: string } | null) {
  if (!locking || locking.room !== room || (cell.kind !== 'empty' && cell.kind !== 'gap')) return false
  if (cell.iso === locking.iso) return cell.kind === 'empty' || cell.bookable
  return cell.kind === 'gap' && !cell.bookable && cell.iso === addDaysIso(locking.iso, 1)
}

const menuItemClass =
  'rounded-sm px-2 py-2 text-left text-sm font-normal text-black outline-none hover:bg-primary-50 focus-visible:bg-primary-50'

function StayMenu({ booking, onEdit }: { booking: Booking; onEdit: () => void }) {
  const mark = sourceMark(booking.source)
  const link = sourceLink(booking.source)
  return (
    <PopoverRoot>
      <PopoverTrigger
        type="button"
        aria-label={booking.guestName}
        className="relative block h-full min-h-7 w-full cursor-pointer bg-transparent p-0 text-inherit"
      >
        {mark ? (
          <span className="absolute top-0 left-0 flex h-1/2 w-3 items-center justify-center bg-black/10 text-[9px] leading-none font-bold">
            {mark}
          </span>
        ) : null}
        <span className={`flex h-full min-h-7 w-full min-w-0 flex-col justify-center text-center ${mark ? 'pr-0.5 pl-4' : 'px-0.5'}`}>
          <span title={booking.guestName} className="w-full min-w-0 truncate text-[10px] leading-3 font-semibold">
            {booking.guestName}
          </span>
          {booking.note ? <span className="w-full min-w-0 truncate text-[9px] leading-3">{booking.note}</span> : null}
        </span>
      </PopoverTrigger>
      <PopoverContent className="flex min-w-40 flex-col overflow-hidden rounded-md p-1 text-black shadow-lg">
        <PopoverClose type="button" className={menuItemClass} onClick={onEdit}>
          Edit
        </PopoverClose>
        {link ? (
          <PopoverClose asChild>
            <a href={link} target="_blank" rel="noopener noreferrer" className={menuItemClass}>
              Link
            </a>
          </PopoverClose>
        ) : null}
      </PopoverContent>
    </PopoverRoot>
  )
}

function EmptyNight({ onBook, onLock, disabled }: { onBook: () => void; onLock: () => void; disabled: boolean }) {
  return (
    <PopoverRoot>
      <PopoverTrigger className="block h-full min-h-7 w-full cursor-pointer hover:bg-primary-50 focus-visible:bg-primary-50" aria-label="Thêm" />
      <PopoverContent className="flex min-w-40 flex-col overflow-hidden rounded-md p-1 text-black shadow-lg">
        <PopoverClose type="button" className={menuItemClass} onClick={onBook}>
          Booking
        </PopoverClose>
        <PopoverClose
          type="button"
          disabled={disabled}
          className={`${menuItemClass} disabled:pointer-events-none disabled:opacity-50`}
          onClick={onLock}
        >
          Khóa
        </PopoverClose>
      </PopoverContent>
    </PopoverRoot>
  )
}
