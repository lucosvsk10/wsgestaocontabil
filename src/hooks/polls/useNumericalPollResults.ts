
import { useState, useEffect } from "react";
import { 
  FormattedNumericalResults, 
  NumericalQuestion 
} from "@/types/polls";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export const useNumericalPollResults = (pollId: string | null) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FormattedNumericalResults | null>(null);
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
          .from("numerical_questions")
          .select("*")
          .eq("poll_id", pollId)
          .order("created_at", { ascending: true });

        if (questionsError) throw questionsError;

        // Get responses
        const { data: responsesData, error: responsesError } = await supabase
          .from("numerical_responses")
          .select("*")
          .eq("poll_id", pollId);

        if (responsesError) throw responsesError;

        // Calculate statistics for each question
        const stats = questionsData.map((question: NumericalQuestion) => {
          const questionResponses = responsesData.filter(
            (r: any) => r.question_id === question.id
          );
          
          const values = questionResponses.map((r: any) => r.value);
          const sum = values.reduce((a: number, b: number) => a + b, 0);
          const avg = values.length > 0 ? sum / values.length : 0;
          const min = values.length > 0 ? Math.min(...values) : 0;
          const max = values.length > 0 ? Math.max(...values) : 0;
          
          // Calculate value distribution
          const distribution: Record<number, number> = {};
          for (let i = question.min_value; i <= question.max_value; i++) {
            distribution[i] = 0;
          }
          
          questionResponses.forEach((r: any) => {
            if (distribution[r.value] !== undefined) {
              distribution[r.value]++;
            }
          });

          return {
            questionId: question.id,
            questionText: question.question_text,
            averageValue: parseFloat(avg.toFixed(2)),
            minValue: min,
            maxValue: max,
            responseCount: questionResponses.length,
            valueDistribution: distribution
          };
        });

        setResults({
          poll: pollData,
          questions: questionsData,
          responses: responsesData,
          stats
        });
      } catch (error) {
        console.error("Error fetching numerical poll results:", error);
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
