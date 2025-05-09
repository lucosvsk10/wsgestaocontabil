
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFoundMessage = () => {
  return (
    <div className="pt-6 pb-8 px-6 text-center">
      <h2 className="text-xl font-semibold mb-4">Formulário não encontrado</h2>
      <Button asChild className="mt-4">
        <Link to="/">Voltar para a página inicial</Link>
      </Button>
    </div>
  );
};

export default NotFoundMessage;
