
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
          
        // If user is not logged in, only show public polls
        if (!user) {
          query = query.eq("is_public", true);
        }
        
        // Only show polls that haven't expired
        const now = new Date().toISOString();
        query = query.or(`expires_at.gt.${now},expires_at.is.null`);
        
        // Limit to 1
        query = query.limit(1);
        
        const { data, error } = await query;

        if (error) throw error;
        
        if (data && data.length > 0) {
          // Check if user has already voted
          if (user) {
            const { data: responseData, error: responseError } = await supabase
              .from("poll_responses")
              .select("id")
              .eq("poll_id", data[0].id)
              .eq("user_id", user.id)
              .limit(1);
              
            if (!responseError && (!responseData || responseData.length === 0)) {
              setActivePoll(data[0]);
            }
          } else if (data[0].is_public) {
            setActivePoll(data[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching active polls:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivePolls();
    
    // Set up a realtime subscription for polls
    const subscription = supabase
      .channel('poll-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'polls' 
      }, () => {
        fetchActivePolls();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleNavigateToVote = () => {
    if (activePoll) {
      navigate(`/enquete/${activePoll.id}`);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (loading || !activePoll || !isVisible) {
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
              Nova enquete
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
