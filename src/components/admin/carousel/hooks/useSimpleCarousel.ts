import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CarouselItem {
  id: string;
  company_id?: string | null;
  name: string;
  logo_url: string;
  instagram?: string;
  whatsapp?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface NewCarouselItem {
  company_id: string;
  name: string;
  logo_url: string;
  instagram?: string;
  whatsapp?: string;
}

export const useSimpleCarousel = () => {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase.from('carousel_items').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data || []) as CarouselItem[]);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar itens do carrossel', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const addItem = async (itemData: NewCarouselItem): Promise<boolean> => {
    if (!itemData.logo_url) {
      toast({ title: 'Logo necessária', description: 'Adicione a logo no cadastro central da empresa antes de publicá-la no carrossel.', variant: 'destructive' });
      return false;
    }
    setUploading(true);
    try {
      const { data, error } = await supabase.from('carousel_items').insert([itemData as never]).select().single();
      if (error) throw error;
      setItems(prev => [data as CarouselItem, ...prev]);
      toast({ title: 'Sucesso', description: 'Empresa adicionada ao carrossel' });
      return true;
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast({ title: 'Erro', description: 'Falha ao adicionar empresa ao carrossel', variant: 'destructive' });
      return false;
    } finally { setUploading(false); }
  };

  const updateItem = async (id: string, updates: Partial<CarouselItem>): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from('carousel_items').update(updates as never).eq('id', id).select().single();
      if (error) throw error;
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...(data as CarouselItem) } : item));
      return true;
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast({ title: 'Erro', description: 'Falha ao atualizar item', variant: 'destructive' });
      return false;
    }
  };

  const deleteItem = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('carousel_items').delete().eq('id', id);
      if (error) throw error;
      setItems(prev => prev.filter(item => item.id !== id));
      toast({ title: 'Sucesso', description: 'Item removido do carrossel' });
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      toast({ title: 'Erro', description: 'Falha ao remover item', variant: 'destructive' });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string): Promise<void> => {
    await updateItem(id, { status: currentStatus === 'active' ? 'inactive' : 'active' });
  };

  useEffect(() => { void fetchItems(); }, []);
  return { items, loading, uploading, addItem, updateItem, deleteItem, toggleStatus, refetchItems: fetchItems };
};
