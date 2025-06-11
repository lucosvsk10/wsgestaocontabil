
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CarouselItem {
  id: string;
  name: string;
  logo_url: string;
  instagram?: string;
  whatsapp?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export const useSimpleCarousel = () => {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchItems = async () => {
    try {
      // Usar query SQL direta já que a tabela ainda não está nos tipos
      const { data, error } = await supabase
        .rpc('get_carousel_items');

      if (error) {
        console.log('Tabela ainda não existe, retornando array vazio');
        setItems([]);
      } else {
        setItems(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      setItems([]);
      toast({
        title: "Erro",
        description: "Falha ao carregar itens do carrossel",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (file: File, companyName: string): Promise<string> => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const sanitizedName = companyName.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      const timestamp = Date.now();
      const uniqueFileName = `${sanitizedName}_${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('carousel-logos')
        .upload(uniqueFileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('carousel-logos')
        .getPublicUrl(uniqueFileName);

      toast({
        title: "Sucesso",
        description: "Logo enviada com sucesso"
      });

      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar logo",
        variant: "destructive"
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const addItem = async (itemData: Omit<CarouselItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .rpc('insert_carousel_item', {
          p_name: itemData.name,
          p_logo_url: itemData.logo_url,
          p_instagram: itemData.instagram,
          p_whatsapp: itemData.whatsapp,
          p_status: itemData.status
        });

      if (error) throw error;

      // Recarregar a lista
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
        description: "Falha ao adicionar item",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateItem = async (id: string, updates: Partial<CarouselItem>) => {
    try {
      const { error } = await supabase
        .rpc('update_carousel_item', {
          p_id: id,
          p_name: updates.name,
          p_instagram: updates.instagram,
          p_whatsapp: updates.whatsapp,
          p_status: updates.status
        });

      if (error) throw error;

      // Recarregar a lista
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
        description: "Falha ao atualizar item",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .rpc('delete_carousel_item', { p_id: id });

      if (error) throw error;

      // Recarregar a lista
      await fetchItems();
      
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
    uploading,
    addItem,
    updateItem,
    deleteItem,
    uploadLogo,
    refetchItems: fetchItems
  };
};
