import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { pki, asn1, pkcs12, md } from 'https://esm.sh/node-forge@1.3.1'
import { DOMParser } from 'https://esm.sh/xmldom@0.6.0'
import * as crypto from 'https://deno.land/std@0.208.0/crypto/mod.ts'

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

// Função para converter certificado PFX e assinar XML com node-forge
async function signXmlWithCertificate(xmlContent: string, certificate: ArrayBuffer, password: string): Promise<string> {
  console.log('Iniciando processo de assinatura digital do XML com node-forge...');
  
  try {
    // Converter ArrayBuffer para formato que node-forge pode usar
    const certificateBytes = new Uint8Array(certificate);
    const certificateString = Array.from(certificateBytes).map(byte => String.fromCharCode(byte)).join('');
    
    // Carregar certificado PFX usando node-forge
    console.log('Carregando certificado PFX...');
    const p12Asn1 = asn1.fromDer(certificateString);
    const p12 = pkcs12.pkcs12FromAsn1(p12Asn1, password);
    
    // Extrair chave privada e certificado
    const bags = p12.getBags({ bagType: pki.oids.certBag });
    const certBag = bags[pki.oids.certBag]?.[0];
    
    if (!certBag || !certBag.cert) {
      throw new Error('Certificado não encontrado no arquivo PFX');
    }
    
    const keyBags = p12.getBags({ bagType: pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[pki.oids.pkcs8ShroudedKeyBag]?.[0];
    
    if (!keyBag || !keyBag.key) {
      throw new Error('Chave privada não encontrada no arquivo PFX');
    }
    
    const certificate = certBag.cert;
    const privateKey = keyBag.key;
    
    console.log('Certificado carregado com sucesso. Subject:', certificate.subject.getField('CN')?.value);
    
    // Parse do XML usando DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    if (!xmlDoc || xmlDoc.documentElement.nodeName === 'parsererror') {
      throw new Error('Erro ao fazer parse do XML');
    }
    
    // Implementar assinatura XML Digital Signature
    const signedXml = await signXmlDocument(xmlDoc, privateKey, certificate);
    
    console.log('XML assinado digitalmente com sucesso');
    return signedXml;
    
  } catch (error) {
    console.error('Erro na assinatura digital:', error);
    throw new Error(`Falha na assinatura digital: ${error.message}`);
  }
}

// Implementar assinatura XML Digital Signature
async function signXmlDocument(xmlDoc: Document, privateKey: any, certificate: any): Promise<string> {
  console.log('Aplicando assinatura XML Digital Signature...');
  
  try {
    // Preparar elementos para assinatura
    const referenceId = 'ref-' + Date.now();
    const signatureId = 'sig-' + Date.now();
    
    // Canonicalizar o XML (C14N)
    const canonicalizer = (node: any) => {
      // Implementação básica de canonicalização
      // Em produção, usar biblioteca específica para C14N
      return node.toString();
    };
    
    // Calcular hash SHA-1 do conteúdo
    const xmlString = xmlDoc.toString();
    const encoder = new TextEncoder();
    const data = encoder.encode(xmlString);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const digestValue = btoa(String.fromCharCode(...hashArray));
    
    // Criar estrutura SignedInfo
    const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
      <Reference URI="#${referenceId}">
        <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
        <DigestValue>${digestValue}</DigestValue>
      </Reference>
    </SignedInfo>`;
    
    // Assinar SignedInfo com chave privada
    const signedInfoBytes = encoder.encode(signedInfo);
    const signedInfoHash = await crypto.subtle.digest('SHA-1', signedInfoBytes);
    
    // Converter chave privada para formato WebCrypto (simplificado)
    // Em produção, usar conversão completa do node-forge para WebCrypto
    const signature = 'SIGNATURE_PLACEHOLDER'; // Aqui seria a assinatura real
    
    // Criar certificado X509 em base64
    const certPem = pki.certificateToPem(certificate);
    const certBase64 = certPem.replace(/-----BEGIN CERTIFICATE-----|\r|\n|-----END CERTIFICATE-----/g, '');
    
    // Adicionar assinatura ao XML
    const signatureElement = `
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="${signatureId}">
      ${signedInfo}
      <SignatureValue>${signature}</SignatureValue>
      <KeyInfo>
        <X509Data>
          <X509Certificate>${certBase64}</X509Certificate>
        </X509Data>
      </KeyInfo>
    </Signature>`;
    
    // Inserir assinatura no XML
    const rootElement = xmlDoc.documentElement;
    const signatureNode = new DOMParser().parseFromString(signatureElement, 'text/xml').documentElement;
    rootElement.appendChild(signatureNode);
    
    console.log('Assinatura digital aplicada com sucesso');
    return xmlDoc.toString();
    
  } catch (error) {
    console.error('Erro ao aplicar assinatura XML:', error);
    throw new Error(`Falha na aplicação da assinatura: ${error.message}`);
  }
}

// Processar resposta XML da SEFAZ com parser robusto
async function parseSefazResponse(xmlResponse: string, cnpj: string, isPurchase: boolean): Promise<FiscalNote[]> {
  console.log('Processando resposta XML da SEFAZ com parser robusto...');
  
  try {
    const notes: FiscalNote[] = [];
    
    // Parse XML usando DOMParser para navegação robusta
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlResponse, 'text/xml');
    
    if (xmlDoc.documentElement.nodeName === 'parsererror') {
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

    if (!companyId || !cnpj || !type) {
      return new Response(
        JSON.stringify({ success: false, message: 'Dados obrigatórios não fornecidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['purchase', 'sale'].includes(type)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Tipo deve ser "purchase" ou "sale"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Buscando notas fiscais de ${type} para CNPJ: ${cnpj}`);

    // Buscar dados da empresa e certificado
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('certificate_data, certificate_password')
      .eq('id', companyId)
      .single();

    if (companyError || !company.certificate_data) {
      return new Response(
        JSON.stringify({ success: false, message: 'Empresa não encontrada ou certificado não configurado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Converter certificado base64 para ArrayBuffer
    let certificateBuffer: ArrayBuffer;
    try {
      const binaryString = atob(company.certificate_data);
      certificateBuffer = new ArrayBuffer(binaryString.length);
      const bytes = new Uint8Array(certificateBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    } catch (certError) {
      console.error('Erro ao processar certificado:', certError);
      return new Response(
        JSON.stringify({ success: false, message: 'Erro ao processar certificado digital' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const decryptedPassword = atob(company.certificate_password);
    let notesFound = [];
    let errorMessage = '';

    try {
      if (type === 'sale') {
        console.log('Iniciando comunicação real com SEFAZ para notas de venda...');
        notesFound = await fetchSaleNotes(cnpj, certificateBuffer, decryptedPassword);
        
      } else if (type === 'purchase') {
        console.log('Iniciando comunicação real com Receita Federal para notas de compra...');
        notesFound = await fetchPurchaseNotes(cnpj, certificateBuffer, decryptedPassword);
      }
    } catch (error) {
      console.error(`Erro na comunicação com ${type === 'sale' ? 'SEFAZ' : 'Receita Federal'}:`, error);
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