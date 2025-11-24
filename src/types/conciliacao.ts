export interface ExtratoBancario {
  id: string;
  user_id: string;
  data_transacao: string;
  descricao: string;
  valor: number;
  status: 'pendente' | 'conciliado';
  documento_id: string | null;
  competencia: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentoConciliacao {
  id: string;
  user_id: string;
  nome_arquivo: string;
  url_storage: string;
  status_processamento: 'nao_processado' | 'processando' | 'concluido' | 'pendente_manual' | 'erro';
  dados_extraidos: any;
  competencia: string;
  created_at: string;
  updated_at: string;
}

export interface ConciliacaoStats {
  totalTransacoes: number;
  pendentesComprovante: number;
  conciliados: number;
}
