import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmModal } from '@/components/common/confirm-modal'
import { LedgerTable } from '@/components/common/ledger-table'
import { ExpenseDialog } from '@/components/expenses/expense-dialog'
import { Button } from '@/components/ui/button'
import { formatDay } from '@/domain/dates'
import { sortExpenses } from '@/domain/expense'
import { formatVnd } from '@/domain/money'
import type { Period } from '@/domain/period'
import { UnauthorizedError, errorMessage } from '@/lib/errors'
import { useLedger } from '@/lib/ledger'
import { requirePassword } from '@/lib/session'
import { ledgerClient } from '@/lib/sheets-client'
import type { Expense, ExpenseInput, PeriodData } from '@/types'

const columnHelper = createColumnHelper<Expense>()

export function ExpensesView({ period, data }: { period: Period; data: PeriodData }) {
  const { lock } = useLedger()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Expense | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const rows = useMemo(() => sortExpenses(data.expenses), [data.expenses])
  const total = rows.reduce((sum, row) => sum + row.amount, 0)

  function remember(next: PeriodData) {
    queryClient.setQueryData(['period', period.sheetName], next)
  }

  const save = useMutation({
    mutationFn: (input: ExpenseInput) => ledgerClient.saveExpense(requirePassword(), period.sheetName, input),
    onSuccess: remember,
  })
  const remove = useMutation({
    mutationFn: (id: string) => ledgerClient.deleteExpense(requirePassword(), period.sheetName, id),
    onSuccess: remember,
  })

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', { header: 'Chi phí' }),
      columnHelper.accessor('detail', { header: 'Chi tiết', cell: (info) => info.getValue() || '—' }),
      columnHelper.accessor('date', { header: 'Ngày chi', cell: (info) => formatDay(info.getValue()) }),
      columnHelper.accessor('amount', { header: 'Số tiền', cell: (info) => formatVnd(info.getValue()) }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label={`Sửa ${info.row.original.name}`} onClick={() => setEditing(info.row.original)}>
              <Pencil className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label={`Xóa ${info.row.original.name}`} onClick={() => setDeleteTarget(info.row.original)}>
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
        <Button onClick={() => setCreating(true)}>Tạo chi phí</Button>
      </div>
      <LedgerTable
        table={table}
        empty="Chưa có chi phí trong kỳ này."
        alignRight={['amount']}
        footer={
          <tr>
            <td className="px-3 py-2" colSpan={3}>
              Tổng
            </td>
            <td className="px-3 py-2 text-right">{formatVnd(total)}</td>
            <td />
          </tr>
        }
      />
      <ExpenseDialog
        open={creating || editing !== null}
        period={period}
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
            toast.success(input.id ? 'Đã cập nhật chi phí' : 'Đã tạo chi phí')
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
        title="Xóa chi phí"
        description={deleteTarget ? `Xóa chi phí ${deleteTarget.name}?` : ''}
        pending={remove.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={() => {
          if (!deleteTarget) return
          void remove.mutateAsync(deleteTarget.id).then(
            () => {
              toast.success('Đã xóa chi phí')
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
