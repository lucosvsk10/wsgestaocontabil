export const AL_SOURCE = {
  uf: 'AL',
  cUF: '27',
  nfe: {
    authorization: 'SVRS',
    publicConsult: 'https://www.sefaz.al.gov.br/nfe/nfe-consulta',
    strategy: 'state-portal',
    emittedDiscovery: 'authenticated-state-portal',
  },
  nfce: {
    authorization: 'AL',
    publicConsult: 'https://nfce.sefaz.al.gov.br/consultanfce.htm',
    publicQr: 'https://nfce.sefaz.al.gov.br/QRCode/consultarNFCe.jsp',
    authenticatedPortal: 'https://nfce.sefaz.al.gov.br/sca_default_login_page',
    strategy: 'state-portal',
    emittedDiscovery: 'authenticated-state-portal',
  },
};

export function assertAlAccessKey(key) {
  const value = String(key || '').replace(/\D/g, '');
  if (value.length !== 44) throw new Error('Chave de acesso precisa ter 44 dígitos.');
  if (!value.startsWith('27')) throw new Error('A chave não pertence a Alagoas (cUF 27).');
  return value;
}

export function identifyAlModel(key) {
  const value = assertAlAccessKey(key);
  const model = value.slice(20, 22);
  if (model === '55') return 'nfe';
  if (model === '65') return 'nfce';
  return 'other';
}
