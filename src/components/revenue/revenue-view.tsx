import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useMemo } from 'react'

import { LedgerTable } from '@/components/common/ledger-table'
import { formatVnd } from '@/domain/money'
import type { Revenue } from '@/types'

const columnHelper = createColumnHelper<Revenue>()

export function RevenueView({ revenue }: { revenue: Revenue }) {
  const rows = useMemo(() => [revenue], [revenue])
  const columns = useMemo(
    () => [
      columnHelper.accessor('doanhThu', {
        header: 'Doanh thu',
        cell: (info) => <MoneyCell amount={info.getValue()} />,
      }),
      columnHelper.accessor('doanhThuUocTinh', {
        header: 'Doanh thu ước tính',
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
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    autoResetPageIndex: false,
  })

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-700">
      </p>
      <LedgerTable
        table={table}
        empty="Chưa có doanh thu trong kỳ này."
        minWidth="min-w-[880px]"
        alignRight={['doanhThu', 'doanhThuUocTinh', 'chiPhi', 'loiNhuan', 'quanDuy', 'thuy']}
      />
    </div>
  )
}

function MoneyCell({ amount }: { amount: number }) {
  return <span className={amount < 0 ? 'font-semibold text-red-700' : 'font-semibold'}>{formatVnd(amount || 0)}</span>
}
