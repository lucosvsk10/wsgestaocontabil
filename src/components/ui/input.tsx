
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-[#020817] shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#9ca3af] focus:border-[#efc349] focus:outline-none focus:ring-2 focus:ring-[#efc349]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gold/30 dark:bg-deepNavy/60 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-gold dark:focus:ring-gold/10 dark:backdrop-blur-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
