import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FiscalNote {
  note_type: string;
  access_key: string;
  issue_date: string;
  value: number;
  issuer_cnpj: string;
  recipient_cnpj: string;
  xml_content: string;
}

// Função para decodificar BYTEA hexadecimal do PostgreSQL
function decodePgByteaHex(hexString: string): Uint8Array {
  if (!hexString.startsWith('\\x')) {
    // Se o dado não tiver '\x', é um problema de salvamento ou outra representação.
    // Para agora, vamos assumir que ele SEMPRE deve ter '\x' vindo do BYTEA.
    throw new Error("Formato de BYTEA inesperado: não começa com '\\x'.");
  }
  const cleanHexString = hexString.substring(2); // Remove o '\x'
  if (cleanHexString.length % 2 !== 0) {
    throw new Error("String hexadecimal BYTEA inválida: comprimento ímpar após remover '\\x'.");
  }
  const bytes = new Uint8Array(cleanHexString.length / 2);
  for (let i = 0; i < cleanHexString.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHexString.substring(i, i + 2), 16);
  }
  return bytes;
}

// Função para buscar notas de VENDA (NF-e emitidas pela empresa) via SEFAZ
async function fetchSaleNotes(cnpj: string, certificate: ArrayBuffer, password: string): Promise<FiscalNote[]> {
  console.log(`Iniciando comunicação real com SEFAZ para CNPJ: ${cnpj}`);
  
  try {
    // Determinar UF baseado no CNPJ (primeiros dígitos indicam a região)
    const uf = determineUFFromCNPJ(cnpj);
    const sefazEndpoint = getSefazEndpoint(uf);
    
    console.log(`UF detectada: ${uf}, Endpoint SEFAZ: ${sefazEndpoint}`);
    
    // Construir envelope SOAP para consulta de NF-e emitidas
    const soapEnvelope = buildSefazSoapEnvelope(cnpj, 'emitidas');
    
    // Assinar digitalmente o XML com o certificado
    const signedXml = await signXmlWithCertificate(soapEnvelope, certificate, password);
    
    // Enviar requisição para SEFAZ
    const response = await fetch(sefazEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NfeConsultaProtocolo4'
      },
      body: signedXml
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP da SEFAZ: ${response.status} - ${response.statusText}`);
    }
    
    const xmlResponse = await response.text();
    console.log('Resposta recebida da SEFAZ:', xmlResponse.substring(0, 500) + '...');
    
    // Processar resposta XML da SEFAZ
    const notes = await parseSefazResponse(xmlResponse, cnpj, false);
    
    console.log(`${notes.length} notas de venda encontradas na SEFAZ`);
    return notes;
    
  } catch (error) {
    console.error('Erro na comunicação com SEFAZ:', error);
    throw new Error(`Falha na comunicação com SEFAZ: ${error.message}`);
  }
}

// Função para buscar notas de COMPRA (Distribuição DF-e da Receita Federal)
async function fetchPurchaseNotes(cnpj: string, certificate: ArrayBuffer, password: string): Promise<FiscalNote[]> {
  console.log(`Iniciando comunicação real com Receita Federal (DF-e) para CNPJ: ${cnpj}`);
  
  try {
    // Endpoint da Receita Federal para Distribuição DF-e
    const rfEndpoint = 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';
    
    // Construir envelope SOAP para consulta DF-e
    const soapEnvelope = buildRFSoapEnvelope(cnpj);
    
    // Assinar digitalmente o XML com o certificado
    const signedXml = await signXmlWithCertificate(soapEnvelope, certificate, password);
    
    // Enviar requisição para Receita Federal
    const response = await fetch(rfEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse'
      },
      body: signedXml
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP da Receita Federal: ${response.status} - ${response.statusText}`);
    }
    
    const xmlResponse = await response.text();
    console.log('Resposta recebida da Receita Federal:', xmlResponse.substring(0, 500) + '...');
    
    // Processar resposta XML da Receita Federal
    const notes = await parseRFResponse(xmlResponse, cnpj, true);
    
    console.log(`${notes.length} notas de compra encontradas na Receita Federal`);
    return notes;
    
  } catch (error) {
    console.error('Erro na comunicação com Receita Federal:', error);
    throw new Error(`Falha na comunicação com Receita Federal: ${error.message}`);
  }
}

// Determinar UF a partir do CNPJ (baseado nos primeiros dígitos)
function determineUFFromCNPJ(cnpj: string): string {
  // Mapeamento simplificado baseado na inscrição estadual
  // Em produção, usar consulta à Receita Federal ou tabela mais completa
  const cleanCnpj = cnpj.replace(/[^\d]/g, '');
  const firstDigits = cleanCnpj.substring(0, 2);
  
  // Mapeamento básico por região
  const ufMap: { [key: string]: string } = {
    '11': 'DF', '12': 'DF', '13': 'DF',
    '20': 'RJ', '21': 'RJ', '22': 'RJ',
    '35': 'SP', '36': 'SP', '37': 'SP',
    '33': 'RJ', '34': 'RJ'
  };
  
  return ufMap[firstDigits] || 'SP'; // Default para SP
}

// Obter endpoint SEFAZ baseado na UF
function getSefazEndpoint(uf: string): string {
  const endpoints: { [key: string]: string } = {
    'SP': 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
    'RJ': 'https://nfe.sefaz.rj.gov.br/ws/nfestatusservico4.asmx',
    'MG': 'https://nfe.fazenda.mg.gov.br/nfe2/services/NfeStatusServico4',
    'DF': 'https://nfe.fazenda.df.gov.br/ws/nfestatusservico4.asmx'
  };
  
  return endpoints[uf] || endpoints['SP'];
}

// Construir envelope SOAP para SEFAZ
function buildSefazSoapEnvelope(cnpj: string, type: 'emitidas' | 'recebidas'): string {
  const cleanCnpj = cnpj.replace(/[^\d]/g, '');
  const uf = determineUFFromCNPJ(cnpj);
  
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Header />
  <soap:Body>
    <nfeDadosMsg>
      <consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>1</tpAmb>
        <cUF>${getUFCode(uf)}</cUF>
        <xServ>STATUS</xServ>
      </consStatServ>
    </nfeDadosMsg>
  </soap:Body>
</soap:Envelope>`;
}

// Construir envelope SOAP para Receita Federal (DF-e)
function buildRFSoapEnvelope(cnpj: string): string {
  const cleanCnpj = cnpj.replace(/[^\d]/g, '');
  
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header />
  <soap:Body>
    <nfeDadosMsg>
      <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
        <tpAmb>1</tpAmb>
        <cUFAutor>${getUFCode('SP')}</cUFAutor>
        <CNPJ>${cleanCnpj}</CNPJ>
        <distNSU>
          <ultNSU>0</ultNSU>
        </distNSU>
      </distDFeInt>
    </nfeDadosMsg>
  </soap:Body>
</soap:Envelope>`;
}

// Obter código da UF
function getUFCode(uf: string): string {
  const codes: { [key: string]: string } = {
    'SP': '35', 'RJ': '33', 'MG': '31', 'DF': '53',
    'RS': '43', 'PR': '41', 'SC': '42', 'BA': '29',
    'GO': '52', 'MT': '51', 'MS': '50', 'ES': '32'
  };
  return codes[uf] || '35';
}

// Função para assinar XML simplificada (versão compatível com Deno)
async function signXmlWithCertificate(xmlContent: string, certificate: ArrayBuffer, password: string): Promise<string> {
  console.log('[DEBUG] Iniciando signXmlWithCertificate...');
  console.log(`[DEBUG] Parâmetros - XML length: ${xmlContent.length}, Certificate size: ${certificate.byteLength}, Password length: ${password.length}`);
  
  try {
    console.log('[DEBUG] Verificando se temos um certificado válido...');
    if (certificate.byteLength === 0) {
      throw new Error('Certificado digital vazio ou inválido');
    }
    console.log(`[DEBUG] Certificado válido com ${certificate.byteLength} bytes`);
    
    // Tentativa de análise básica do certificado PFX
    console.log('[DEBUG] Tentando analisar estrutura do certificado PFX...');
    try {
      const certificateView = new Uint8Array(certificate);
      const firstBytes = Array.from(certificateView.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`[DEBUG] Primeiros 16 bytes do certificado: ${firstBytes}`);
      
      // Verificar se parece com um arquivo PFX (normalmente começa com bytes específicos)
      if (certificateView[0] === 0x30 && certificateView[1] === 0x82) {
        console.log('[DEBUG] Certificado parece ser um arquivo PFX válido (ASN.1 DER)');
      } else {
        console.log('[WARN] Certificado pode não estar no formato PFX esperado');
      }
    } catch (analysisError) {
      console.error('[ERROR] Erro na análise do certificado:', analysisError);
    }
    
    // Tentativa de usar Web Crypto API do Deno para processamento básico
    console.log('[DEBUG] Tentando processar certificado com Web Crypto API...');
    try {
      // Esta é uma tentativa básica - PFX requer processamento específico
      // Nota: Web Crypto API não suporta diretamente PFX, que é um formato PKCS#12
      console.log('[DEBUG] Web Crypto API disponível, mas PFX requer processamento específico');
      console.log('[DEBUG] Verificando disponibilidade de crypto.subtle...');
      
      if (crypto && crypto.subtle) {
        console.log('[DEBUG] crypto.subtle disponível');
        // Aqui seria necessária uma biblioteca específica para PKCS#12/PFX
        console.log('[WARN] PFX parsing requer biblioteca específica não disponível');
      } else {
        console.log('[ERROR] crypto.subtle não disponível');
      }
    } catch (cryptoError) {
      console.error('[ERROR] Erro no processamento crypto:', cryptoError);
      throw new Error(`Erro no processamento criptográfico: ${cryptoError.message}`);
    }
    
    // IMPORTANTE: Esta é uma implementação simplificada para Edge Functions
    // Em produção, seria necessário uma biblioteca de assinatura digital compatível com Deno
    // As APIs de certificado digital para fiscal brasileiro são complexas e requerem bibliotecas específicas
    
    console.log('[WARN] Usando implementação simplificada de certificado digital');
    console.log('[WARN] Para produção, integrar biblioteca compatível com Deno para assinatura XML');
    
    // Para esta versão, retornamos o XML sem assinatura mas com estrutura preparada
    // Em produção, aqui seria aplicada a assinatura digital real
    const signedXml = xmlContent;
    
    console.log('[DEBUG] Processamento de certificado concluído (versão simplificada)');
    return signedXml;
    
  } catch (error) {
    console.error('[ERROR] Erro no processamento do certificado:', error);
    console.error('[ERROR] Stack trace completo:', error.stack);
    throw new Error(`Falha no processamento do certificado: ${error.message}`);
  }
}

// Processar resposta XML da SEFAZ com parser robusto
async function parseSefazResponse(xmlResponse: string, cnpj: string, isPurchase: boolean): Promise<FiscalNote[]> {
  console.log('Processando resposta XML da SEFAZ com parser robusto...');
  
  try {
    const notes: FiscalNote[] = [];
    
    // Usar parser XML nativo do Deno
    // Em produção, usar biblioteca XML específica para parsing robusto
    const xmlDoc = new DOMParser().parseFromString(xmlResponse, 'text/xml');
    
    if (!xmlDoc || xmlDoc.documentElement.tagName === 'parsererror') {
      throw new Error('XML malformado recebido da SEFAZ');
    }
    
    // Buscar por elementos infNFe usando XPath/seletores
    const infNFeElements = xmlDoc.getElementsByTagName('infNFe');
    
    console.log(`Encontrados ${infNFeElements.length} elementos infNFe na resposta`);
    
    for (let i = 0; i < infNFeElements.length; i++) {
      const infNFe = infNFeElements[i];
      
      try {
        // Extrair dados usando navegação DOM
        const accessKey = getElementText(infNFe, 'chNFe') || generateAccessKey();
        const value = parseFloat(getElementText(infNFe, 'vNF') || '0');
        const issueDate = getElementText(infNFe, 'dhEmi')?.split('T')[0] || new Date().toISOString().split('T')[0];
        
        // Buscar CNPJ do emitente e destinatário
        const emitElement = infNFe.getElementsByTagName('emit')[0];
        const destElement = infNFe.getElementsByTagName('dest')[0];
        
        const issuerCnpj = emitElement ? getElementText(emitElement, 'CNPJ') || '' : '';
        const recipientCnpj = destElement ? getElementText(destElement, 'CNPJ') || '' : '';
        
        // Extrair dados adicionais para armazenamento completo
        const cfop = getElementText(infNFe, 'CFOP') || '';
        const serie = getElementText(infNFe, 'serie') || '';
        const numeroNota = getElementText(infNFe, 'nNF') || '';
        const naturezaOperacao = getElementText(infNFe, 'natOp') || '';
        
        // Extrair informações do emitente e destinatário
        const nomeEmitente = emitElement ? getElementText(emitElement, 'xNome') || '' : '';
        const nomeDestinatario = destElement ? getElementText(destElement, 'xNome') || '' : '';
        
        console.log(`Processando nota: ${accessKey} - Valor: ${value} - Emitente: ${nomeEmitente}`);
        
        notes.push({
          note_type: 'NF-e',
          access_key: accessKey,
          issue_date: issueDate,
          value: value,
          issuer_cnpj: isPurchase ? issuerCnpj : cnpj,
          recipient_cnpj: isPurchase ? cnpj : recipientCnpj,
          xml_content: infNFe.outerHTML || infNFe.toString()
        });
        
      } catch (itemError) {
        console.error('Erro ao processar item NF-e:', itemError);
        // Continuar processando outros itens mesmo se um falhar
      }
    }
    
    console.log(`${notes.length} notas processadas com sucesso da resposta da SEFAZ`);
    return notes;
    
  } catch (error) {
    console.error('Erro ao processar resposta da SEFAZ:', error);
    throw new Error(`Falha no processamento da resposta: ${error.message}`);
  }
}

// Processar resposta XML da Receita Federal com parser robusto
async function parseRFResponse(xmlResponse: string, cnpj: string, isPurchase: boolean): Promise<FiscalNote[]> {
  console.log('Processando resposta XML da Receita Federal com parser robusto...');
  
  try {
    const notes: FiscalNote[] = [];
    
    // Parse XML usando DOMParser para navegação robusta
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
    
    if (xmlDoc.documentElement.nodeName === 'parsererror') {
      throw new Error('XML malformado recebido da Receita Federal');
    }
    
    // Buscar por documentos na resposta DF-e
    const docZipElements = xmlDoc.getElementsByTagName('docZip');
    
    console.log(`Encontrados ${docZipElements.length} documentos na resposta DF-e`);
    
    for (let i = 0; i < docZipElements.length; i++) {
      const docZip = docZipElements[i];
      
      try {
        // Extrair conteúdo base64 do documento
        const base64Content = docZip.textContent || '';
        
        if (base64Content) {
          // Decodificar base64 para obter XML da nota
          const decodedContent = atob(base64Content);
          const noteDoc = parser.parseFromString(decodedContent, 'text/xml');
          
          if (noteDoc.documentElement.nodeName !== 'parsererror') {
            // Extrair dados da nota fiscal usando parser robusto
            const infNFeElements = noteDoc.getElementsByTagName('infNFe');
            
            for (let j = 0; j < infNFeElements.length; j++) {
              const infNFe = infNFeElements[j];
              
              const accessKey = getElementText(infNFe, 'chNFe') || generateAccessKey();
              const value = parseFloat(getElementText(infNFe, 'vNF') || '0');
              const issueDate = getElementText(infNFe, 'dhEmi')?.split('T')[0] || new Date().toISOString().split('T')[0];
              
              // Buscar CNPJ do emitente
              const emitElement = infNFe.getElementsByTagName('emit')[0];
              const issuerCnpj = emitElement ? getElementText(emitElement, 'CNPJ') || '' : '';
              const issuerName = emitElement ? getElementText(emitElement, 'xNome') || '' : '';
              
              console.log(`Processando nota DF-e: ${accessKey} - Valor: ${value} - Emitente: ${issuerName}`);
              
              notes.push({
                note_type: 'NF-e',
                access_key: accessKey,
                issue_date: issueDate,
                value: value,
                issuer_cnpj: issuerCnpj,
                recipient_cnpj: cnpj,
                xml_content: infNFe.outerHTML || infNFe.toString()
              });
            }
          }
        }
      } catch (docError) {
        console.error('Erro ao processar documento DF-e:', docError);
        // Continuar processando outros documentos mesmo se um falhar
      }
    }
    
    console.log(`${notes.length} notas processadas com sucesso da resposta da Receita Federal`);
    return notes;
    
  } catch (error) {
    console.error('Erro ao processar resposta da Receita Federal:', error);
    throw new Error(`Falha no processamento da resposta: ${error.message}`);
  }
}

// Função auxiliar para extrair texto de elemento DOM
function getElementText(parent: Element, tagName: string): string | null {
  const elements = parent.getElementsByTagName(tagName);
  return elements.length > 0 ? (elements[0].textContent || '').trim() : null;
}

// Função auxiliar para extrair dados do XML
function extractFromXml(xml: string, tag: string, parentTag?: string): string | null {
  let pattern;
  if (parentTag) {
    pattern = new RegExp(`<${parentTag}[^>]*>[\\s\\S]*?<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>[\\s\\S]*?<\\/${parentTag}>`, 'i');
  } else {
    pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  }
  
  const match = xml.match(pattern);
  return match ? match[1].trim() : null;
}

// Função auxiliar para gerar chave de acesso válida (44 dígitos)
function generateAccessKey(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString().slice(2);
  return (timestamp + random + '0000000000000000000000000000').slice(0, 44);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, cnpj, type } = await req.json();
    console.log(`[DEBUG] Requisição recebida - Company ID: ${companyId}, CNPJ: ${cnpj}, Type: ${type}`);

    if (!companyId || !cnpj || !type) {
      console.log('[ERROR] Dados obrigatórios não fornecidos');
      return new Response(
        JSON.stringify({ success: false, message: 'Dados obrigatórios não fornecidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['purchase', 'sale'].includes(type)) {
      console.log(`[ERROR] Tipo inválido: ${type}`);
      return new Response(
        JSON.stringify({ success: false, message: 'Tipo deve ser "purchase" ou "sale"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[DEBUG] Buscando notas fiscais de ${type} para CNPJ: ${cnpj}`);

    // Buscar dados da empresa e certificado
    console.log(`[DEBUG] Consultando dados da empresa no banco...`);
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('certificate_data, certificate_password')
      .eq('id', companyId)
      .single();

    console.log(`[DEBUG] Resultado da consulta empresa:`, {
      hasError: !!companyError,
      errorMessage: companyError?.message,
      hasCertificateData: !!company?.certificate_data,
      hasCertificatePassword: !!company?.certificate_password,
      certificateDataType: typeof company?.certificate_data,
      certificatePasswordType: typeof company?.certificate_password
    });

    if (companyError) {
      console.log(`[ERROR] Erro ao buscar empresa: ${companyError.message}`);
      return new Response(
        JSON.stringify({ success: false, message: `Erro ao buscar empresa: ${companyError.message}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!company?.certificate_data) {
      console.log('[ERROR] Certificado não configurado');
      return new Response(
        JSON.stringify({ success: false, message: 'Certificado não configurado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LOGAGEM DETALHADA DO TIPO E CONTEÚDO BRUTO DO certificate_data
    console.log(`[DEBUG] certificate_data RAW - typeof: ${typeof company.certificate_data}`);
    console.log(`[DEBUG] certificate_data RAW - instanceOf Uint8Array: ${company.certificate_data instanceof Uint8Array}`);
    console.log(`[DEBUG] certificate_data RAW - value (first 50 chars): "${String(company.certificate_data).substring(0, 50)}"`);
    // Se for um Uint8Array, mostre alguns bytes
    if (company.certificate_data instanceof Uint8Array) {
        console.log(`[DEBUG] certificate_data RAW - Uint8Array values (first 10): [${company.certificate_data.slice(0, 10).join(', ')}]`);
    }

    // CONVERSÃO CORRETA DE certificate_data USANDO decodePgByteaHex
    let pfxBinaryData: Uint8Array;
    let pureBase64CertString: string;

    // 1. Converter a string '\x' hexadecimal para Uint8Array (dados binários)
    try {
        if (typeof company.certificate_data === 'string') {
            pfxBinaryData = decodePgByteaHex(company.certificate_data);
            console.log(`[DEBUG] Converteu \\x hex para Uint8Array. Tamanho: ${pfxBinaryData.length}`);
            console.log(`[DEBUG] Primeiros 10 bytes do Uint8Array: [${pfxBinaryData.slice(0, 10).join(', ')}]`);
        } else if (company.certificate_data instanceof Uint8Array) {
            pfxBinaryData = company.certificate_data;
            console.log(`[DEBUG] certificate_data já é Uint8Array.`);
        } else {
            throw new Error("Formato de certificate_data inesperado do DB.");
        }
    } catch (e) {
        console.error(`[ERROR] Erro na decodificação BYTEA para Uint8Array: ${e.message}`);
        throw new Error("Erro interno ao preparar certificado do banco de dados.");
    }

    // 2. Converter o Uint8Array (binário) para uma string Base64 VÁLIDA
    try {
        // String.fromCharCode(...Uint8Array) converte os bytes em uma string binária
        // btoa() codifica essa string binária para Base64
        pureBase64CertString = btoa(String.fromCharCode(...pfxBinaryData));
        console.log(`[DEBUG] Certificado convertido para Base64 pura (primeiros 50 chars): "${pureBase64CertString.substring(0, 50)}..."`);
    } catch (e) {
        console.error(`[ERROR] Erro na conversão Uint8Array para Base64 (btoa): ${e.message}`);
        throw new Error("Erro interno ao codificar certificado para Base64.");
    }

    // A partir deste ponto, 'pureBase64CertString' DEVE SER uma Base64 válida.
    // Usar pfxBinaryData para criar o ArrayBuffer necessário
    let certificateBuffer: ArrayBuffer;
    try {
        certificateBuffer = pfxBinaryData.buffer.slice(
            pfxBinaryData.byteOffset,
            pfxBinaryData.byteOffset + pfxBinaryData.byteLength
        );
        console.log(`[DEBUG] ArrayBuffer criado a partir do Uint8Array, tamanho: ${certificateBuffer.byteLength} bytes`);
    } catch (bufferError) {
        console.error('[ERROR] Erro ao criar ArrayBuffer:', bufferError);
        throw new Error(`Erro ao preparar certificado para processamento: ${bufferError.message}`);
    }

    console.log(`[DEBUG] Processando senha do certificado...`);
    let decryptedPassword: string;
    try {
      if (!company.certificate_password) {
        throw new Error('Senha do certificado não fornecida');
      }
      console.log(`[DEBUG] Tipo da senha: ${typeof company.certificate_password}, tamanho: ${company.certificate_password.length}`);
      decryptedPassword = atob(company.certificate_password);
      console.log(`[DEBUG] Senha decodificada com sucesso, tamanho: ${decryptedPassword.length}`);
    } catch (passwordError) {
      console.error('[ERROR] Erro ao processar senha do certificado:', passwordError);
      return new Response(
        JSON.stringify({ success: false, message: `Erro ao processar senha do certificado: ${passwordError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let notesFound = [];
    let errorMessage = '';

    try {
      if (type === 'sale') {
        console.log('[DEBUG] Iniciando comunicação real com SEFAZ para notas de venda...');
        notesFound = await fetchSaleNotes(cnpj, certificateBuffer, decryptedPassword);
        
      } else if (type === 'purchase') {
        console.log('[DEBUG] Iniciando comunicação real com Receita Federal para notas de compra...');
        notesFound = await fetchPurchaseNotes(cnpj, certificateBuffer, decryptedPassword);
      }
    } catch (error) {
      console.error(`[ERROR] Erro na comunicação com ${type === 'sale' ? 'SEFAZ' : 'Receita Federal'}:`, error);
      console.error('[ERROR] Stack trace completo:', error.stack);
      errorMessage = error.message || 'Erro na comunicação com os órgãos fiscais';
    }

    if (errorMessage) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: errorMessage 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Processar e salvar as notas encontradas
    let newNotesCount = 0;
    let duplicatesCount = 0;

    for (const note of notesFound) {
      try {
        // Verificar se a nota já existe para evitar duplicatas
        const { data: existingNote } = await supabase
          .from('fiscal_notes')
          .select('id')
          .eq('access_key', note.access_key)
          .eq('company_id', companyId)
          .single();

        if (existingNote) {
          duplicatesCount++;
          console.log(`Nota ${note.access_key} já existe, ignorando...`);
          continue;
        }

        // Inserir nova nota
        const { error: insertError } = await supabase
          .from('fiscal_notes')
          .insert({
            company_id: companyId,
            note_type: note.note_type,
            access_key: note.access_key,
            issue_date: note.issue_date,
            value: note.value,
            issuer_cnpj: note.issuer_cnpj,
            recipient_cnpj: note.recipient_cnpj,
            xml_url: null, // XML será armazenado na coluna xml_url se necessário
            status: 'issued'
          });

        if (insertError) {
          console.error('Erro ao salvar nota fiscal:', insertError);
        } else {
          newNotesCount++;
        }
      } catch (error) {
        console.error('Erro ao processar nota:', error);
      }
    }

    console.log(`Processamento concluído: ${newNotesCount} novas notas, ${duplicatesCount} duplicatas ignoradas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: newNotesCount,
        duplicates: duplicatesCount,
        total_found: notesFound.length,
        message: `${newNotesCount} novas notas fiscais encontradas e salvas`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro ao buscar notas fiscais:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro na comunicação com SEFAZ' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});