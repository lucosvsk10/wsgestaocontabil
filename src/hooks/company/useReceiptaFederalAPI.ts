
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ReceiptaFederalData {
  cnpj: string;
  nome: string;
  fantasia?: string;
  situacao: string;
  abertura: string;
  capital_social?: string;
  atividade_principal?: Array<{
    code: string;
    text: string;
  }>;
  atividades_secundarias?: Array<{
    code: string;
    text: string;
  }>;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
}

export const useReceiptaFederalAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCompanyData = async (cnpj: string): Promise<ReceiptaFederalData | null> => {
    if (!cnpj) return null;

    // Remove formatação do CNPJ
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    if (cleanCnpj.length !== 14) {
      toast({
        title: "CNPJ inválido",
        description: "O CNPJ deve ter 14 dígitos",
        variant: "destructive"
      });
      return null;
    }

    setLoading(true);
    try {
      // Usando BrasilAPI como fonte principal
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      
      if (!response.ok) {
        throw new Error('CNPJ não encontrado');
      }

      const data = await response.json();
      
      toast({
        title: "Dados importados com sucesso",
        description: "Os dados da Receita Federal foram importados automaticamente"
      });

      return {
        cnpj: data.cnpj,
        nome: data.razao_social || data.nome,
        fantasia: data.nome_fantasia,
        situacao: data.descricao_situacao_cadastral,
        abertura: data.data_inicio_atividade,
        capital_social: data.capital_social?.toString(),
        atividade_principal: data.cnae_fiscal ? [{
          code: data.cnae_fiscal,
          text: data.cnae_fiscal_descricao
        }] : undefined,
        atividades_secundarias: data.cnaes_secundarios || [],
        logradouro: data.logradouro,
        numero: data.numero,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep,
        telefone: data.ddd_telefone_1,
        email: data.email
      };
    } catch (error) {
      console.error('Erro ao buscar dados da Receita Federal:', error);
      toast({
        title: "Erro ao importar dados",
        description: "Não foi possível importar os dados da Receita Federal. Verifique o CNPJ e tente novamente.",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchCompanyData,
    loading
  };
};
