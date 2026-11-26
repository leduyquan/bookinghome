export const ROOMS = [
  { id: '201', type: '2 BED', header: '#B06A60', cell: '#F6E3DF', ink: '#4A2E2A', label: '#ffffff' },
  { id: '202', type: '1 BED', header: '#A3542E', cell: '#F4D4C0', ink: '#633216', label: '#ffffff' },
  { id: '301', type: '1 BED', header: '#7A614A', cell: '#EADDCB', ink: '#3C3126', label: '#ffffff' },
] as const

export const ROOM_IDS = ['201', '202', '301'] as const

export const SOURCES = ['', 'BDC', 'Agoda', 'Air bnb', 'Khách lẻ'] as const

export const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const

export const SECTIONS = [
  { id: 'booking', label: 'OCC' },
  { id: 'details', label: 'Booking' },
  { id: 'expenses', label: 'Chi phí' },
  { id: 'revenue', label: 'Doanh thu' },
] as const
