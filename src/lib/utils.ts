import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export const fieldClassName =
  'h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-black outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-700'
