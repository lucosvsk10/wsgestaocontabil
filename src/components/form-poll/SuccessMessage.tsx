
interface SuccessMessageProps {
  message?: string;
}

const SuccessMessage = ({ message = "Obrigado por participar!" }: SuccessMessageProps) => {
  return (
    <div className="text-center py-8">
      <p className="text-lg">{message}</p>
      <p className="text-sm text-muted-foreground mt-2">
        Suas respostas foram registradas com sucesso.
      </p>
      <p className="text-sm text-muted-foreground mt-4">
        Você será redirecionado para a página inicial em alguns segundos...
      </p>
    </div>
  );
};

export default SuccessMessage;
