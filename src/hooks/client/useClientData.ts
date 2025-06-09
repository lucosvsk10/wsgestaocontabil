
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaxSimulation, FiscalEvent, CompanyData, ClientAnnouncement } from '@/types/client';

export const useClientData = () => {
  const { user } = useAuth();
  const [simulations, setSimulations] = useState<TaxSimulation[]>([]);
  const [announcements, setAnnouncements] = useState<ClientAnnouncement[]>([]);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [fiscalEvents, setFiscalEvents] = useState<FiscalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSimulations = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tax_simulations')
        .select('*')
        .eq('user_id', user.id)
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      setSimulations(data || []);
    } catch (error) {
      console.error('Error fetching simulations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchAnnouncements = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .or(`target_type.eq.all_users,target_type.eq.logged_users,and(target_type.eq.specific_user,target_user_id.eq.${user.id})`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedAnnouncements: ClientAnnouncement[] = (data || []).map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        created_at: announcement.created_at,
        expires_at: announcement.expires_at,
        theme: announcement.theme,
        action_button_text: announcement.action_button_text,
        action_button_url: announcement.action_button_url
      }));
      
      setAnnouncements(mappedAnnouncements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  }, [user?.id]);

  const fetchCompanyData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const mockData: CompanyData = {
        id: user.id,
        user_id: user.id, // Added missing user_id
        name: "Empresa Exemplo LTDA",
        cnpj: "12.345.678/0001-90",
        opening_date: "2020-01-15",
        tax_regime: "Simples Nacional",
        accountant_name: "WS Gestão Contábil",
        accountant_contact: "(11) 9999-9999",
        address: "Rua Exemplo, 123 - São Paulo/SP",
        phone: "(11) 8888-8888",
        email: user.email || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCompanyData(mockData);
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  }, [user?.id, user?.email]);

  const fetchFiscalEvents = useCallback(async () => {
    const mockEvents: FiscalEvent[] = [
      {
        id: '1',
        title: 'DAS - Simples Nacional',
        date: '2024-01-20',
        description: 'Vencimento do DAS referente ao mês de dezembro/2023',
        status: 'upcoming',
        category: 'Tributos',
        created_at: new Date().toISOString(),
        created_by: null
      },
      {
        id: '2', 
        title: 'DEFIS - Declaração EFD-ICMS/IPI',
        date: '2024-01-31',
        description: 'Entrega da declaração fiscal digital',
        status: 'today',
        category: 'Declarações',
        created_at: new Date().toISOString(),
        created_by: null
      },
      {
        id: '3',
        title: 'Relatório Mensal',
        date: '2024-01-10',
        description: 'Envio do relatório contábil mensal',
        status: 'overdue',
        category: 'Relatórios',
        created_at: new Date().toISOString(),
        created_by: null
      }
    ];
    setFiscalEvents(mockEvents);
  }, []);

  return {
    simulations,
    announcements,
    companyData,
    fiscalEvents,
    isLoading,
    fetchSimulations,
    fetchAnnouncements,
    fetchCompanyData,
    fetchFiscalEvents
  };
};
