import { Progress } from "@/components/ui/progress";
export interface StepIndicatorProps {
  step?: number;
  activeStep?: number; // Add this prop
}
export const StepIndicator = ({
  step,
  activeStep
}: StepIndicatorProps) => {
  // Use activeStep if provided, otherwise fall back to step
  const currentStep = activeStep !== undefined ? activeStep : step !== undefined ? step : 1;
  return;
};