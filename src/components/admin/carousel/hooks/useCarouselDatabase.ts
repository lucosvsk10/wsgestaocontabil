
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
      console.log('Buscando itens do carrossel...');
      const { data, error } = await supabase
        .from('carousel_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro detalhado ao buscar itens:', error);
        throw error;
      }

      console.log('Itens carregados:', data);
      setItems((data || []) as CarouselItem[]);
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

  const addItem = async (itemData: Omit<CarouselItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Adicionando item:', itemData);
      
      // Validação frontend
      if (!itemData.name || !itemData.logo_url) {
        console.error('Dados inválidos:', itemData);
        toast({
          title: "Erro de Validação",
          description: "Nome da empresa e logo são obrigatórios",
          variant: "destructive"
        });
        return false;
      }

      const { data, error } = await supabase
        .from('carousel_items')
        .insert([itemData])
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado ao adicionar item:', error);
        throw error;
      }

      console.log('Item adicionado com sucesso:', data);
      
      // Refresh completo da lista
      await fetchItems();
      
      toast({
        title: "Sucesso",
        description: "Item adicionado ao carrossel"
      });
      return true;
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast({
        title: "Erro",
        description: `Falha ao adicionar item: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
      return false;
    }
  };

  const updateItem = async (id: string, updates: Partial<CarouselItem>) => {
    try {
      console.log('Atualizando item:', id, updates);
      
      // Validação frontend
      if (updates.name !== undefined && !updates.name) {
        console.error('Nome não pode estar vazio');
        toast({
          title: "Erro de Validação",
          description: "Nome da empresa não pode estar vazio",
          variant: "destructive"
        });
        return false;
      }

      if (updates.logo_url !== undefined && !updates.logo_url) {
        console.error('Logo URL não pode estar vazio');
        toast({
          title: "Erro de Validação",
          description: "Logo é obrigatória",
          variant: "destructive"
        });
        return false;
      }

      const { data, error } = await supabase
        .from('carousel_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado ao atualizar item:', error);
        throw error;
      }

      console.log('Item atualizado com sucesso:', data);
      
      // Refresh completo da lista para garantir que as mudanças sejam refletidas
      await fetchItems();
      
      toast({
        title: "Sucesso",
        description: "Item atualizado com sucesso"
      });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast({
        title: "Erro",
        description: `Falha ao atualizar item: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      console.log('Deletando item:', id);
      
      const { error } = await supabase
        .from('carousel_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro detalhado ao deletar item:', error);
        throw error;
      }

      console.log('Item deletado com sucesso');
      
      // Refresh completo da lista
      await fetchItems();
      
      toast({
        title: "Sucesso",
        description: "Item removido do carrossel"
      });
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      toast({
        title: "Erro",
        description: `Falha ao remover item: ${error.message || 'Erro desconhecido'}`,
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
