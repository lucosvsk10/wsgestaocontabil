
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Announcement, CreateAnnouncementData } from '@/types/announcements';

export const useAnnouncements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os anúncios (para admin)
  const {
    data: announcements = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!user
  });

  // Buscar anúncios ativos para exibição
  const {
    data: activeAnnouncements = [],
    refetch: refetchActiveAnnouncements
  } = useQuery({
    queryKey: ['active-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    }
  });

  // Criar anúncio
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: CreateAnnouncementData) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data: result, error } = await supabase
        .from('announcements')
        .insert({
          ...data,
          created_by: user.id,
          expires_at: data.expires_at?.toISOString() || null
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['active-announcements'] });
      toast({
        title: 'Sucesso',
        description: 'Anúncio criado com sucesso!'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao criar anúncio: ' + error.message,
        variant: 'destructive'
      });
    }
  });

  // Atualizar anúncio
  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateAnnouncementData> }) => {
      const { data: result, error } = await supabase
        .from('announcements')
        .update({
          ...data,
          expires_at: data.expires_at?.toISOString() || null
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['active-announcements'] });
      toast({
        title: 'Sucesso',
        description: 'Anúncio atualizado com sucesso!'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar anúncio: ' + error.message,
        variant: 'destructive'
      });
    }
  });

  // Deletar anúncio
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['active-announcements'] });
      toast({
        title: 'Sucesso',
        description: 'Anúncio excluído com sucesso!'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir anúncio: ' + error.message,
        variant: 'destructive'
      });
    }
  });

  // Marcar anúncio como visualizado
  const markAsViewed = async (announcementId: string) => {
    const sessionId = sessionStorage.getItem('session-id') || Math.random().toString(36);
    sessionStorage.setItem('session-id', sessionId);

    const { error } = await supabase
      .from('announcement_views')
      .insert({
        announcement_id: announcementId,
        user_id: user?.id || null,
        session_id: user ? null : sessionId
      });

    if (error) {
      console.error('Erro ao marcar anúncio como visualizado:', error);
    }
  };

  return {
    announcements,
    activeAnnouncements,
    isLoading,
    error,
    createAnnouncement: createAnnouncementMutation.mutate,
    updateAnnouncement: updateAnnouncementMutation.mutate,
    deleteAnnouncement: deleteAnnouncementMutation.mutate,
    isCreating: createAnnouncementMutation.isPending,
    isUpdating: updateAnnouncementMutation.isPending,
    isDeleting: deleteAnnouncementMutation.isPending,
    markAsViewed,
    refetchActiveAnnouncements
  };
};
