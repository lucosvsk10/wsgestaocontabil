
import React from "react";
import { FormResponse } from "@/types/polls";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TextResponsesListProps {
  responses: FormResponse[];
  questionId: string;
}

export const TextResponsesList: React.FC<TextResponsesListProps> = ({ responses, questionId }) => {
  // Filtrar respostas para esta pergunta
  const questionResponses = responses.filter(r => r.question_id === questionId);
  
  if (questionResponses.length === 0) {
    return <p className="text-center py-4">Nenhuma resposta para esta pergunta.</p>;
  }
  
  return (
    <div className="space-y-3 mt-4">
      <h4 className="text-sm font-medium">Respostas de texto ({questionResponses.length})</h4>
      <div className="space-y-2">
        {questionResponses.map((response, idx) => (
          <div 
            key={idx} 
            className="p-3 rounded-md bg-muted/30 border border-border"
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-medium">
                {response.user_name || 'Anônimo'}
              </span>
              <Badge variant="outline" className="text-xs">
                {formatDistanceToNow(new Date(response.created_at), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </Badge>
            </div>
            <p className="text-sm whitespace-pre-wrap">{response.response_value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
