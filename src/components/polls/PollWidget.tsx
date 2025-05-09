
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Poll } from "@/types/polls";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PollWidget = () => {
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActivePolls = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("polls")
          .select("*")
          .order("created_at", { ascending: false });
          
        // Se o usuário não estiver logado, mostrar apenas enquetes públicas
        if (!user) {
          query = query.eq("is_public", true);
        }
        
        // Mostrar apenas enquetes não expiradas
        const now = new Date().toISOString();
        query = query.or(`expires_at.gt.${now},expires_at.is.null`);
        
        // Limitar a 1 resultado
        query = query.limit(1);
        
        const { data, error } = await query;

        if (error) throw error;
        
        if (data && data.length > 0) {
          // Primeiro, vamos obter a enquete potencial
          const potentialPoll = data[0];
          
          // Agora, verificamos se o usuário já votou
          let userHasVoted = false;
          
          if (user) {
            userHasVoted = await checkIfUserVoted(potentialPoll.id, user.id, potentialPoll.poll_type);
          } else {
            // Para usuários não logados, não podemos verificar, então sempre mostramos a enquete pública
            userHasVoted = false;
          }
          
          if (!userHasVoted) {
            setActivePoll(potentialPoll);
          } else {
            setHasVoted(true);
            setActivePoll(null);
          }
        }
      } catch (error) {
        console.error("Error fetching active polls:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivePolls();
    
    // Configurar uma assinatura em tempo real para mudanças nas enquetes
    const pollsSubscription = supabase
      .channel('poll-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'polls' 
      }, () => {
        fetchActivePolls();
      })
      .subscribe();
      
    // Configurar uma assinatura em tempo real para respostas de enquetes
    const responsesSubscription = supabase
      .channel('poll-responses-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'poll_responses',
        filter: user ? `user_id=eq.${user.id}` : undefined
      }, () => {
        fetchActivePolls();
      })
      .subscribe();
      
    // Configurar uma assinatura em tempo real para respostas numéricas
    const numericalResponsesSubscription = supabase
      .channel('numerical-responses-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'numerical_responses',
        filter: user ? `user_id=eq.${user.id}` : undefined
      }, () => {
        fetchActivePolls();
      })
      .subscribe();
      
    // Configurar uma assinatura em tempo real para respostas de formulários
    const formResponsesSubscription = supabase
      .channel('form-responses-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'form_responses',
        filter: user ? `user_id=eq.${user.id}` : undefined
      }, () => {
        fetchActivePolls();
      })
      .subscribe();
      
    return () => {
      pollsSubscription.unsubscribe();
      responsesSubscription.unsubscribe();
      numericalResponsesSubscription.unsubscribe();
      formResponsesSubscription.unsubscribe();
    };
  }, [user]);

  // Função para verificar se o usuário já votou em uma enquete específica
  const checkIfUserVoted = async (pollId: string, userId: string, pollType: string) => {
    try {
      // Para enquetes padrão (standard_options)
      if (pollType === 'standard_options') {
        const { data: responseData, error: responseError } = await supabase
          .from("poll_responses")
          .select("id")
          .eq("poll_id", pollId)
          .eq("user_id", userId)
          .limit(1);
          
        if (responseError) throw responseError;
        return responseData && responseData.length > 0;
      } 
      // Para enquetes numéricas
      else if (pollType === 'numerical') {
        const { data: responseData, error: responseError } = await supabase
          .from("numerical_responses")
          .select("id")
          .eq("poll_id", pollId)
          .eq("user_id", userId)
          .limit(1);
          
        if (responseError) throw responseError;
        return responseData && responseData.length > 0;
      }
      // Para formulários
      else if (pollType === 'form') {
        const { data: responseData, error: responseError } = await supabase
          .from("form_responses")
          .select("id")
          .eq("poll_id", pollId)
          .eq("user_id", userId)
          .limit(1);
          
        if (responseError) throw responseError;
        return responseData && responseData.length > 0;
      }

      return false;
    } catch (error) {
      console.error("Error checking if user voted:", error);
      return false;
    }
  };

  const handleNavigateToVote = () => {
    if (activePoll) {
      if (activePoll.poll_type === 'standard_options') {
        navigate(`/enquete/${activePoll.id}`);
      } else if (activePoll.poll_type === 'numerical') {
        navigate(`/enquete-numerica/${activePoll.id}`);
      } else if (activePoll.poll_type === 'form') {
        navigate(`/formulario/${activePoll.id}`);
      }
      
      // Esconde o widget após clicar para votar
      setIsVisible(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (loading || !activePoll || !isVisible || hasVoted) {
    return null;
  }

  return (
    <div className="fixed top-24 left-6 z-30 max-w-[300px]">
      <Card className="border-gold/30 shadow-md bg-white/80 dark:bg-navy-dark/90 backdrop-blur-sm relative">
        <Button 
          variant="ghost" 
          className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full hover:bg-gold/20" 
          onClick={handleClose}
        >
          <X size={14} className="text-navy dark:text-gold" />
          <span className="sr-only">Fechar enquete</span>
        </Button>
        <CardContent className="p-4">
          <div className="mb-2">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-gold/20 text-gold-dark dark:text-gold rounded-full mb-2">
              {activePoll.poll_type === 'standard_options' && 'Nova enquete'}
              {activePoll.poll_type === 'numerical' && 'Novo formulário numeral'}
              {activePoll.poll_type === 'form' && 'Novo formulário'}
            </span>
            <h4 className="font-medium text-navy dark:text-gold truncate">
              {activePoll.title}
            </h4>
          </div>
          <Button 
            className="w-full mt-2 flex items-center justify-between bg-gold hover:bg-gold-dark text-navy"
            onClick={handleNavigateToVote}
          >
            <span>Responder agora</span>
            <ChevronRight size={16} />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
