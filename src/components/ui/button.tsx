import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative isolate inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-[.85rem] text-sm font-bold tracking-[-.012em] transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-out active:translate-y-px active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-[#7B286D] focus-visible:ring-[#7B286D]/20 focus-visible:ring-[4px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          "border border-[#541249]/80 bg-[linear-gradient(135deg,#6F1F62_0%,#541249_48%,#250820_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_8px_22px_rgba(56,12,49,.20)] hover:-translate-y-0.5 hover:border-[#7B286D] hover:bg-[linear-gradient(135deg,#7B286D_0%,#5F1753_48%,#310A2A_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_13px_30px_rgba(56,12,49,.28)]",
        destructive:
          "border border-[#A61F1F] bg-[linear-gradient(135deg,#D64242,#A61F1F)] text-white shadow-[0_7px_18px_rgba(166,31,31,.18)] hover:-translate-y-0.5 hover:shadow-[0_11px_24px_rgba(166,31,31,.25)] focus-visible:border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-[#541249]/18 bg-white/90 text-[#541249] shadow-[0_1px_2px_rgba(18,20,15,.04),0_6px_18px_rgba(56,12,49,.05)] backdrop-blur-sm hover:-translate-y-0.5 hover:border-[#541249]/35 hover:bg-[#FAF4F9] hover:shadow-[0_9px_22px_rgba(56,12,49,.10)] dark:border-input dark:bg-input/30 dark:text-foreground dark:hover:bg-input/50",
        secondary:
          "border border-[#541249]/8 bg-[#F7EAF5] text-[#541249] shadow-[0_1px_2px_rgba(56,12,49,.04)] hover:-translate-y-0.5 hover:border-[#541249]/16 hover:bg-[#F1DFEE] hover:shadow-[0_8px_20px_rgba(56,12,49,.08)]",
        ghost:
          "text-foreground hover:bg-[#F7EAF5] hover:text-[#541249] dark:hover:bg-accent/50",
        link: "h-auto rounded-md px-1 text-[#541249] shadow-none underline-offset-4 hover:text-[#7B286D] hover:underline",
      },
      size: {
        default: "h-11 px-4.5 py-2.5 has-[>svg]:px-4",
        sm: "h-10 rounded-[.75rem] gap-1.5 px-3.5 text-[.8125rem] has-[>svg]:px-3",
        lg: "h-12 rounded-2xl px-6 text-[.9375rem] has-[>svg]:px-5",
        icon: "size-11 rounded-[.8rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
