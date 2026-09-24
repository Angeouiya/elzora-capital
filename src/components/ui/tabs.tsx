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
        "inline-flex min-h-12 w-fit max-w-full items-stretch justify-start gap-1 overflow-x-auto rounded-[1.55rem] border border-[#541249]/10 bg-[#f3f3f2] p-1 text-muted-foreground shadow-[inset_0_1px_2px_rgba(19,4,16,.055)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
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
        "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[1.2rem] border border-transparent px-3.5 py-2 text-sm font-semibold text-[#5f626a] outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:bg-white/55 hover:text-[#541249] active:scale-[.985] focus-visible:ring-4 focus-visible:ring-[#7B286D]/16 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-[#541249]/10 data-[state=active]:bg-white data-[state=active]:text-[#16151a] data-[state=active]:shadow-[0_9px_22px_rgba(19,4,16,.12),inset_0_1px_0_rgba(255,255,255,.95)] dark:text-muted-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
