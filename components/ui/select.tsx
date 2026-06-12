import * as React from 'react'

import { cn } from '@/lib/utils'

const Select = React.forwardRef<HTMLSelectElement, React.ComponentPropsWithoutRef<'select'>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      data-slot="select"
      className={cn(
        'flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'

function SelectGroup({ className, ...props }: React.ComponentPropsWithoutRef<'optgroup'>) {
  return <optgroup className={cn('scroll-my-1 p-1', className)} {...props} />
}

function SelectValue({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
  return <span className={cn('flex flex-1 text-left', className)} {...props} />
}

function SelectTrigger({
  className,
  children,
  size = 'default',
  ...props
}: Omit<React.ComponentPropsWithoutRef<'select'>, 'size'> & { size?: 'sm' | 'default' }) {
  return (
    <select
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        'flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

function SelectContent({ className, children, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div data-slot="select-content" className={cn('rounded-lg bg-popover text-popover-foreground shadow-md', className)} {...props}>
      {children}
    </div>
  )
}

function SelectLabel({ className, ...props }: React.ComponentPropsWithoutRef<'label'>) {
  return <label data-slot="select-label" className={cn('px-1.5 py-1 text-xs text-muted-foreground', className)} {...props} />
}

function SelectItem({ className, children, ...props }: React.ComponentPropsWithoutRef<'option'>) {
  return (
    <option data-slot="select-item" className={cn('py-1 text-sm', className)} {...props}>
      {children}
    </option>
  )
}

function SelectSeparator({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
  return <hr data-slot="select-separator" className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)} {...props} />
}

function SelectScrollUpButton({ className, ...props }: React.ComponentPropsWithoutRef<'button'>) {
  return <button type="button" data-slot="select-scroll-up-button" className={cn('top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1', className)} {...props} />
}

function SelectScrollDownButton({ className, ...props }: React.ComponentPropsWithoutRef<'button'>) {
  return <button type="button" data-slot="select-scroll-down-button" className={cn('bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1', className)} {...props} />
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
