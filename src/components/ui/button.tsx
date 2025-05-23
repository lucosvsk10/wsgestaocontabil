
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#020817] text-white hover:bg-[#0f172a] dark:border dark:border-gold dark:border-opacity-40 dark:bg-transparent dark:text-[#d9d9d9] dark:hover:bg-gold/10 shadow-sm",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 dark:bg-transparent dark:border dark:border-red-500/70 dark:text-red-400 dark:hover:bg-red-900/20",
        outline:
          "border border-[#e6e6e6] bg-white hover:bg-gray-50 hover:text-[#020817] dark:border-gold dark:border-opacity-40 dark:bg-transparent dark:text-[#d9d9d9] dark:hover:bg-gold/10",
        secondary:
          "bg-[#f3f4f6] text-[#020817] hover:bg-[#e5e7eb] dark:bg-transparent dark:border dark:border-gold dark:border-opacity-30 dark:text-[#d9d9d9] dark:hover:bg-gold/10",
        ghost: "hover:bg-[#f3f4f6] hover:text-[#020817] dark:hover:bg-gold/10 dark:hover:text-[#d9d9d9]",
        link: "text-[#2563eb] underline-offset-4 hover:underline dark:text-gold",
        document: "bg-blue-50 text-[#2563eb] hover:bg-blue-100 dark:bg-transparent dark:border dark:border-gold dark:border-opacity-40 dark:text-[#d9d9d9] dark:hover:bg-gold/10",
        admin: "bg-[#020817] text-white hover:bg-[#0f172a] dark:border dark:border-gold dark:border-opacity-40 dark:bg-transparent dark:text-[#d9d9d9] dark:hover:bg-gold/10 shadow-sm"
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
