
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaxSimulation, ClientAnnouncement, FiscalEvent, CompanyData } from '@/types/client';
import { useToast } from '@/hooks/use-toast';

export const useClientData = () => {
  const [simulations, setSimulations] = useState<TaxSimulation[]>([]);
  const [announcements, setAnnouncements] = useState<ClientAnnouncement[]>([]);
  const [fiscalEvents, setFiscalEvents] = useState<FiscalEvent[]>([]);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const { toast } = useToast();

  const fetchSimulations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tax_simulations')
        .select('*')
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      setSimulations(data || []);
    } catch (error) {
      console.error('Erro ao buscar simulações:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar simulações',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('client_announcements')
        .select('*')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Erro ao buscar comunicados:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar comunicados',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const fetchFiscalEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fiscal_events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      
      // Atualizar status baseado na data
      const today = new Date().toISOString().split('T')[0];
      const eventsWithStatus = data?.map(event => {
        const eventStatus = event.status as 'upcoming' | 'today' | 'overdue' | 'completed';
        if (event.date === today) {
          return { ...event, status: 'today' as const };
        } else if (event.date < today && eventStatus !== 'completed') {
          return { ...event, status: 'overdue' as const };
        }
        return { ...event, status: eventStatus };
      }) || [];

      setFiscalEvents(eventsWithStatus);
    } catch (error) {
      console.error('Erro ao buscar eventos fiscais:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar agenda fiscal',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const fetchCompanyData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('company_data')
        .select('*')
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Row not found
          throw error;
        }
        setCompanyData(null);
        return;
      }
      
      setCompanyData(data);
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados da empresa',
        variant: 'destructive'
      });
    }
  }, [toast]);

  return {
    simulations,
    announcements,
    fiscalEvents,
    companyData,
    fetchSimulations,
    fetchAnnouncements,
    fetchFiscalEvents,
    fetchCompanyData
  };
};
