export class UnauthorizedError extends Error {
  constructor() {
    super('UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof UnauthorizedError) return 'Mật khẩu không đúng'
  if (error instanceof Error && error.message) return error.message
  return 'Có lỗi xảy ra'
}
