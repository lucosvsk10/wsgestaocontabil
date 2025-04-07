
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className = "" }: LoadingSpinnerProps) => {
  const sizeClass = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  };

  return (
    <div className={`flex justify-center py-4 ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-gold ${sizeClass[size]}`}></div>
    </div>
  );
};
