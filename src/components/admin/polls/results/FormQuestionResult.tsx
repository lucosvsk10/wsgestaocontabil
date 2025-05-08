
import { FormQuestion, FormResponse } from "@/types/polls";
import { OptionDistributionChart, ChartDataItem } from "./OptionDistributionChart";
import { TextResponsesList } from "./TextResponsesList";

interface FormQuestionResultProps {
  question: FormQuestion;
  stat: {
    questionId: string;
    questionText: string;
    responseCount: number;
    responseDistribution: Record<string, number>;
  };
  index: number;
  responses: FormResponse[];
}

export const FormQuestionResult = ({ 
  question, 
  stat, 
  index, 
  responses 
}: FormQuestionResultProps) => {
  const isTextQuestion = question.question_type === 'short_text' || question.question_type === 'paragraph';
  const hasChartData = question.question_type === 'multiple_choice' || 
                      question.question_type === 'checkbox' || 
                      question.question_type === 'scale';
  
  // Prepare chart data if applicable
  const chartData: ChartDataItem[] = hasChartData 
    ? Object.entries(stat.responseDistribution).map(([label, count]) => ({
        name: label,
        value: count,
        count
      }))
    : [];

  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="font-medium text-lg">{index + 1}. {stat.questionText}</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>Tipo: <strong>
            {question.question_type === 'short_text' && 'Texto curto'}
            {question.question_type === 'paragraph' && 'Parágrafo'}
            {question.question_type === 'multiple_choice' && 'Múltipla escolha'}
            {question.question_type === 'checkbox' && 'Checkbox'}
            {question.question_type === 'scale' && 'Escala'}
          </strong></span>
          <span>Respostas: <strong>{stat.responseCount}</strong></span>
        </div>
      </div>
      
      {stat.responseCount > 0 ? (
        <>
          {hasChartData && (
            <OptionDistributionChart 
              data={chartData} 
              valueKey="value"
              showPercentage={false}
            />
          )}
          
          {isTextQuestion && (
            <TextResponsesList 
              responses={responses} 
              questionId={question.id} 
            />
          )}
        </>
      ) : (
        <p className="text-center py-4">Esta pergunta ainda não recebeu respostas.</p>
      )}
    </div>
  );
};
