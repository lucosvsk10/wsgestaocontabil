
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClientItem {
  id: string;
  name: string;
  logo_url: string;
  instagram_url?: string;
  whatsapp_url?: string;
  order_index: number;
  active: boolean;
}

export const useCarouselData = () => {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const { data, error } = await supabase
          .from('carousel_items' as any)
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Erro ao carregar dados do carrossel:', error);
          setClients([]);
          return;
        }

        // Converter para o formato esperado pelo carrossel
        const formattedClients = (data || []).map((item: any, index: number) => ({
          id: item.id,
          name: item.name,
          logo_url: item.logo_url,
          instagram_url: item.instagram,
          whatsapp_url: item.whatsapp,
          order_index: index,
          active: true
        }));

        setClients(formattedClients);
      } catch (error) {
        console.error('Erro ao carregar dados do carrossel:', error);
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    loadClients();

    // Listener para mudanças em tempo real
    const channel = supabase
      .channel('carousel_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'carousel_items' 
        }, 
        () => {
          loadClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { clients, loading };
};
