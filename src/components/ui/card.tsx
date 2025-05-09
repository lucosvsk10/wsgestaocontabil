
import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { isAdmin?: boolean }
>(({ className, isAdmin = false, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border shadow-sm",
        isAdmin 
          ? "bg-white dark:bg-navy-medium text-[#212121] dark:text-[#E0E0E0] border-gray-200 dark:border-navy-lighter/30" 
          : "bg-white dark:bg-navy-deeper text-navy dark:text-white border-gold/20 dark:border-navy-lighter/30",
        isMobile ? "aspect-[4/3]" : "aspect-auto",
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { isAdmin?: boolean }
>(({ className, isAdmin = false, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5", 
        isMobile ? "p-4" : "p-6", 
        className
      )}
      {...props}
    />
  )
})
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & { isAdmin?: boolean }
>(({ className, isAdmin = false, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  return (
    <h3
      ref={ref}
      className={cn(
        isMobile ? "text-xl" : "text-2xl",
        "font-semibold leading-none tracking-tight",
        isAdmin
          ? "text-[#212121] dark:text-gold"
          : "text-navy dark:text-gold",
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { isAdmin?: boolean }
>(({ className, isAdmin = false, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm",
      isAdmin
        ? "text-[#212121]/70 dark:text-[#E0E0E0]/70"
        : "text-navy/70 dark:text-white/70", 
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  return (
    <div 
      ref={ref} 
      className={cn(
        isMobile ? "p-4 pt-0" : "p-6 pt-0", 
        className
      )} 
      {...props} 
    />
  )
})
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center", 
        isMobile ? "p-4 pt-0" : "p-6 pt-0", 
        className
      )}
      {...props}
    />
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
