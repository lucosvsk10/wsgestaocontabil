
import React from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/components/admin/utils/dateUtils";
import { FormattedFormResults, FormattedNumericalResults, NumericalResponse, FormResponse, FormQuestion } from "@/types/polls";

interface IndividualResponsesProps {
  type: 'numerical' | 'form';
  results: FormattedFormResults | FormattedNumericalResults;
}

export const IndividualResponses: React.FC<IndividualResponsesProps> = ({ type, results }) => {
  // Group responses by user
  const groupedResponses = React.useMemo(() => {
    if (type === 'numerical') {
      const numericalResults = results as FormattedNumericalResults;
      const grouped: Record<string, {
        userName: string | null;
        userId: string | null;
        responses: NumericalResponse[];
        timestamp: string;
      }> = {};
      
      numericalResults.responses.forEach(response => {
        const key = response.user_id || response.user_name || 'anonymous';
        if (!grouped[key]) {
          grouped[key] = {
            userName: response.user_name || null,
            userId: response.user_id || null,
            responses: [],
            timestamp: response.created_at
          };
        }
        grouped[key].responses.push(response);
      });
      
      return Object.values(grouped);
    } else {
      const formResults = results as FormattedFormResults;
      const grouped: Record<string, {
        userName: string | null;
        userId: string | null;
        responses: FormResponse[];
        timestamp: string;
      }> = {};
      
      formResults.responses.forEach(response => {
        const key = response.user_id || response.user_name || 'anonymous';
        if (!grouped[key]) {
          grouped[key] = {
            userName: response.user_name || null,
            userId: response.user_id || null,
            responses: [],
            timestamp: response.created_at
          };
        }
        grouped[key].responses.push(response);
      });
      
      return Object.values(grouped);
    }
  }, [results, type]);
  
  if (groupedResponses.length === 0) {
    return (
      <Card className="mt-8">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Nenhuma resposta recebida ainda para esta enquete.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Get user initials for avatar
  const getUserInitials = (name: string | null): string => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };
  
  // Get question text by question ID
  const getQuestionText = (questionId: string): string => {
    if (type === 'numerical') {
      const numericalResults = results as FormattedNumericalResults;
      const question = numericalResults.questions.find(q => q.id === questionId);
      return question?.question_text || 'Pergunta não encontrada';
    } else {
      const formResults = results as FormattedFormResults;
      const question = formResults.questions.find(q => q.id === questionId);
      return question?.question_text || 'Pergunta não encontrada';
    }
  };
  
  // Get formatted response value
  const getFormattedResponse = (response: FormResponse | NumericalResponse): React.ReactNode => {
    if (type === 'numerical') {
      return (response as NumericalResponse).value;
    } else {
      const formResponse = response as FormResponse;
      const formResults = results as FormattedFormResults;
      const question = formResults.questions.find(q => q.id === formResponse.question_id) as FormQuestion;
      
      if (!question) return formResponse.response_value;
      
      if (question.question_type === 'checkbox') {
        try {
          const values = JSON.parse(formResponse.response_value || '[]');
          return Array.isArray(values) ? values.join(', ') : formResponse.response_value;
        } catch (e) {
          return formResponse.response_value;
        }
      }
      
      return formResponse.response_value;
    }
  };
  
  return (
    <div className="space-y-8 mt-6">
      <h3 className="text-xl font-medium">Respostas Individuais</h3>
      {groupedResponses.map((group, index) => (
        <Card key={index} className="border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 bg-primary">
                <AvatarFallback>{getUserInitials(group.userName)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{group.userName || 'Anônimo'}</CardTitle>
                <CardDescription>Enviado em {formatDate(group.timestamp)}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pergunta</TableHead>
                  <TableHead>Resposta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.responses.map((response, responseIdx) => (
                  <TableRow key={responseIdx}>
                    <TableCell className="align-top font-medium">{getQuestionText(response.question_id)}</TableCell>
                    <TableCell>{getFormattedResponse(response)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
