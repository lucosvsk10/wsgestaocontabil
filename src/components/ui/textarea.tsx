
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-offset-background placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-navy-lighter dark:bg-navy-light/20 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-gold/60 dark:focus:ring-gold/10",
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
