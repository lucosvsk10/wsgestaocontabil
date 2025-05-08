
import { useState, useEffect } from "react";
import { 
  FormattedFormResults, 
  FormQuestion 
} from "@/types/polls";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export const useFormPollResults = (pollId: string | null) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FormattedFormResults | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!pollId) return;
    
    const fetchResults = async () => {
      setLoading(true);
      try {
        // Get the poll
        const { data: pollData, error: pollError } = await supabase
          .from("polls")
          .select("*")
          .eq("id", pollId)
          .single();

        if (pollError) throw pollError;

        // Get questions
        const { data: questionsData, error: questionsError } = await supabase
          .from("form_questions")
          .select("*")
          .eq("poll_id", pollId)
          .order("order_position", { ascending: true });

        if (questionsError) throw questionsError;

        // Type assertion to ensure question_type is correctly typed
        const typedQuestions = questionsData.map((q: any) => ({
          ...q,
          question_type: q.question_type as FormQuestion['question_type']
        })) as FormQuestion[];

        // Get responses
        const { data: responsesData, error: responsesError } = await supabase
          .from("form_responses")
          .select("*")
          .eq("poll_id", pollId);

        if (responsesError) throw responsesError;

        // Calculate statistics for each question
        const stats = typedQuestions.map((question: FormQuestion) => {
          const questionResponses = responsesData.filter(
            (r: any) => r.question_id === question.id
          );
          
          // Calculate response distribution based on question type
          const responseDistribution: Record<string, number> = {};
          
          if (question.question_type === 'multiple_choice' || question.question_type === 'checkbox') {
            // For multiple choice and checkbox, count occurrences of each option
            const options = question.options?.options || [];
            
            options.forEach((option: string) => {
              responseDistribution[option] = 0;
            });
            
            questionResponses.forEach((r: any) => {
              try {
                if (question.question_type === 'checkbox') {
                  // For checkbox, the response may be an array of selected options
                  const selectedOptions = JSON.parse(r.response_value || '[]');
                  selectedOptions.forEach((opt: string) => {
                    if (responseDistribution[opt] !== undefined) {
                      responseDistribution[opt]++;
                    }
                  });
                } else {
                  // For multiple choice, just increment the counter
                  if (responseDistribution[r.response_value] !== undefined) {
                    responseDistribution[r.response_value]++;
                  }
                }
              } catch (e) {
                console.error("Error parsing response value:", e);
              }
            });
          } else if (question.question_type === 'scale') {
            // For scale questions, count occurrences of each value
            const min = question.options?.min || 1;
            const max = question.options?.max || 5;
            
            for (let i = min; i <= max; i++) {
              responseDistribution[i.toString()] = 0;
            }
            
            questionResponses.forEach((r: any) => {
              const value = r.response_value;
              if (responseDistribution[value] !== undefined) {
                responseDistribution[value]++;
              }
            });
          } else {
            // For text questions, just count the total
            responseDistribution["responses"] = questionResponses.length;
          }

          return {
            questionId: question.id,
            questionText: question.question_text,
            questionType: question.question_type,
            responseCount: questionResponses.length,
            responseDistribution
          };
        });

        setResults({
          poll: pollData,
          questions: typedQuestions,
          responses: responsesData,
          stats
        });
      } catch (error) {
        console.error("Error fetching form poll results:", error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao buscar os resultados do formulário",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [pollId]);

  return {
    loading,
    results
  };
};
