
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Poll, FormQuestion } from "@/types/polls";

interface UseFormPollDataResult {
  poll: Poll | null;
  questions: FormQuestion[];
  loading: boolean;
  hasVoted: boolean;
}

export const useFormPollData = (pollId: string | undefined, user: any | null): UseFormPollDataResult => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const fetchPoll = async () => {
      if (!pollId) return;
      
      setLoading(true);
      try {
        // Get poll data
        const { data: pollData, error: pollError } = await supabase
          .from("polls")
          .select("*")
          .eq("id", pollId)
          .single();
          
        if (pollError) {
          throw pollError;
        }
        
        setPoll(pollData);
        
        // If not public and not logged in, redirect
        if (!pollData.is_public && !user) {
          toast({
            title: "Acesso restrito",
            description: "Este formulário é apenas para usuários logados",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }
        
        // If poll has expired
        if (pollData.expires_at && new Date(pollData.expires_at) < new Date()) {
          toast({
            title: "Formulário expirado",
            description: "Este formulário não está mais disponível para respostas",
          });
          setHasVoted(true);
        }
        
        // Make sure it's a form poll
        if (pollData.poll_type !== 'form') {
          toast({
            title: "Tipo de enquete incorreto",
            description: "Este link é para um formulário completo, mas o ID fornecido é para outro tipo de enquete",
            variant: "destructive",
          });
          navigate("/");
          return;
        }
        
        // Get questions
        const { data: questionsData, error: questionsError } = await supabase
          .from("form_questions")
          .select("*")
          .eq("poll_id", pollId)
          .order("order_position", { ascending: true });
          
        if (questionsError) {
          throw questionsError;
        }
        
        // Convert the question_type to the correct type
        const typedQuestions = questionsData.map((q: any) => ({
          ...q,
          question_type: q.question_type as FormQuestion['question_type']
        })) as FormQuestion[];
        
        setQuestions(typedQuestions);
        
        // Check if user has already voted
        if (user) {
          const { data: responseData, error: responseError } = await supabase
            .from("form_responses")
            .select("id")
            .eq("poll_id", pollId)
            .eq("user_id", user.id)
            .limit(1);
              
          if (!responseError && responseData && responseData.length > 0) {
            setHasVoted(true);
            toast({
              title: "Já respondido",
              description: "Você já respondeu a este formulário anteriormente",
            });
          }
        }
        
      } catch (error) {
        console.error("Error fetching poll:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o formulário",
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPoll();
  }, [pollId, user, toast, navigate]);

  return {
    poll,
    questions,
    loading,
    hasVoted
  };
};
