
import { useState, useEffect, useCallback } from "react";
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

  // Memoizar a função de carregamento
  const loadClients = useCallback(async () => {
    try {
      console.log('Carregando dados do carrossel público...');
      const { data, error } = await supabase
        .from('carousel_items')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar dados do carrossel:', error);
        setClients([]);
        return;
      }

      console.log('Dados do carrossel carregados:', data);

      // Converter para o formato esperado pelo carrossel
      const formattedClients = ((data || []) as any[]).map((item: any, index: number) => ({
        id: item.id,
        name: item.name,
        logo_url: item.logo_url,
        instagram_url: item.instagram,
        whatsapp_url: item.whatsapp,
        order_index: index,
        active: true
      }));

      console.log('Clientes formatados:', formattedClients);
      setClients(formattedClients);
    } catch (error) {
      console.error('Erro ao carregar dados do carrossel:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
        (payload) => {
          console.log('Mudança detectada no carrossel:', payload);
          loadClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadClients]);

  return { clients, loading };
};
