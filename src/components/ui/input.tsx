
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
          "flex h-10 w-full rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-[#020817] shadow-sm transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#9ca3af] focus:border-[#efc349] focus:outline-none focus:ring-2 focus:ring-[#efc349]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#efc349]/30 dark:bg-transparent dark:text-white dark:placeholder:text-white/50 dark:focus:border-[#efc349] dark:focus:ring-[#efc349]/10",
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
