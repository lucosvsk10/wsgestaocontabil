import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Poll, FormQuestion } from "@/types/polls";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface FormResponse {
  questionId: string;
  response: string | string[] | number | null;
}

const FormPollPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [poll, setPoll] = useState<Poll | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [userName, setUserName] = useState("");
  const [comment, setComment] = useState("");
  const [responses, setResponses] = useState<FormResponse[]>([]);
  
  useEffect(() => {
    const fetchPoll = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // Get poll data
        const { data: pollData, error: pollError } = await supabase
          .from("polls")
          .select("*")
          .eq("id", id)
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
          .eq("poll_id", id)
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
        const initialResponses: FormResponse[] = typedQuestions.map((question: FormQuestion) => ({
          questionId: question.id,
          response: question.question_type === 'checkbox' ? [] : null
        }));
        setResponses(initialResponses);
        
        // Check if user has already voted
        if (user) {
          const { data: responseData, error: responseError } = await supabase
            .from("form_responses")
            .select("id")
            .eq("poll_id", id)
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
  }, [id, user]);
  
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
          poll_id: id,
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
            poll_id: id,
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
  
  const renderQuestionInput = (question: FormQuestion, index: number) => {
    const response = responses.find(r => r.questionId === question.id);
    
    switch(question.question_type) {
      case 'short_text':
        return (
          <Input 
            id={question.id} 
            value={(response?.response as string) || ''} 
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Sua resposta"
          />
        );
        
      case 'paragraph':
        return (
          <Textarea 
            id={question.id} 
            value={(response?.response as string) || ''} 
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Sua resposta"
          />
        );
        
      case 'multiple_choice':
        return (
          <RadioGroup 
            value={(response?.response as string) || ''}
            onValueChange={(value) => handleResponseChange(question.id, value)}
          >
            <div className="space-y-2">
              {question.options?.options?.map((option: string) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                  <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );
        
      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.options?.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox 
                  id={`${question.id}-${option}`} 
                  checked={(response?.response as string[] || []).includes(option)}
                  onCheckedChange={(checked) => handleCheckboxChange(question.id, option, !!checked)}
                />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        );
        
      case 'scale':
        const min = question.options?.min || 1;
        const max = question.options?.max || 5;
        return (
          <div className="space-y-4 py-2">
            <div className="flex justify-between items-center text-sm">
              <span>{min}</span>
              <span>{max}</span>
            </div>
            <Slider
              id={question.id}
              value={[parseInt(response?.response as string) || Math.round((min + max) / 2)]}
              min={min}
              max={max}
              step={1}
              onValueChange={(value) => handleResponseChange(question.id, value[0])}
              className="my-4"
            />
            <div className="text-center font-bold text-xl mt-2">
              {(response?.response as number) || Math.round((min + max) / 2)}
            </div>
          </div>
        );
        
      default:
        return <p>Tipo de questão não suportado</p>;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-orange-100 dark:bg-navy-dark">
        <Navbar />
        <div className="container mx-auto p-4 max-w-4xl flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (!poll) {
    return (
      <div className="min-h-screen flex flex-col bg-orange-100 dark:bg-navy-dark">
        <Navbar />
        <div className="container mx-auto p-4 max-w-4xl flex-grow">
          <Card className="bg-white dark:bg-navy-dark border border-gold/20">
            <CardContent className="pt-6 pb-8 px-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Formulário não encontrado</h2>
              <Button onClick={() => navigate("/")} className="mt-4">
                Voltar para a página inicial
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-orange-100 dark:bg-navy-dark">
      <Navbar />
      <div className="container mx-auto p-4 max-w-4xl flex-grow">
        <Card className="bg-white dark:bg-navy-dark border border-gold/20">
          <CardHeader>
            <CardTitle className="text-2xl text-navy dark:text-gold">{poll.title}</CardTitle>
            {poll.description && (
              <CardDescription className="mt-2">
                {poll.description}
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent>
            {!hasVoted ? (
              <div className="space-y-8">
                {/* Nome para usuários não logados */}
                {!user && (
                  <div className="space-y-2 mb-6">
                    <Label htmlFor="user-name" className="font-medium">
                      Seu Nome <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="user-name"
                      placeholder="Digite seu nome"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                    />
                  </div>
                )}
                
                {/* Perguntas */}
                {questions.map((question, index) => (
                  <div key={question.id} className="space-y-4 p-4 border rounded-lg bg-orange-50/30 dark:bg-navy-light/20">
                    <Label className="text-lg font-medium" htmlFor={question.id}>
                      {index + 1}. {question.question_text}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <div className="pt-2">
                      {renderQuestionInput(question, index)}
                    </div>
                  </div>
                ))}
                
                {/* Campo de comentários opcional */}
                {poll.allow_comments && (
                  <div className="space-y-2 mt-6">
                    <Label htmlFor="comment">Comentário (opcional)</Label>
                    <Textarea 
                      id="comment"
                      placeholder="Adicione um comentário adicional se desejar"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="resize-none h-24"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-lg">Obrigado por participar!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Suas respostas foram registradas com sucesso.
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Você será redirecionado para a página inicial em alguns segundos...
                </p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
            >
              Voltar para a página inicial
            </Button>
            
            {!hasVoted && (
              <Button 
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Enviando..." : "Enviar Respostas"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default FormPollPage;
