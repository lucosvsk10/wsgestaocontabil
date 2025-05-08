
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Poll, NumericalQuestion } from "@/types/polls";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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

const NumericalPollPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [poll, setPoll] = useState<Poll | null>(null);
  const [questions, setQuestions] = useState<NumericalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [userName, setUserName] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  
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
        
        // Make sure it's a numerical poll
        if (pollData.poll_type !== 'numerical') {
          toast({
            title: "Tipo de enquete incorreto",
            description: "Este link é para um formulário numérico, mas o ID fornecido é para outro tipo de enquete",
            variant: "destructive",
          });
          navigate("/");
          return;
        }
        
        // Get questions
        const { data: questionsData, error: questionsError } = await supabase
          .from("numerical_questions")
          .select("*")
          .eq("poll_id", id)
          .order("created_at", { ascending: true });
          
        if (questionsError) {
          throw questionsError;
        }
        
        setQuestions(questionsData || []);
        
        // Initialize answers with default values
        const initialAnswers: Record<string, number> = {};
        questionsData.forEach((question: NumericalQuestion) => {
          initialAnswers[question.id] = Math.round((question.min_value + question.max_value) / 2);
        });
        setAnswers(initialAnswers);
        
        // Check if user has already voted
        if (user) {
          const { data: responseData, error: responseError } = await supabase
            .from("numerical_responses")
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
  
  const handleAnswerChange = (questionId: string, value: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
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
    
    // Verificar se todas as perguntas foram respondidas
    const allQuestionsAnswered = questions.every(q => answers[q.id] !== undefined);
    if (!allQuestionsAnswered) {
      toast({
        title: "Formulário incompleto",
        description: "Por favor, responda todas as perguntas",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const responses = questions.map(question => ({
        poll_id: id,
        question_id: question.id,
        user_id: user?.id || null,
        user_name: !user ? userName.trim() : null,
        value: answers[question.id]
      }));
      
      const { error } = await supabase
        .from("numerical_responses")
        .insert(responses);
        
      if (error) throw error;
      
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
                    </Label>
                    <div className="space-y-6 pt-2">
                      <div className="flex justify-between items-center text-sm">
                        <span>{question.min_value}</span>
                        <span>{question.max_value}</span>
                      </div>
                      <Slider
                        id={question.id}
                        value={[answers[question.id] || Math.round((question.min_value + question.max_value) / 2)]}
                        min={question.min_value}
                        max={question.max_value}
                        step={1}
                        onValueChange={(value) => handleAnswerChange(question.id, value[0])}
                        className="my-4"
                      />
                      <div className="text-center font-bold text-xl mt-2">
                        {answers[question.id] || Math.round((question.min_value + question.max_value) / 2)}
                      </div>
                    </div>
                  </div>
                ))}
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

export default NumericalPollPage;
