import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'

import { LedgerProvider } from '@/lib/ledger'
import { router } from '@/router'

import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@/styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('Không tìm thấy #root')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LedgerProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" />
      </LedgerProvider>
    </QueryClientProvider>
  </StrictMode>,
)
