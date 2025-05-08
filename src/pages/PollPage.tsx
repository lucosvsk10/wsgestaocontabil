
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Poll, PollOption } from "@/types/polls";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input"; // Adicionado para campo de nome
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PollPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [comment, setComment] = useState("");
  const [userName, setUserName] = useState(""); // Campo para nome de usuário não logado
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  
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
            description: "Esta enquete é apenas para usuários logados",
            variant: "destructive",
          });
          navigate("/login");
          return;
        }
        
        // If poll has expired
        if (pollData.expires_at && new Date(pollData.expires_at) < new Date()) {
          toast({
            title: "Enquete expirada",
            description: "Esta enquete não está mais disponível para votação",
          });
          setHasVoted(true);
        }
        
        // Get poll options
        const { data: optionsData, error: optionsError } = await supabase
          .from("poll_options")
          .select("*")
          .eq("poll_id", id)
          .order("created_at", { ascending: true });
          
        if (optionsError) {
          throw optionsError;
        }
        
        setOptions(optionsData);
        
        // Check if user has already voted
        if (user) {
          const { data: responseData, error: responseError } = await supabase
            .from("poll_responses")
            .select("*")
            .eq("poll_id", id)
            .eq("user_id", user.id);
            
          if (!responseError && responseData && responseData.length > 0) {
            setHasVoted(true);
          }
        }
        
      } catch (error) {
        console.error("Error fetching poll:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a enquete",
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPoll();
  }, [id, user]);
  
  const handleSubmit = async () => {
    if (!selectedOption) {
      toast({
        title: "Seleção obrigatória",
        description: "Por favor, selecione uma opção para votar",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar se o nome foi preenchido para usuários não logados
    if (!user && !userName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome para registrar seu voto",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = {
        poll_id: id,
        option_id: selectedOption,
        user_id: user?.id || null,
        comment: comment.trim() || null,
        user_name: !user ? userName.trim() : undefined // Armazena o nome apenas para usuários não logados
      };
      
      const { error } = await supabase
        .from("poll_responses")
        .insert(response);
        
      if (error) throw error;
      
      toast({
        title: "Sucesso!",
        description: "Seu voto foi registrado com sucesso",
      });
      
      setHasVoted(true);

      // Redirecionar para página principal após alguns segundos
      setTimeout(() => {
        navigate("/");
      }, 3000);
      
    } catch (error) {
      console.error("Error submitting vote:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar seu voto",
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
              <h2 className="text-xl font-semibold mb-4">Enquete não encontrada</h2>
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
              <div className="space-y-6">
                <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="space-y-3">
                  {options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="text-base">
                        {option.option_text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                
                {/* Campo de nome para usuários não logados */}
                {!user && (
                  <div className="space-y-2 mt-6">
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
                
                {poll.allow_comments && (
                  <div className="space-y-2 mt-6">
                    <Label htmlFor="comment">Comentário (opcional)</Label>
                    <Textarea 
                      id="comment"
                      placeholder="Adicione um comentário à sua resposta"
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
                  Seu voto foi registrado com sucesso.
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
                disabled={!selectedOption || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Enviando..." : "Votar"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default PollPage;
