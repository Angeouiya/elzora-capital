"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex min-h-11 w-fit max-w-full items-center justify-start gap-1 overflow-x-auto rounded-2xl border border-[#541249]/10 bg-[#F7EAF5]/75 p-1.5 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_6px_18px_rgba(56,12,49,.05)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-transparent px-3.5 py-1.5 text-sm font-semibold text-muted-foreground outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:bg-white/65 hover:text-[#541249] active:scale-[.985] focus-visible:ring-4 focus-visible:ring-[#7B286D]/18 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-[#541249]/12 data-[state=active]:bg-white data-[state=active]:text-[#541249] data-[state=active]:shadow-[0_5px_16px_rgba(56,12,49,.10)] dark:text-muted-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
