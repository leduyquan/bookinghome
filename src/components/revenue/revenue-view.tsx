import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useMemo } from 'react'

import { LedgerTable } from '@/components/common/ledger-table'
import { formatVnd } from '@/domain/money'
import type { Revenue } from '@/types'

const columnHelper = createColumnHelper<Revenue>()

export function RevenueView({ revenue }: { revenue: Revenue }) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('doanhThu', {
        header: 'Doanh thu',
        cell: (info) => <MoneyCell amount={info.getValue()} />,
      }),
      columnHelper.accessor('chiPhi', {
        header: 'Chi phí',
        cell: (info) => <MoneyCell amount={info.getValue()} />,
      }),
      columnHelper.accessor('loiNhuan', {
        header: 'Lợi nhuận',
        cell: (info) => <MoneyCell amount={info.getValue()} />,
      }),
      columnHelper.accessor('quanDuy', {
        header: 'Quân Duy (50%)',
        cell: (info) => <MoneyCell amount={info.getValue()} />,
      }),
      columnHelper.accessor('thuy', {
        header: 'Thùy (50%)',
        cell: (info) => <MoneyCell amount={info.getValue()} />,
      }),
    ],
    [],
  )
  const table = useReactTable({ data: [revenue], columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-700">
        Doanh thu là tổng Giá thu. Chi phí là tổng mục Chi phí vận hành. Lợi nhuận chia đôi cho Quân Duy và Thùy.
      </p>
      <LedgerTable
        table={table}
        empty="Chưa có doanh thu trong kỳ này."
        minWidth="min-w-[720px]"
        alignRight={['doanhThu', 'chiPhi', 'loiNhuan', 'quanDuy', 'thuy']}
      />
    </div>
  )
}

function MoneyCell({ amount }: { amount: number }) {
  return <span className={amount < 0 ? 'font-semibold text-red-700' : 'font-semibold'}>{formatVnd(amount)}</span>
}
