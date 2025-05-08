
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Poll, 
  FormattedPollResults, 
  PollOptionWithVoteCount,
  FormattedNumericalResults,
  FormattedFormResults,
  NumericalQuestion,
  FormQuestion
} from "@/types/polls";
import { useToast } from "@/components/ui/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface PollResultsProps {
  selectedPoll: Poll | null;
}

const CHART_COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", 
  "#00C49F", "#FFBB28", "#FF8042", "#a4de6c", "#d0ed57"
];

export const PollResults = ({ selectedPoll }: PollResultsProps) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [standardResults, setStandardResults] = useState<FormattedPollResults | null>(null);
  const [numericalResults, setNumericalResults] = useState<FormattedNumericalResults | null>(null);
  const [formResults, setFormResults] = useState<FormattedFormResults | null>(null);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [visibleTab, setVisibleTab] = useState<string>("summary");
  const { toast } = useToast();

  useEffect(() => {
    const fetchPolls = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("polls")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPolls(data || []);
        
        // If a poll was preselected from the manage tab
        if (selectedPoll && !selectedPollId) {
          setSelectedPollId(selectedPoll.id);
        } else if (data && data.length > 0 && !selectedPollId) {
          setSelectedPollId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching polls:", error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao buscar as enquetes",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, [selectedPoll]);

  useEffect(() => {
    if (selectedPollId) {
      const currentPoll = polls.find(p => p.id === selectedPollId);
      if (currentPoll) {
        if (currentPoll.poll_type === 'standard_options') {
          fetchStandardPollResults(selectedPollId);
          setNumericalResults(null);
          setFormResults(null);
        } else if (currentPoll.poll_type === 'numerical') {
          fetchNumericalPollResults(selectedPollId);
          setStandardResults(null);
          setFormResults(null);
        } else if (currentPoll.poll_type === 'form') {
          fetchFormPollResults(selectedPollId);
          setStandardResults(null);
          setNumericalResults(null);
        }
      }
    }
  }, [selectedPollId, polls]);

  const fetchStandardPollResults = async (pollId: string) => {
    setLoading(true);
    try {
      // Get the poll
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .select("*")
        .eq("id", pollId)
        .single();

      if (pollError) throw pollError;

      // Get the options with responses count
      const { data: optionsData, error: optionsError } = await supabase
        .from("poll_options")
        .select(`
          id,
          poll_id,
          option_text,
          created_at,
          poll_responses (count)
        `)
        .eq("poll_id", pollId);

      if (optionsError) throw optionsError;

      // Format the options with response count
      const formattedOptions: PollOptionWithVoteCount[] = optionsData.map((option: any) => ({
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
          user_name,
          comment,
          created_at,
          poll_options (option_text)
        `)
        .eq("poll_id", pollId)
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
        // Priorizar o nome do usuário logado, caso contrário usar o nome fornecido
        user_name: response.user_id 
          ? (usersMap[response.user_id]?.name || "Usuário") 
          : (response.user_name || "Anônimo"),
        user_email: response.user_id ? usersMap[response.user_id]?.email : null
      }));

      // Calculate total votes
      const totalVotes = formattedOptions.reduce((sum, option) => sum + option.response_count, 0);

      setStandardResults({
        poll: pollData,
        options: formattedOptions,
        responses: formattedResponses,
        totalVotes
      });
    } catch (error) {
      console.error("Error fetching standard poll results:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao buscar os resultados da enquete",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNumericalPollResults = async (pollId: string) => {
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

      setNumericalResults({
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

  const fetchFormPollResults = async (pollId: string) => {
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

      // Get responses
      const { data: responsesData, error: responsesError } = await supabase
        .from("form_responses")
        .select("*")
        .eq("poll_id", pollId);

      if (responsesError) throw responsesError;

      // Calculate statistics for each question
      const stats = questionsData.map((question: FormQuestion) => {
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

      setFormResults({
        poll: pollData,
        questions: questionsData,
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

  const handlePollChange = (pollId: string) => {
    setSelectedPollId(pollId);
  };

  const formatToPercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  };
  
  const renderStandardPollResults = () => {
    if (!standardResults) return null;
    
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{standardResults.poll.title}</CardTitle>
            <CardDescription>
              {standardResults.poll.description}
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Criada em: {format(new Date(standardResults.poll.created_at), "dd/MM/yyyy")}</p>
                {standardResults.poll.expires_at && (
                  <p>Expira em: {format(new Date(standardResults.poll.expires_at), "dd/MM/yyyy")}</p>
                )}
                <p className="font-medium mt-1">Total de votos: {standardResults.totalVotes}</p>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={visibleTab} onValueChange={setVisibleTab}>
              <TabsList>
                <TabsTrigger value="summary">Resumo</TabsTrigger>
                {standardResults.responses.length > 0 && (
                  <TabsTrigger value="comments">
                    Comentários ({standardResults.responses.length})
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="summary">
                {standardResults.totalVotes > 0 ? (
                  <div className="space-y-8">
                    <div className="h-[300px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={standardResults.options.map(option => ({
                            name: option.option_text,
                            value: option.response_count,
                            percentage: standardResults.totalVotes > 0 
                              ? `${Math.round((option.response_count / standardResults.totalVotes) * 100)}%` 
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
                            {standardResults.options.map((option, index) => (
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
                    
                    <div className="h-[300px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={standardResults.options.map(option => ({
                              name: option.option_text,
                              value: option.response_count
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {standardResults.options.map((option, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={CHART_COLORS[index % CHART_COLORS.length]} 
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => [`${value} votos`, ""]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-4">Esta enquete ainda não recebeu votos.</p>
                )}
              </TabsContent>
              
              <TabsContent value="comments">
                <div className="space-y-4">
                  {standardResults.responses.map((response) => (
                    <div 
                      key={response.id} 
                      className="p-4 border rounded-lg bg-orange-50/50 dark:bg-navy-light/20"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {response.user_name || "Anônimo"}
                            {response.user_email && ` (${response.user_email})`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Votou em: {response.option_text}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(response.created_at), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                      <p className="mt-2">{response.comment}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const renderNumericalPollResults = () => {
    if (!numericalResults) return null;
    
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{numericalResults.poll.title}</CardTitle>
            <CardDescription>
              {numericalResults.poll.description}
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Criada em: {format(new Date(numericalResults.poll.created_at), "dd/MM/yyyy")}</p>
                {numericalResults.poll.expires_at && (
                  <p>Expira em: {format(new Date(numericalResults.poll.expires_at), "dd/MM/yyyy")}</p>
                )}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {numericalResults.stats.length === 0 ? (
              <p className="text-center py-4">Este formulário não possui perguntas.</p>
            ) : (
              <div className="space-y-8">
                {numericalResults.stats.map((stat, index) => (
                  <div key={stat.questionId} className="space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="font-medium text-lg">{index + 1}. {stat.questionText}</h3>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span>Média: <strong>{stat.averageValue}</strong></span>
                        <span>Min: <strong>{stat.minValue}</strong></span>
                        <span>Max: <strong>{stat.maxValue}</strong></span>
                        <span>Respostas: <strong>{stat.responseCount}</strong></span>
                      </div>
                    </div>
                    
                    {stat.responseCount > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={Object.entries(stat.valueDistribution).map(([value, count]) => ({
                              value: parseInt(value),
                              count
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="value" 
                              label={{ value: 'Valor', position: 'insideBottom', offset: -5 }} 
                            />
                            <YAxis 
                              allowDecimals={false} 
                              label={{ value: 'Respostas', angle: -90, position: 'insideLeft' }} 
                            />
                            <RechartsTooltip 
                              formatter={(value: any) => [`${value} respostas`, "Quantidade"]} 
                            />
                            <Bar dataKey="count" name="Respostas">
                              {Object.keys(stat.valueDistribution).map((_, i) => (
                                <Cell 
                                  key={`cell-${i}`} 
                                  fill={CHART_COLORS[i % CHART_COLORS.length]} 
                                />
                              ))}
                              <LabelList dataKey="count" position="top" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-center py-4">Esta pergunta ainda não recebeu respostas.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const renderFormPollResults = () => {
    if (!formResults) return null;
    
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{formResults.poll.title}</CardTitle>
            <CardDescription>
              {formResults.poll.description}
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Criada em: {format(new Date(formResults.poll.created_at), "dd/MM/yyyy")}</p>
                {formResults.poll.expires_at && (
                  <p>Expira em: {format(new Date(formResults.poll.expires_at), "dd/MM/yyyy")}</p>
                )}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formResults.stats.length === 0 ? (
              <p className="text-center py-4">Este formulário não possui perguntas.</p>
            ) : (
              <div className="space-y-10">
                {formResults.stats.map((stat, index) => {
                  const question = formResults.questions.find(q => q.id === stat.questionId);
                  if (!question) return null;
                  
                  return (
                    <div key={stat.questionId} className="space-y-4">
                      <div className="border-b pb-2">
                        <h3 className="font-medium text-lg">{index + 1}. {stat.questionText}</h3>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span>Tipo: <strong>
                            {question.question_type === 'short_text' && 'Texto curto'}
                            {question.question_type === 'paragraph' && 'Parágrafo'}
                            {question.question_type === 'multiple_choice' && 'Múltipla escolha'}
                            {question.question_type === 'checkbox' && 'Checkbox'}
                            {question.question_type === 'scale' && 'Escala'}
                          </strong></span>
                          <span>Respostas: <strong>{stat.responseCount}</strong></span>
                        </div>
                      </div>
                      
                      {stat.responseCount > 0 ? (
                        <>
                          {(question.question_type === 'multiple_choice' || 
                            question.question_type === 'checkbox' || 
                            question.question_type === 'scale') && (
                            <div className="h-[250px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={Object.entries(stat.responseDistribution).map(([label, count]) => ({
                                    label,
                                    count
                                  }))}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis 
                                    dataKey="label" 
                                    angle={-45}
                                    textAnchor="end"
                                    height={70}
                                    interval={0}
                                  />
                                  <YAxis allowDecimals={false} />
                                  <RechartsTooltip 
                                    formatter={(value: any) => [`${value} respostas`, "Quantidade"]} 
                                  />
                                  <Bar dataKey="count" name="Respostas" fill="#8884d8">
                                    {Object.keys(stat.responseDistribution).map((_, i) => (
                                      <Cell 
                                        key={`cell-${i}`} 
                                        fill={CHART_COLORS[i % CHART_COLORS.length]} 
                                      />
                                    ))}
                                    <LabelList dataKey="count" position="top" />
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                          
                          {(question.question_type === 'short_text' || 
                            question.question_type === 'paragraph') && (
                            <div className="border rounded-md p-4">
                              <p className="text-sm text-muted-foreground mb-4">
                                {stat.responseCount} respostas de texto recebidas. 
                                Respostas de texto não são exibidas em gráficos.
                              </p>
                              <div className="space-y-2">
                                <p className="font-medium">Últimas respostas:</p>
                                {formResults.responses
                                  .filter(r => r.question_id === stat.questionId)
                                  .slice(0, 5)
                                  .map(response => (
                                    <div 
                                      key={response.id} 
                                      className="p-2 border rounded bg-orange-50/50 dark:bg-navy-light/20"
                                    >
                                      <p className="text-sm">{response.response_value}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {response.user_name || 'Anônimo'} - 
                                        {format(new Date(response.created_at), " dd/MM/yyyy HH:mm")}
                                      </p>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-center py-4">Esta pergunta ainda não recebeu respostas.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading && !standardResults && !numericalResults && !formResults) {
    return <p className="text-center py-8">Carregando resultados...</p>;
  }

  if (polls.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-lg mb-4">Nenhuma enquete encontrada</p>
        <p className="text-sm text-muted-foreground">
          Crie uma nova enquete na aba "Criar nova enquete"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <Select 
          value={selectedPollId || ""} 
          onValueChange={handlePollChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma enquete" />
          </SelectTrigger>
          <SelectContent>
            {polls.map((poll) => (
              <SelectItem key={poll.id} value={poll.id}>
                {poll.title} - {
                  poll.poll_type === 'standard_options' ? 'Enquete Padrão' :
                  poll.poll_type === 'numerical' ? 'Formulário Numeral' :
                  'Formulário Completo'
                }
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {standardResults && renderStandardPollResults()}
      {numericalResults && renderNumericalPollResults()}
      {formResults && renderFormPollResults()}
    </div>
  );
};
