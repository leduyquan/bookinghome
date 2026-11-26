import { createRootRoute, createRouter } from '@tanstack/react-router'

import { App } from '@/app'

const rootRoute = createRootRoute({
  component: App,
})

const rawBase = import.meta.env.BASE_URL
const basepath = !rawBase || rawBase === '/' ? '/' : rawBase.replace(/\/$/, '')

export const router = createRouter({
  routeTree: rootRoute,
  basepath,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
