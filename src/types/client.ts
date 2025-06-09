export interface TaxSimulation {
  id: string;
  tipo_simulacao: string;
  rendimento_bruto: number;
  imposto_estimado: number;
  inss: number;
  dependentes?: number;
  saude?: number;
  educacao?: number;
  outras_deducoes?: number;
  nome?: string;
  email?: string;
  telefone?: string;
  data_criacao: string;
  user_id?: string;
}

export interface FiscalEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  category: string;
  status: 'upcoming' | 'today' | 'overdue' | 'completed';
  created_at: string;
  created_by: string | null;
}

export interface ClientAnnouncement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  expires_at?: string;
  theme: string;
  action_button_text?: string;
  action_button_url?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  expires_at?: string;
  priority: 'low' | 'medium' | 'high';
  published: boolean;
}

export interface CompanyData {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  tax_regime: string;
  opening_date: string;
  phone: string;
  email: string;
  accountant_name: string;
  accountant_contact: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  registration_status?: string;
  last_federal_update?: string;
  last_query_date?: string;
  internal_tags?: string[];
  client_status?: string;
  internal_observations?: string;
  internal_responsible?: string;
  // Novos campos da Receita Federal
  fantasy_name?: string;
  cadastral_situation?: string;
  social_capital?: string;
  main_activity?: string;
  secondary_activities?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}
