import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmModal } from '@/components/common/confirm-modal'
import { LedgerTable } from '@/components/common/ledger-table'
import { BookingDialog } from '@/components/details/booking-dialog'
import { Button } from '@/components/ui/button'
import { sortBookings } from '@/domain/booking'
import { formatDay } from '@/domain/dates'
import { formatVnd } from '@/domain/money'
import type { Period } from '@/domain/period'
import { UnauthorizedError, errorMessage } from '@/lib/errors'
import { useLedger } from '@/lib/ledger'
import { requirePassword } from '@/lib/session'
import { ledgerClient } from '@/lib/sheets-client'
import type { Booking, BookingInput, PeriodData } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const columnHelper = createColumnHelper<Booking>()

export function DetailsView({ period, data }: { period: Period; data: PeriodData }) {
  const { lock } = useLedger()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Booking | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null)
  const rows = useMemo(() => sortBookings(data.bookings), [data.bookings])
  const totals = useMemo(
    () => ({
      total: rows.reduce((sum, row) => sum + row.total, 0),
      cost: rows.reduce((sum, row) => sum + row.cost, 0),
      net: rows.reduce((sum, row) => sum + row.net, 0),
    }),
    [rows],
  )

  function remember(next: PeriodData) {
    queryClient.setQueryData(['period', period.sheetName], next)
  }

  const save = useMutation({
    mutationFn: (input: BookingInput) => ledgerClient.saveBooking(requirePassword(), period.sheetName, input),
    onSuccess: remember,
  })
  const remove = useMutation({
    mutationFn: (id: string) => ledgerClient.deleteBooking(requirePassword(), period.sheetName, id),
    onSuccess: remember,
  })

  const columns = useMemo(
    () => [
      columnHelper.display({ id: 'stt', header: 'STT', cell: (info) => info.row.index + 1 }),
      columnHelper.accessor('source', { header: 'Nguồn', cell: (info) => info.getValue() || '—' }),
      columnHelper.accessor('guestName', { header: 'Tên khách' }),
      columnHelper.accessor('checkIn', { header: 'Check-in', cell: (info) => formatDay(info.getValue()) }),
      columnHelper.accessor('checkOut', { header: 'Check-out', cell: (info) => formatDay(info.getValue()) }),
      columnHelper.accessor('room', { header: 'Phòng' }),
      columnHelper.accessor('nights', { header: 'Số đêm' }),
      columnHelper.accessor('pricePerNight', { header: 'Giá bán', cell: (info) => formatVnd(info.getValue()) }),
      columnHelper.accessor('total', { header: 'Tổng cộng', cell: (info) => formatVnd(info.getValue()) }),
      columnHelper.accessor('cost', { header: 'Chi phí', cell: (info) => formatVnd(info.getValue()) }),
      columnHelper.accessor('net', { header: 'Giá thu', cell: (info) => formatVnd(info.getValue()) }),
      columnHelper.accessor('note', { header: 'Ghi chú', cell: (info) => info.getValue() || '—' }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label={`Sửa ${info.row.original.guestName}`} onClick={() => setEditing(info.row.original)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Xóa ${info.row.original.guestName}`}
              onClick={() => setDeleteTarget(info.row.original)}
            >
              <Trash2 className="size-4 text-red-700" />
            </Button>
          </div>
        ),
      }),
    ],
    [],
  )

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button className="min-w-[7.5rem]" onClick={() => setCreating(true)}>Tạo booking</Button>
      </div>
      <LedgerTable
        table={table}
        empty="Chưa có booking trong kỳ này."
        minWidth="min-w-[1100px]"
        alignRight={['nights', 'pricePerNight', 'total', 'cost', 'net']}
        footer={
          <tr>
            <td className="px-3 py-2" colSpan={8}>
              Tổng
            </td>
            <td className="px-3 py-2 text-right">{formatVnd(totals.total)}</td>
            <td className="px-3 py-2 text-right">{formatVnd(totals.cost)}</td>
            <td className="px-3 py-2 text-right">{formatVnd(totals.net)}</td>
            <td colSpan={2} />
          </tr>
        }
      />
      <BookingDialog
        open={creating || editing !== null}
        period={period}
        bookings={data.bookings}
        initial={editing}
        pending={save.isPending}
        onOpenChange={(open) => {
          if (open) return
          setCreating(false)
          setEditing(null)
        }}
        onSubmit={async (input) => {
          try {
            await save.mutateAsync(input)
            toast.success(input.id ? 'Đã cập nhật booking' : 'Đã tạo booking')
            setCreating(false)
            setEditing(null)
          } catch (error) {
            if (error instanceof UnauthorizedError) lock()
            throw error
          }
        }}
      />
      <ConfirmModal
        open={deleteTarget !== null}
        title="Xóa booking"
        description={deleteTarget ? `Xóa booking của ${deleteTarget.guestName}?` : ''}
        pending={remove.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={() => {
          if (!deleteTarget) return
          void remove.mutateAsync(deleteTarget.id).then(
            () => {
              toast.success('Đã xóa booking')
              setDeleteTarget(null)
            },
            (error: unknown) => {
              if (error instanceof UnauthorizedError) lock()
              else toast.error(errorMessage(error))
            },
          )
        }}
      />
    </div>
  )
}
