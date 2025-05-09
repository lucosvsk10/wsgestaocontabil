
import { Card, CardContent } from "@/components/ui/card";
import { FormattedFormResults } from "@/types/polls";
import { PollResultsHeader } from "./PollResultsHeader";
import { FormQuestionResult } from "./FormQuestionResult";
import { IndividualResponses } from "./IndividualResponses";

interface FormPollResultsProps {
  results: FormattedFormResults;
}

export const FormPollResults = ({ results }: FormPollResultsProps) => {
  return (
    <Card>
      <PollResultsHeader poll={results.poll} />
      <CardContent>
        {results.stats.length === 0 ? (
          <p className="text-center py-4">Este formulário não possui perguntas.</p>
        ) : (
          <div className="space-y-10">
            {results.stats.map((stat, index) => {
              const question = results.questions.find(q => q.id === stat.questionId);
              if (!question) return null;
              
              return (
                <FormQuestionResult 
                  key={stat.questionId}
                  question={question}
                  stat={stat}
                  index={index}
                  responses={results.responses}
                />
              );
            })}
            
            {/* Individual responses section */}
            <IndividualResponses type="form" results={results} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
