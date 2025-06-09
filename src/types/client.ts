
export interface CompanyData {
  id: string;
  user_id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  opening_date: string;
  tax_regime: string;
  accountant_name: string;
  accountant_contact: string;
  created_at: string;
  updated_at: string;
  
  // Admin-only fields
  registration_status?: string | null;
  last_federal_update?: string | null;
  last_query_date?: string | null;
  internal_tags?: string[] | null;
  client_status?: string | null;
  internal_observations?: string | null;
  internal_responsible?: string | null;
}

export interface UserStats {
  totalDocuments: number;
  pendingDocuments: number;
  expiredDocuments: number;
  recentUploads: number;
}

export interface TaxSimulation {
  id: string;
  user_id: string | null;
  rendimento_bruto: number;
  inss: number;
  educacao: number;
  saude: number;
  dependentes: number;
  outras_deducoes: number;
  imposto_estimado: number;
  tipo_simulacao: string;
  data_criacao: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
}

export interface FiscalEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  status: 'upcoming' | 'today' | 'overdue' | 'completed';
  category: string;
  created_at: string;
  created_by: string | null;
}

export interface ClientAnnouncement {
  id: string;
  title: string;
  message: string;
  theme: string;
  created_at: string;
  expires_at: string | null;
  action_button_text: string | null;
  action_button_url: string | null;
}
