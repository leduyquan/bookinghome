export const ROOMS = [
  { id: '201', type: '2 BED', header: '#244D74', cell: '#E9EDF1', ink: '#0F2031' },
  { id: '202', type: '1 BED', header: '#874A11', cell: '#FEF3E9', ink: '#67380D' },
  { id: '301', type: '1 BED', header: '#8C6002', cell: '#FFF7E6', ink: '#6B4902' },
] as const

export const ROOM_IDS = ['201', '202', '301'] as const

export const SOURCES = ['', 'BDC', 'Agoda', 'Air bnb', 'Khách lẻ'] as const

export const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const

export const SECTIONS = [
  { id: 'booking', label: 'Booking' },
  { id: 'details', label: 'Chi tiết' },
  { id: 'expenses', label: 'Chi phí' },
  { id: 'revenue', label: 'Doanh thu' },
] as const
