import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, Ref } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-400',
        outline: 'border border-primary bg-white text-primary hover:bg-primary-50',
        ghost: 'text-black hover:bg-neutral-50',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
      },
      size: {
        md: 'h-10 px-4',
        sm: 'h-9 px-3',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    ref?: Ref<HTMLButtonElement>
  }

export function Button({ className, variant, size, type = 'button', ref, ...props }: ButtonProps) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
