
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Poll, FormQuestion } from "@/types/polls";
import { ResponseState } from "./useFormResponses";

interface UseFormSubmissionProps {
  pollId: string | undefined;
  user: any | null;
  poll: Poll | null;
  questions: FormQuestion[];
  responses: ResponseState[];
  userName: string;
  comment: string;
  setHasVoted: (hasVoted: boolean) => void;
}

interface UseFormSubmissionResult {
  isSubmitting: boolean;
  handleSubmit: () => Promise<void>;
}

export const useFormSubmission = ({
  pollId,
  user,
  poll,
  questions,
  responses,
  userName,
  comment,
  setHasVoted
}: UseFormSubmissionProps): UseFormSubmissionResult => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    // Verificar se o nome foi preenchido para usuários não logados
    if (!user && !userName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome para registrar suas respostas",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar se todas as perguntas obrigatórias foram respondidas
    const requiredQuestions = questions.filter(q => q.required);
    const unansweredQuestions = requiredQuestions.filter(q => {
      const response = responses.find(r => r.questionId === q.id);
      if (!response) return true;
      
      if (q.question_type === 'checkbox') {
        return (response.response as string[] || []).length === 0;
      }
      
      return response.response === null || response.response === '';
    });
    
    if (unansweredQuestions.length > 0) {
      toast({
        title: "Formulário incompleto",
        description: `Por favor, responda as perguntas obrigatórias: ${unansweredQuestions.map((_, i) => i + 1).join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Preparar os dados para envio
      const formattedResponses = responses.map(response => {
        // Para checkboxes, precisamos converter o array para string JSON
        const responseValue = Array.isArray(response.response)
          ? JSON.stringify(response.response)
          : response.response?.toString() || null;
          
        return {
          poll_id: pollId,
          question_id: response.questionId,
          user_id: user?.id || null,
          user_name: !user ? userName.trim() : null,
          response_value: responseValue
        };
      });
      
      // Inserir respostas
      const { error } = await supabase
        .from("form_responses")
        .insert(formattedResponses);
        
      if (error) throw error;
      
      // Adicionar comentário se habilitado e preenchido
      if (poll?.allow_comments && comment.trim()) {
        await supabase
          .from("form_responses")
          .insert({
            poll_id: pollId,
            question_id: 'comment',
            user_id: user?.id || null,
            user_name: !user ? userName.trim() : null,
            response_value: comment.trim()
          });
      }
      
      toast({
        title: "Sucesso!",
        description: "Suas respostas foram registradas com sucesso",
      });
      
      setHasVoted(true);

      // Redirecionar para página principal após alguns segundos
      setTimeout(() => {
        navigate("/");
      }, 3000);
      
    } catch (error) {
      console.error("Error submitting responses:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar suas respostas",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleSubmit
  };
};
