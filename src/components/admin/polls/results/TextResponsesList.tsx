
import { format } from "date-fns";
import { FormResponse } from "@/types/polls";

interface TextResponsesListProps {
  responses: FormResponse[];
  questionId: string;
}

export const TextResponsesList = ({ responses, questionId }: TextResponsesListProps) => {
  // Filter responses for this specific question and take the latest 5
  const questionResponses = responses
    .filter(r => r.question_id === questionId)
    .slice(0, 5);

  return (
    <div className="border rounded-md p-4">
      <p className="text-sm text-muted-foreground mb-4">
        {responses.filter(r => r.question_id === questionId).length} respostas de texto recebidas. 
        Respostas de texto não são exibidas em gráficos.
      </p>
      <div className="space-y-2">
        <p className="font-medium">Últimas respostas:</p>
        {questionResponses.map(response => (
          <div 
            key={response.id} 
            className="p-2 border rounded bg-orange-50/50 dark:bg-navy-light/20"
          >
            <p className="text-sm">{response.response_value}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {response.user_name || 'Anônimo'} - 
              {format(new Date(response.created_at), " dd/MM/yyyy HH:mm")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
