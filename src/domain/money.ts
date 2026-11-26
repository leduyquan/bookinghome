export function formatGrouped(amount: number): string {
  const rounded = Math.round(amount)
  const negative = rounded < 0
  const digits = String(Math.abs(rounded))
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${negative ? '-' : ''}${grouped}`
}

export function formatVnd(amount: number): string {
  return `${formatGrouped(amount)} đ`
}

export function pricePerNight(total: number, nights: number): number {
  if (nights <= 0) return 0
  return Math.round(total / nights)
}
