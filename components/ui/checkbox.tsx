import * as React from 'react'

import { cn } from '@/lib/utils'
import { CheckIcon } from 'lucide-react'

const Checkbox = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  ({ className, ...props }, ref) => {
    return (
      <span
        data-slot="checkbox"
        className={cn(
          'peer relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary',
          className
        )}
      >
        <input ref={ref} type="checkbox" className="sr-only peer" {...props} />
        <CheckIcon className="pointer-events-none hidden size-3.5 peer-checked:block" />
      </span>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
