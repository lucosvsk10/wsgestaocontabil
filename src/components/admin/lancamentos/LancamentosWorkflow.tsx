import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { title: 'Configuração', description: 'Empresa e plano de contas' },
  { title: 'Coleta', description: 'Documentos da competência' },
  { title: 'Processamento', description: 'Extração e classificação' },
  { title: 'Conferência', description: 'Contas, históricos e valores' },
  { title: 'Balancete', description: 'Validação e exportação' },
];

interface LancamentosWorkflowProps {
  currentStep: number;
}

export const LancamentosWorkflow = ({ currentStep }: LancamentosWorkflowProps) => (
  <div className="border border-border bg-card px-4 py-4 sm:px-5">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5 md:gap-0">
      {STEPS.map((step, index) => {
        const complete = index < currentStep;
        const active = index === currentStep;
        return (
          <div key={step.title} className="relative flex items-center gap-3 md:block md:pr-4">
            {index < STEPS.length - 1 && (
              <span
                className={cn(
                  'absolute left-3.5 top-7 hidden h-px w-[calc(100%-1.75rem)] md:block',
                  complete ? 'bg-foreground' : 'bg-border'
                )}
              />
            )}
            <div
              className={cn(
                'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center border text-[11px] font-semibold',
                complete
                  ? 'border-foreground bg-foreground text-background'
                  : active
                    ? 'border-foreground bg-background text-foreground'
                    : 'border-border bg-card text-muted-foreground'
              )}
            >
              {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <div className="min-w-0 md:mt-3">
              <p
                className={cn(
                  'text-xs font-semibold',
                  active || complete ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.title}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
