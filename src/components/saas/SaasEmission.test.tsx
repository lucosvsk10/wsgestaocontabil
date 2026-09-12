import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SaasEmission from './SaasEmission';
import { emissionDraftKey, readEmissionDraft, writeEmissionDraft } from '@/lib/saas/emissionDraft';

const fixture = vi.hoisted(() => {
  const address = { street: 'Rua de teste', street_number: '10', district: 'Centro', city: 'Maceió', state: 'AL', city_ibge_code: '2704302', postal_code: '57020000' };
  return {
    profile: { ...address, id: 'profile', legal_name: 'Empresa de teste', tax_id: '04252011000110', state_registration: '123456789', crt: '1', fiscal_environment: 'homologation', business_mode: 'goods', series_nfe: '1', next_number_nfe: 10, default_cfop_in_state: '5102', default_nfse_service_code: '010101' },
    customers: [ { ...address, id: 'customer', legal_name: 'Cliente de teste', tax_id: '52998224725' } ],
    products: [ { id: 'product', name: 'Produto de teste', sale_price: 100, ncm: '94036000', cfop_in_state: '5102', code: 'P1' }, { id: 'product-2', name: 'Segundo produto', sale_price: 200, ncm: '94036000', cfop_in_state: '5102' } ],
    services: [ { id: 'service', name: 'Serviço de teste', description: 'Descrição cadastrada', sale_price: 100, service_code_national: '010101' } ],
    invoke: vi.fn(),
    loadError: false,
  };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: fixture.invoke },
  from: (table: string) => {
    const filters: Record<string, string> = {};
    const result = () => ({ data: table === 'saas_company_fiscal_profiles' ? fixture.profile : table === 'saas_fiscal_parties' ? filters.party_type === 'customer' ? fixture.customers : [] : filters.item_type === 'product' ? fixture.products : fixture.services, error: fixture.loadError ? { message: 'offline' } : null });
    const chain = {
      select: () => chain, order: () => chain, limit: () => chain,
      eq: (key: string, value: string) => { filters[key] = value; return chain; },
      maybeSingle: () => Promise.resolve(result()),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return chain;
  },
} }));
vi.mock('./SaasDanfePreview', () => ({ default: () => <div>Documento para conferência</div>, printDanfe: vi.fn() }));

const key = '35191010750100000100550010000000011000000010';
const completedForm = {
  customerId: 'customer', productId: 'product', serviceId: 'service', quantity: '2', unitPrice: '75', cfop: '5102', payment: '01',
  series: '1', number: '10', serviceCode: '010101', description: 'Descrição ajustada', value: '75', municipioPrestacao: '2704302',
  remetenteId: 'customer', destinatarioId: 'customer', toma: '3', rntrc: '12345678', chNFe: key, cfopCte: '5353', vTPrest: '100', vCarga: '400', qCarga: '20',
  munIniCodigo: '2704302', munIniNome: 'Maceió', ufIni: 'AL', munFimCodigo: '2704302', munFimNome: 'Maceió', ufFim: 'AL',
  tpEmit: '2', plate: 'ABC1D23', driverName: 'Condutor teste', driverCpf: '52998224725', tara: '1000', capacity: '5000',
  unloadCode: '2704302', unloadName: 'Maceió', cargoValue: '400', cargoWeight: '20', keys: key,
};
const ready = () => waitFor(() => expect(screen.getByText(/Rascunho salvo/)).toBeInTheDocument());
const mount = (documentType: string, organizationId = 'org-test') => render(<SaasEmission organizationId={organizationId} documentType={documentType} onChoose={vi.fn()} />);
beforeEach(() => {
  localStorage.clear(); fixture.invoke.mockReset(); fixture.loadError = false;
  fixture.invoke.mockResolvedValue({ data: { ok: true, xml: '<test />' }, error: null });
});
afterEach(cleanup);

describe('preenchimento e contrato de emissão', () => {
  it('preserva a última digitação ao sair e restaura o preço editado, sem voltar ao preço do cadastro', async () => {
    writeEmissionDraft(emissionDraftKey('org-test', 'NF-e'), completedForm, 'Produtos');
    const view = mount('NF-e'); await ready();
    expect(screen.getByLabelText(/Valor unitário/)).toHaveValue(75);
    fireEvent.change(screen.getByLabelText(/Valor unitário/), { target: { value: '81.50' } });
    view.unmount();
    mount('NF-e'); await ready();
    expect(screen.getByLabelText(/Valor unitário/)).toHaveValue(81.5);
  });

  it('não mistura rascunhos ao trocar organização ou tipo de documento', async () => {
    writeEmissionDraft(emissionDraftKey('org-test', 'NF-e'), completedForm, 'Produtos');
    const view = mount('NF-e'); await ready();
    view.rerender(<SaasEmission organizationId="other-org" documentType="NFS-e" onChoose={vi.fn()} />);
    await ready();
    expect(readEmissionDraft(emissionDraftKey('other-org', 'NFS-e'))?.form.customerId).toBe('');
    expect(readEmissionDraft(emissionDraftKey('org-test', 'NF-e'))?.form.unitPrice).toBe('75');
  });

  it.each(['NF-e', 'NFC-e', 'NFS-e', 'CT-e', 'MDF-e'])('monta uma prévia de %s com o ambiente esperado e os valores recuperados', async document => {
    writeEmissionDraft(emissionDraftKey('org-test', document), completedForm, 'Revisão');
    mount(document); await ready();
    const button = screen.getByRole('button', { name: 'Gerar prévia' });
    expect(button).toBeEnabled(); fireEvent.click(button);
    await waitFor(() => expect(fixture.invoke).toHaveBeenCalledTimes(1));
    const [endpoint, options] = fixture.invoke.mock.calls[0];
    expect(options.body).toMatchObject({ action: 'preview', organization_id: 'org-test', expected_environment: 'homologation' });
    const names = { 'NF-e': 'saas-dfe-issue', 'NFC-e': 'saas-dfe-issue', 'NFS-e': 'saas-nfse-issue', 'CT-e': 'saas-cte-issue', 'MDF-e': 'saas-mdfe-issue' };
    expect(endpoint).toBe(names[document as keyof typeof names]);
    if (document === 'NF-e') expect(options.body.data.valorUnitario).toBe(75);
    if (document === 'NFC-e') expect(options.body.model).toBe('65');
    if (document === 'NFS-e') expect(options.body.data).toMatchObject({ valor: 75, descricao: 'Descrição ajustada' });
    if (document === 'CT-e') { expect(options.body.data.rem.CPF).toBe('52998224725'); expect(options.body.data.toma).toBe('3'); }
    if (document === 'MDF-e') { expect(options.body.data.tpEmit).toBe('2'); expect(options.body.data.chaves).toEqual([key]); expect(options.body.data).not.toHaveProperty('seguradoraCnpj'); }
  });

  it('bloqueia duplo envio e não recria o rascunho nem reenvia após autorização', async () => {
    writeEmissionDraft(emissionDraftKey('org-test', 'NF-e'), completedForm, 'Revisão');
    let resolve: (result: unknown) => void;
    fixture.invoke.mockImplementation(() => new Promise(r => { resolve = r; }));
    mount('NF-e'); await ready();
    const button = screen.getByRole('button', { name: 'Transmitir para homologação' });
    fireEvent.click(button); fireEvent.click(button);
    expect(fixture.invoke).toHaveBeenCalledTimes(1);
    await act(async () => resolve!({ data: { ok: true, authorized: true }, error: null }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nova emissão' })).toBeInTheDocument());
    expect(readEmissionDraft(emissionDraftKey('org-test', 'NF-e'))).toBeNull();
    expect(screen.queryByRole('button', { name: 'Transmitir para homologação' })).not.toBeInTheDocument();
  });

  it('mantém o rascunho e explica a rejeição recebida por HTTP 422', async () => {
    writeEmissionDraft(emissionDraftKey('org-test', 'NF-e'), completedForm, 'Revisão');
    const response = new Response(JSON.stringify({ error: 'Dados incompletos', errors: ['Confira o CFOP'] }), { status: 422 });
    fixture.invoke.mockResolvedValue({ data: null, error: { context: response } });
    mount('NF-e'); await ready(); fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia' }));
    await screen.findByText('Dados incompletos · Confira o CFOP');
    expect(readEmissionDraft(emissionDraftKey('org-test', 'NF-e'))?.form.unitPrice).toBe('75');
  });

  it('não oferece transmissão de NFS-e de teste que o servidor bloqueia', async () => {
    writeEmissionDraft(emissionDraftKey('org-test', 'NFS-e'), completedForm, 'Revisão');
    mount('NFS-e'); await ready();
    expect(screen.getByText('Etapa 3 de 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transmitir para homologação' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar prévia' })).toBeEnabled();
  });

  it('bloqueia avanço quando os cadastros falham e preserva o rascunho anterior', async () => {
    fixture.loadError = true;
    writeEmissionDraft(emissionDraftKey('org-test', 'NF-e'), completedForm, 'Produtos');
    mount('NF-e'); await screen.findByText(/Não foi possível carregar os cadastros/);
    expect(screen.getByRole('button', { name: /Continuar para/ })).toBeDisabled();
    expect(readEmissionDraft(emissionDraftKey('org-test', 'NF-e'))?.form.unitPrice).toBe('75');
  });
});

