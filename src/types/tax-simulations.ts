
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

export interface UserDetails {
  [key: string]: {
    name: string | null;
    email: string | null;
  };
}

export interface TaxFormValues {
  rendimentoBruto: number;
  inss: number;
  educacao: number;
  saude: number;
  dependentes: number;
  outrasDeducoes: number;
  nome?: string;
  email?: string;
  telefone?: string;
}

export interface TaxResult {
  total: number;
  tipoSimulacao: string;
  rendimentoBruto: number;
  totalDeducoes: number;
  impostoCalculado: number;
}
