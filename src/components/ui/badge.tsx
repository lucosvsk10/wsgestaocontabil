
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground ring-primary",
        secondary:
          "bg-secondary text-secondary-foreground ring-secondary",
        destructive:
          "bg-destructive text-destructive-foreground ring-destructive",
        outline:
          "text-foreground ring-border bg-background",
        gold:
          "bg-gold/20 text-gold ring-gold/30 dark:bg-gold/10 dark:text-gold/90 dark:ring-gold/20",
        navy:
          "bg-navy/20 text-navy ring-navy/30 dark:bg-navy/10 dark:text-navy/90 dark:ring-navy/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
