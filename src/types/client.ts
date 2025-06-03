
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
  created_at: string;
  updated_at: string;
}
