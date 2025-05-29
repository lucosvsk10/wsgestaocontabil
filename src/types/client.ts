
export interface TaxSimulation {
  id: string;
  user_id: string;
  tipo_simulacao: string;
  rendimento_bruto: number;
  inss: number;
  educacao: number;
  saude: number;
  dependentes: number;
  outras_deducoes: number;
  imposto_estimado: number;
  data_criacao: string;
  nome?: string;
  email?: string;
  telefone?: string;
}

export interface ClientAnnouncement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  expires_at: string | null;
  theme: string;
  action_button_text?: string;
  action_button_url?: string;
}

export interface FiscalEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  status: 'upcoming' | 'today' | 'overdue' | 'completed';
  category: string;
}

export interface CompanyData {
  id: string;
  user_id: string;
  name: string;
  cnpj: string;
  opening_date: string;
  tax_regime: string;
  accountant_name: string;
  accountant_contact: string;
  address: string;
  phone: string;
  email: string;
}
