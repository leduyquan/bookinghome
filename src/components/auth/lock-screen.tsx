import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { fieldClassName } from '@/lib/utils'
import { useLedger } from '@/lib/ledger'

export function LockScreen() {
  const { unlock } = useLedger()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault()
          setPending(true)
          setError(null)
          void unlock(password).then(
            () => setPending(false),
            (reason: unknown) => {
              setError(errorMessage(reason))
              setPending(false)
            },
          )
        }}
      >
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Booking Home</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Mở sổ nhà</h1>
        <p className="mt-2 text-sm text-neutral-700">Nhập mật khẩu để xem lịch phòng, chi tiết, chi phí và doanh thu.</p>
        <label className="mt-6 flex flex-col gap-1 text-sm font-semibold" htmlFor="password">
          Mật khẩu
          <input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            className={fieldClassName}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <Button type="submit" className="mt-5 w-full" disabled={pending || password.length === 0}>
          {pending ? 'Đang kiểm tra...' : 'Mở khóa'}
        </Button>
      </form>
    </div>
  )
}
