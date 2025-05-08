
import { useState, useEffect } from "react";
import { Poll } from "@/types/polls";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

interface UsePollsResult {
  polls: Poll[];
  loading: boolean;
  selectedPollId: string | null;
  setSelectedPollId: (id: string | null) => void;
}

export const usePolls = (initialSelectedPoll: Poll | null = null): UsePollsResult => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(
    initialSelectedPoll?.id || null
  );
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
        
        // If a poll was preselected or if there are polls available
        if (initialSelectedPoll && !selectedPollId) {
          setSelectedPollId(initialSelectedPoll.id);
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
  }, [initialSelectedPoll, selectedPollId, toast]);

  return {
    polls,
    loading,
    selectedPollId,
    setSelectedPollId
  };
};
