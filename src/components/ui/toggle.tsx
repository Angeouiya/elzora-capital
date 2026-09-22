"use client"

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:bg-[#F7EAF5] hover:text-[#541249] active:scale-[.985] focus-visible:border-[#7B286D] focus-visible:ring-4 focus-visible:ring-[#7B286D]/18 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-[#541249]/15 data-[state=on]:bg-[#F1DFEE] data-[state=on]:text-[#541249] data-[state=on]:shadow-[0_5px_14px_rgba(56,12,49,.08)] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-[#541249]/15 bg-white/80 text-foreground shadow-[0_1px_2px_rgba(18,20,15,.04)] hover:border-[#541249]/30",
      },
      size: {
        default: "h-10 min-w-10 px-3",
        sm: "h-9 min-w-9 px-2.5",
        lg: "h-11 min-w-11 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
