import { flexRender, type Table } from '@tanstack/react-table'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type LedgerTableProps<T> = {
  table: Table<T>
  empty: string
  footer?: ReactNode
  minWidth?: string
  alignRight?: string[]
  alignCenter?: string[]
  truncate?: string[]
}

export function LedgerTable<T>({ table, empty, footer, minWidth = 'min-w-[640px]', alignRight = [], alignCenter = [], truncate = [] }: LedgerTableProps<T>) {
  const right = new Set(alignRight)
  const center = new Set(alignCenter)
  const clipped = new Set(truncate)
  const rows = table.getRowModel().rows
  const columnCount = table.getVisibleLeafColumns().length

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className={cn('w-full border-collapse text-sm', minWidth)}>
        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-900">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    'px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap',
                    right.has(header.column.id) && 'text-right',
                    center.has(header.column.id) && 'text-center',
                  )}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="px-3 py-8 text-center text-neutral-700">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50 hover:bg-neutral-100">
                {row.getVisibleCells().map((cell) => {
                  const clip = clipped.has(cell.column.id)
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-3 py-2 text-black',
                        clip ? 'max-w-30 truncate' : 'whitespace-nowrap',
                        right.has(cell.column.id) && 'text-right',
                        center.has(cell.column.id) && 'text-center',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
        {footer ? <tfoot className="bg-primary-50 font-semibold text-primary">{footer}</tfoot> : null}
      </table>
    </div>
  )
}
