import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Poll, FormQuestion, FormResponse } from "@/types/polls";

interface ResponseState {
  questionId: string;
  response: string | string[] | number | null;
}

interface UseFormPollResult {
  poll: Poll | null;
  questions: FormQuestion[];
  loading: boolean;
  isSubmitting: boolean;
  hasVoted: boolean;
  userName: string;
  setUserName: (name: string) => void;
  comment: string;
  setComment: (comment: string) => void;
  responses: ResponseState[];
  handleResponseChange: (questionId: string, value: string | string[] | number | null) => void;
  handleCheckboxChange: (questionId: string, value: string, checked: boolean) => void;
  handleSubmit: () => Promise<void>;
}

export const useFormPoll = (pollId: string | undefined, user: any | null): UseFormPollResult => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [userName, setUserName] = useState("");
  const [comment, setComment] = useState("");
  const [responses, setResponses] = useState<ResponseState[]>([]);

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
        
        // Initialize responses array
        const initialResponses: ResponseState[] = typedQuestions.map((question: FormQuestion) => ({
          questionId: question.id,
          response: question.question_type === 'checkbox' ? [] : null
        }));
        setResponses(initialResponses);
        
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
  
  const handleResponseChange = (questionId: string, value: string | string[] | number | null) => {
    setResponses(prev => 
      prev.map(response => 
        response.questionId === questionId 
          ? { ...response, response: value } 
          : response
      )
    );
  };
  
  const handleCheckboxChange = (questionId: string, value: string, checked: boolean) => {
    setResponses(prev => 
      prev.map(response => {
        if (response.questionId !== questionId) return response;
        
        const currentValues = (response.response as string[]) || [];
        let newValues: string[];
        
        if (checked) {
          newValues = [...currentValues, value];
        } else {
          newValues = currentValues.filter(v => v !== value);
        }
        
        return { ...response, response: newValues };
      })
    );
  };
  
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
    poll,
    questions,
    loading,
    isSubmitting,
    hasVoted,
    userName,
    setUserName,
    comment,
    setComment,
    responses,
    handleResponseChange,
    handleCheckboxChange,
    handleSubmit
  };
};
