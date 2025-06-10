
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CarouselItem } from '../types';

export const useCarouselDatabase = () => {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('carousel_items' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data as any[]) || []);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar itens do carrossel",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (itemData: Omit<CarouselItem, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('carousel_items' as any)
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;

      setItems(prev => [data as any, ...prev]);
      toast({
        title: "Sucesso",
        description: "Item adicionado ao carrossel"
      });
      return true;
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar item",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateItem = async (id: string, updates: Partial<CarouselItem>) => {
    try {
      const { data, error } = await supabase
        .from('carousel_items' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...(data as any) } : item
      ));
      
      toast({
        title: "Sucesso",
        description: "Item atualizado com sucesso"
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar item",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('carousel_items' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Sucesso",
        description: "Item removido do carrossel"
      });
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover item",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    refetchItems: fetchItems
  };
};
