import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      const { data, error } = await supabase
        .from('carousel_items')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) {
        if (import.meta.env.DEV) console.warn('Carrossel público indisponível:', error.message);
        setClients([]);
        return;
      }

      // Converter para o formato esperado pelo carrossel
      const formattedClients = ((data || []) as any[]).map((item: any, index: number) => ({
        id: item.id,
        name: item.name,
        logo_url: item.logo_url,
        instagram_url: item.instagram,
        whatsapp_url: item.whatsapp,
        order_index: index,
        active: true,
      }));

      setClients(formattedClients);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Carrossel público indisponível:', error);
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carousel_items',
        },
        () => loadClients()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadClients]);

  return { clients, loading };
};
