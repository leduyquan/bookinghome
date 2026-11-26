export const PASSWORD_KEY = 'bookinghome.password'
export const PERIOD_KEY = 'bookinghome.activePeriod'
export const SECTION_KEY = 'bookinghome.section'
export const SIDEBAR_KEY = 'bookinghome.sidebarCollapsed'

export function readPassword(): string | null {
  return sessionStorage.getItem(PASSWORD_KEY)
}

export function writePassword(password: string) {
  sessionStorage.setItem(PASSWORD_KEY, password)
}

export function clearPassword() {
  sessionStorage.removeItem(PASSWORD_KEY)
}

export function requirePassword(): string {
  const password = readPassword()
  if (!password) throw new Error('Chưa mở khóa')
  return password
}
