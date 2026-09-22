import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button relative isolate inline-flex shrink-0 select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-[.9rem] border text-sm font-semibold tracking-[-.01em] outline-none transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:translate-y-px active:scale-[.985] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none focus-visible:ring-4 focus-visible:ring-[#7B286D]/18 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-[#6F1F62] bg-[linear-gradient(145deg,#7B286D_0%,#5D1752_46%,#380C31_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.22),inset_0_-1px_0_rgba(19,4,16,.26),0_8px_20px_rgba(56,12,49,.20)] hover:-translate-y-0.5 hover:border-[#8B367C] hover:bg-[linear-gradient(145deg,#8B367C_0%,#6C195E_46%,#410E39_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,.25),inset_0_-1px_0_rgba(19,4,16,.24),0_13px_28px_rgba(56,12,49,.28)]",
        destructive:
          "border-[#A61F1F] bg-[linear-gradient(145deg,#D94B4B,#A61F1F)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_7px_18px_rgba(166,31,31,.18)] hover:-translate-y-0.5 hover:bg-[linear-gradient(145deg,#E15858,#B42121)] hover:shadow-[0_11px_24px_rgba(166,31,31,.25)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-[#541249]/18 bg-white/92 text-[#541249] shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_1px_2px_rgba(18,20,15,.04),0_5px_16px_rgba(56,12,49,.055)] backdrop-blur-sm hover:-translate-y-0.5 hover:border-[#541249]/38 hover:bg-[#FCF8FB] hover:shadow-[0_9px_22px_rgba(56,12,49,.11)] dark:border-input dark:bg-input/30 dark:text-foreground dark:hover:bg-input/50",
        secondary:
          "border-[#541249]/10 bg-[#F7EAF5] text-[#541249] shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_1px_2px_rgba(56,12,49,.04)] hover:-translate-y-0.5 hover:border-[#541249]/20 hover:bg-[#F1DFEE] hover:shadow-[0_8px_20px_rgba(56,12,49,.09)]",
        ghost:
          "border-transparent bg-transparent text-foreground shadow-none hover:border-[#541249]/8 hover:bg-[#F7EAF5]/80 hover:text-[#541249]",
        link: "h-auto rounded-md border-transparent bg-transparent px-1 text-[#541249] shadow-none underline-offset-4 hover:text-[#7B286D] hover:underline",
      },
      size: {
        default: "h-11 px-[1.125rem] py-2.5 has-[>svg]:px-4",
        sm: "h-10 rounded-[.8rem] gap-1.5 px-3.5 text-[.8125rem] has-[>svg]:px-3",
        lg: "h-12 rounded-[1rem] px-6 text-[.9375rem] has-[>svg]:px-5",
        icon: "size-11 rounded-[.85rem] p-0",
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
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
