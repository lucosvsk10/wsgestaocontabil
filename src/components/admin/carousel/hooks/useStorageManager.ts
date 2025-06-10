
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StorageLogo } from '../types';

export const useStorageManager = () => {
  const [logos, setLogos] = useState<StorageLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLogos = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('carousel-logos')
        .list('', {
          limit: 100,
          offset: 0
        });

      if (error) throw error;

      const logosWithUrls = (data || []).map(file => {
        const { data: urlData } = supabase.storage
          .from('carousel-logos')
          .getPublicUrl(file.name);

        return {
          name: file.name,
          url: urlData.publicUrl,
          size: file.metadata?.size || 0,
          lastModified: file.updated_at || file.created_at || ''
        };
      });

      setLogos(logosWithUrls);
    } catch (error) {
      console.error('Erro ao buscar logos:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar logos do storage",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (file: File, companyName: string) => {
    try {
      setLoading(true);
      
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

      await fetchLogos();
      
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
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteLogo = async (logoName: string) => {
    try {
      const { error } = await supabase.storage
        .from('carousel-logos')
        .remove([logoName]);

      if (error) throw error;

      await fetchLogos();
      
      toast({
        title: "Sucesso",
        description: "Logo removida com sucesso"
      });
    } catch (error) {
      console.error('Erro ao deletar logo:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover logo",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchLogos();
  }, []);

  return {
    logos,
    loading,
    uploadLogo,
    deleteLogo,
    refetchLogos: fetchLogos
  };
};
