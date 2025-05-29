
export interface TaxSimulation {
  id: string;
  tipo_simulacao: string;
  rendimento_bruto: number;
  imposto_estimado: number;
  inss: number;
  dependentes: number;
  saude: number;
  educacao: number;
  outras_deducoes: number;
  data_criacao: string;
  nome?: string;
  email?: string;
  telefone?: string;
}

export interface FiscalEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  status: 'upcoming' | 'today' | 'overdue';
  category: string;
}

export interface CompanyData {
  id: string;
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

export interface ClientAnnouncement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  expires_at?: string;
  theme: string; // Changed from 'normal' | 'urgent' to string to match database
  action_button_text?: string;
  action_button_url?: string;
}
