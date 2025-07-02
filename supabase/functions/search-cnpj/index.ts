import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CNPJData {
  cnpj: string;
  company_name: string;
  trade_name?: string;
  address?: string;
  company_size?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();

    if (!cnpj) {
      return new Response(
        JSON.stringify({ success: false, message: 'CNPJ é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar CNPJ - remover pontos, barras e hífens
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');

    console.log(`Buscando dados para CNPJ: ${cleanCNPJ}`);

    // Aqui você pode integrar com APIs públicas como:
    // - ReceitaWS: https://receitaws.com.br/api
    // - BrasilAPI: https://brasilapi.com.br/docs
    // Para fins de demonstração, vamos usar uma simulação

    // Simulação de resposta da API da Receita Federal
    // Em produção, substitua por uma chamada real à API
    const mockResponse: CNPJData = {
      cnpj: cleanCNPJ,
      company_name: "EMPRESA EXEMPLO LTDA",
      trade_name: "Exemplo Comercial",
      address: "RUA EXEMPLO, 123 - CENTRO - SÃO PAULO/SP - CEP: 01000-000",
      company_size: "Microempresa"
    };

    // Exemplo de integração real com ReceitaWS (descomente para usar)
    /*
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`);
    
    if (!response.ok) {
      throw new Error('Erro ao consultar CNPJ na Receita Federal');
    }

    const data = await response.json();

    if (data.status === 'ERROR') {
      return new Response(
        JSON.stringify({ success: false, message: 'CNPJ não encontrado ou inválido' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cnpjData: CNPJData = {
      cnpj: data.cnpj,
      company_name: data.nome,
      trade_name: data.fantasia || null,
      address: `${data.logradouro}, ${data.numero} - ${data.bairro} - ${data.municipio}/${data.uf} - CEP: ${data.cep}`,
      company_size: data.porte || null
    };
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: mockResponse,
        message: 'Dados encontrados com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na busca de CNPJ:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});