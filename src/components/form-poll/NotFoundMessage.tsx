
import { Button } from "@/components/ui/button";

interface NotFoundMessageProps {
  onGoHome: () => void;
}

const NotFoundMessage = ({ onGoHome }: NotFoundMessageProps) => {
  return (
    <div className="pt-6 pb-8 px-6 text-center">
      <h2 className="text-xl font-semibold mb-4">Formulário não encontrado</h2>
      <Button onClick={onGoHome} className="mt-4">
        Voltar para a página inicial
      </Button>
    </div>
  );
};

export default NotFoundMessage;
