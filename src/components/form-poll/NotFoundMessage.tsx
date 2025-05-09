
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface NotFoundMessageProps {
  onGoHome?: () => void;
}

const NotFoundMessage = ({ onGoHome }: NotFoundMessageProps) => {
  return (
    <div className="pt-6 pb-8 px-6 text-center">
      <h2 className="text-xl font-semibold mb-4">Formulário não encontrado</h2>
      <Button 
        asChild={!onGoHome} 
        className="mt-4"
        onClick={onGoHome}
      >
        {onGoHome ? (
          <span>Voltar para a página inicial</span>
        ) : (
          <Link to="/">Voltar para a página inicial</Link>
        )}
      </Button>
    </div>
  );
};

export default NotFoundMessage;
