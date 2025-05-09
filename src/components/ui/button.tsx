
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gold text-navy hover:bg-gold-light",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-orange-100 dark:bg-navy-medium hover:bg-orange-200 dark:hover:bg-navy-lighter hover:text-navy dark:hover:text-white",
        secondary:
          "bg-orange-200 dark:bg-navy-medium text-navy dark:text-white hover:bg-orange-200/80 dark:hover:bg-navy-lighter/80",
        ghost: "hover:bg-orange-200 dark:hover:bg-navy-lighter hover:text-navy dark:hover:text-white",
        link: "text-navy dark:text-gold underline-offset-4 hover:underline",
        document: "bg-orange-200 dark:bg-navy-medium text-navy dark:text-white hover:bg-orange-200/90 dark:hover:bg-navy-lighter/90 border border-gold/20",
        admin: "bg-[#212121] text-white hover:bg-[#333333] dark:bg-gold dark:text-navy-deeper dark:hover:bg-gold-light"
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
