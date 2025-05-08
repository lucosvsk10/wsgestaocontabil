
import { Button } from "@/components/ui/button";

interface FormFooterProps {
  hasVoted: boolean;
  isSubmitting: boolean;
  onGoHome: () => void;
  onSubmit: () => void;
}

const FormFooter = ({ hasVoted, isSubmitting, onGoHome, onSubmit }: FormFooterProps) => {
  return (
    <>
      <Button 
        variant="outline" 
        onClick={onGoHome}
      >
        Voltar para a página inicial
      </Button>
      
      {!hasVoted && (
        <Button 
          disabled={isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? "Enviando..." : "Enviar Respostas"}
        </Button>
      )}
    </>
  );
};

export default FormFooter;
