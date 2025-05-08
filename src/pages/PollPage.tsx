
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Poll, PollOption, FormattedPollResults } from "@/types/polls";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { format } from "date-fns";

const CHART_COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", 
  "#00C49F", "#FFBB28", "#FF8042", "#a4de6c", "#d0ed57"
];

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState<FormattedPollResults | null>(null);
  
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
            fetchPollResults();
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
  
  const fetchPollResults = async () => {
    if (!id) return;
    
    try {
      // Get the poll options with responses count
      const { data: optionsData, error: optionsError } = await supabase
        .from("poll_options")
        .select(`
          id,
          poll_id,
          option_text,
          created_at,
          poll_responses (count)
        `)
        .eq("poll_id", id);

      if (optionsError) throw optionsError;

      // Format the options with response count
      const formattedOptions = optionsData.map((option: any) => ({
        id: option.id,
        poll_id: option.poll_id,
        option_text: option.option_text,
        created_at: option.created_at,
        response_count: option.poll_responses.length
      }));

      // Get the responses with user info for comments
      const { data: responsesData, error: responsesError } = await supabase
        .from("poll_responses")
        .select(`
          id,
          poll_id,
          option_id,
          user_id,
          comment,
          created_at,
          poll_options (option_text)
        `)
        .eq("poll_id", id)
        .not("comment", "is", null);

      if (responsesError) throw responsesError;

      // Get user info for comments
      const userIds = responsesData
        .filter((r: any) => r.user_id)
        .map((r: any) => r.user_id);
      
      let usersMap: Record<string, { name?: string, email?: string }> = {};
      
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, email")
          .in("id", userIds);
          
        if (usersError) throw usersError;
        
        usersMap = usersData.reduce((acc: any, user: any) => {
          acc[user.id] = { name: user.name, email: user.email };
          return acc;
        }, {});
      }

      // Format the responses with user info
      const formattedResponses = responsesData.map((response: any) => ({
        id: response.id,
        poll_id: response.poll_id,
        option_id: response.option_id,
        user_id: response.user_id,
        comment: response.comment,
        created_at: response.created_at,
        option_text: response.poll_options?.option_text,
        user_name: response.user_id ? usersMap[response.user_id]?.name : "Anônimo",
        user_email: response.user_id ? usersMap[response.user_id]?.email : null
      }));

      // Calculate total votes
      const totalVotes = formattedOptions.reduce((sum, option) => sum + option.response_count, 0);

      setResults({
        poll: poll!,
        options: formattedOptions,
        responses: formattedResponses,
        totalVotes
      });
    } catch (error) {
      console.error("Error fetching poll results:", error);
    }
  };
  
  const handleSubmit = async () => {
    if (!selectedOption) {
      toast({
        title: "Seleção obrigatória",
        description: "Por favor, selecione uma opção para votar",
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
        comment: comment.trim() || null
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
      fetchPollResults();
      
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
            ) : results ? (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Resultados da Votação</h3>
                  {results.totalVotes > 0 ? (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={results.options.map(option => ({
                            name: option.option_text,
                            value: option.response_count,
                            percentage: results.totalVotes > 0 
                              ? `${Math.round((option.response_count / results.totalVotes) * 100)}%` 
                              : "0%"
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end"
                            height={70}
                            interval={0}
                          />
                          <YAxis allowDecimals={false} />
                          <RechartsTooltip 
                            formatter={(value: any, name: any, props: any) => [
                              `${value} votos (${props.payload.percentage})`,
                              "Quantidade"
                            ]} 
                          />
                          <Bar dataKey="value" fill="#8884d8" name="Votos">
                            {results.options.map((option, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={CHART_COLORS[index % CHART_COLORS.length]} 
                              />
                            ))}
                            <LabelList 
                              dataKey="percentage" 
                              position="top" 
                              style={{ fill: "#666", fontWeight: "bold" }} 
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center py-4">Esta enquete ainda não recebeu votos.</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-4">
                    Total de votos: {results.totalVotes}
                  </p>
                </div>
                
                {results.responses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Comentários ({results.responses.length})</h3>
                    <div className="space-y-4">
                      {results.responses.map((response) => (
                        <div 
                          key={response.id} 
                          className="p-4 border rounded-lg bg-orange-50/50 dark:bg-navy-light/20"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{response.user_name || "Anônimo"}</p>
                              <p className="text-sm text-muted-foreground">
                                Votou em: {response.option_text}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(response.created_at), "dd/MM/yyyy")}
                            </span>
                          </div>
                          <p className="mt-2">{response.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-lg">Obrigado por participar!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Seu voto foi registrado com sucesso.
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
