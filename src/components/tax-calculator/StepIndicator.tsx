
import { Progress } from "@/components/ui/progress";

interface StepIndicatorProps {
  step: number;
}

export const StepIndicator = ({ step }: StepIndicatorProps) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-gold text-navy' : 'bg-gray-200 text-gray-500'}`}>
            1
          </div>
          <span className={`ml-2 ${step >= 1 ? 'text-navy dark:text-gold' : 'text-gray-500'}`}>Rendimentos</span>
        </div>
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-gold text-navy' : 'bg-gray-200 text-gray-500'}`}>
            2
          </div>
          <span className={`ml-2 ${step >= 2 ? 'text-navy dark:text-gold' : 'text-gray-500'}`}>Deduções</span>
        </div>
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-gold text-navy' : 'bg-gray-200 text-gray-500'}`}>
            3
          </div>
          <span className={`ml-2 ${step >= 3 ? 'text-navy dark:text-gold' : 'text-gray-500'}`}>Resultado</span>
        </div>
      </div>
      <Progress value={step * 33.33} className="h-2 bg-gray-200 dark:bg-navy-lighter" />
    </div>
  );
};
