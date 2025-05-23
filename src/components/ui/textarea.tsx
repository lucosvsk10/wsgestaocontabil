
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-sm text-[#020817] shadow-sm ring-offset-background placeholder:text-[#9ca3af] focus:border-[#efc349] focus:outline-none focus:ring-2 focus:ring-[#efc349]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-navy-lighter dark:bg-navy-light/20 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-gold/60 dark:focus:ring-gold/10",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
