
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#020817] text-white hover:bg-[#0f172a] shadow-sm hover:shadow-md dark:bg-white dark:text-[#020817] dark:hover:bg-white/90",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md dark:bg-transparent dark:border dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400/10 dark:hover:border-red-400",
        outline: "border border-[#e6e6e6] bg-white hover:bg-gray-50 hover:text-[#020817] shadow-sm dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/5 dark:hover:border-white/30",
        secondary: "bg-[#f3f4f6] text-[#020817] hover:bg-[#e5e7eb] shadow-sm dark:bg-white/10 dark:border dark:border-white/15 dark:text-white dark:hover:bg-white/15",
        ghost: "hover:bg-[#f3f4f6] hover:text-[#020817] dark:hover:bg-white/5 dark:hover:text-white dark:text-white/80",
        link: "text-[#2563eb] underline-offset-4 hover:underline dark:text-white",
        document: "bg-blue-50 text-[#2563eb] hover:bg-blue-100 shadow-sm dark:bg-transparent dark:border dark:border-white/15 dark:text-white dark:hover:bg-white/5",
        admin: "bg-[#020817] text-white hover:bg-[#0f172a] shadow-sm dark:bg-white dark:text-[#020817] dark:hover:bg-white/90"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
