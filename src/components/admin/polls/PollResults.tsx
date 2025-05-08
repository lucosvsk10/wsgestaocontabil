import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Poll, FormattedPollResults, PollOptionWithVoteCount } from "@/types/polls";
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
  const [results, setResults] = useState<FormattedPollResults | null>(null);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
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
      fetchPollResults(selectedPollId);
    }
  }, [selectedPollId]);

  const fetchPollResults = async (pollId: string) => {
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

      setResults({
        poll: pollData,
        options: formattedOptions,
        responses: formattedResponses,
        totalVotes
      });
    } catch (error) {
      console.error("Error fetching poll results:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao buscar os resultados da enquete",
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

  if (loading && !results) {
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
                {poll.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {results && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{results.poll.title}</CardTitle>
              <CardDescription>
                {results.poll.description}
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>Criada em: {format(new Date(results.poll.created_at), "dd/MM/yyyy")}</p>
                  {results.poll.expires_at && (
                    <p>Expira em: {format(new Date(results.poll.expires_at), "dd/MM/yyyy")}</p>
                  )}
                  <p className="font-medium mt-1">Total de votos: {results.totalVotes}</p>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.totalVotes > 0 ? (
                <div className="h-[300px] w-full mt-4">
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
            </CardContent>
          </Card>

          {results.responses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comentários ({results.responses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.responses.map((response) => (
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
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
