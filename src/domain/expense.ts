import { isRealIso, isWithinPeriod } from '@/domain/dates'
import type { Period } from '@/domain/period'
import type { Expense, ExpenseInput } from '@/types'

export function normalizeExpense(input: ExpenseInput, period: Period, id: string): Expense {
  const name = input.name.trim()
  if (!name) throw new Error('Nhập tên chi phí')
  if (!isRealIso(input.date) || !isWithinPeriod(input.date, period.start, period.end)) {
    throw new Error('Ngày chi phải nằm trong kỳ đang mở')
  }
  if (!Number.isInteger(input.amount) || input.amount < 0) throw new Error('Số tiền phải là số nguyên không âm')

  return {
    id,
    name,
    detail: input.detail.trim(),
    date: input.date,
    amount: input.amount,
  }
}

export function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'vi') || a.id.localeCompare(b.id))
}
