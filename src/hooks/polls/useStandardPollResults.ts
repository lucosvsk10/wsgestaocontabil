
import { useState, useEffect } from "react";
import { 
  FormattedPollResults, 
  Poll, 
  PollOptionWithVoteCount 
} from "@/types/polls";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

export const useStandardPollResults = (pollId: string | null) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FormattedPollResults | null>(null);
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

    fetchResults();
  }, [pollId]);

  return {
    loading,
    results
  };
};
