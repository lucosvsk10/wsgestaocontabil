
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CarouselItem {
  id: string;
  name: string;
  logo_url: string;
  instagram?: string;
  whatsapp?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface NewCarouselItem {
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
      const { data, error } = await supabase
        .from('carousel_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
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

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('carousel-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('carousel-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro",
        description: "Falha no upload da logo",
        variant: "destructive"
      });
      return null;
    }
  };

  const addItem = async (itemData: NewCarouselItem, logoFile: File): Promise<boolean> => {
    setUploading(true);
    try {
      // Upload da logo
      const logoUrl = await uploadLogo(logoFile);
      if (!logoUrl) {
        setUploading(false);
        return false;
      }

      // Criar item no banco
      const { data, error } = await supabase
        .from('carousel_items')
        .insert([{
          ...itemData,
          logo_url: logoUrl
        }])
        .select()
        .single();

      if (error) throw error;

      setItems(prev => [data as CarouselItem, ...prev]);
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
    } finally {
      setUploading(false);
    }
  };

  const updateItem = async (id: string, updates: Partial<CarouselItem>): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('carousel_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...data as CarouselItem } : item
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

  const deleteItem = async (id: string): Promise<void> => {
    try {
      // Buscar item para obter URL da logo
      const item = items.find(i => i.id === id);
      
      // Deletar do banco
      const { error } = await supabase
        .from('carousel_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Tentar deletar logo do storage (não crítico se falhar)
      if (item?.logo_url) {
        try {
          const path = item.logo_url.split('/').pop();
          if (path) {
            await supabase.storage
              .from('carousel-logos')
              .remove([`logos/${path}`]);
          }
        } catch (storageError) {
          console.warn('Erro ao deletar logo do storage:', storageError);
        }
      }

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

  const toggleStatus = async (id: string, currentStatus: string): Promise<void> => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await updateItem(id, { status: newStatus });
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return {
    items,
    loading,
    uploading,
    addItem,
    updateItem,
    deleteItem,
    toggleStatus,
    refetchItems: fetchItems
  };
};
