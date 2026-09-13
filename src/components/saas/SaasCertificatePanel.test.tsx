import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SaasCertificatePanel from './SaasCertificatePanel';
import SaasCompanyProfile from './SaasCompanyProfile';
import { fiscalConfigRequest } from '@/lib/saas/fiscalConfigRequest';
vi.mock('@/lib/saas/fiscalConfigRequest', () => ({ fiscalConfigRequest: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
const request = vi.mocked(fiscalConfigRequest);
const props = {
  organizationId: 'test-org',
  configured: false,
  taxId: '99999999000191',
  onSaved: vi.fn().mockResolvedValue(undefined),
  onBusyChange: vi.fn(),
};
function select(name = 'teste.pfx') {
  const file = new File(['synthetic-test-fixture'], name);
  Object.defineProperty(file, 'arrayBuffer', {
    value: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
  });
  fireEvent.change(screen.getByLabelText('1. Arquivo do certificado'), {
    target: { files: [file] },
  });
}
const send = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Validar e salvar certificado' }));
beforeEach(() => {
  vi.clearAllMocks();
  request.mockReset();
});
afterEach(cleanup);
describe('importação explícita de A1', () => {
  it('selecionar não envia; ausência de senha é visível', () => {
    render(<SaasCertificatePanel {...props} />);
    select();
    expect(request).not.toHaveBeenCalled();
    send();
    expect(screen.getByRole('alert')).toHaveTextContent('Informe a senha');
  });
  it('recusa extensão inválida sem chamar servidor', () => {
    render(<SaasCertificatePanel {...props} />);
    select('certificado.pdf');
    expect(screen.getByRole('alert')).toHaveTextContent('.pfx ou .p12');
    expect(request).not.toHaveBeenCalled();
  });
  it('mostra erro de senha e permite repetir sem selecionar o arquivo', async () => {
    request
      .mockRejectedValueOnce(new Error('Não foi possível abrir o A1 com esta senha.'))
      .mockResolvedValueOnce({ ok: true, certificate: { expires_at: '2027-01-01' } });
    render(<SaasCertificatePanel {...props} />);
    select();
    fireEvent.change(screen.getByLabelText('2. Senha do certificado'), {
      target: { value: 'synthetic-wrong' },
    });
    send();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('esta senha'));
    fireEvent.change(screen.getByLabelText('2. Senha do certificado'), {
      target: { value: 'synthetic-correct' },
    });
    send();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Senha validada'));
    expect(request).toHaveBeenCalledTimes(2);
    expect(props.onSaved).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('2. Senha do certificado')).toHaveValue('');
  });
  it('não anuncia sucesso quando o servidor bloqueia outro CNPJ', async () => {
    request.mockRejectedValueOnce(new Error('Este A1 pertence a outro CNPJ.'));
    render(<SaasCertificatePanel {...props} configured subject="Certificado anterior" />);
    select();
    fireEvent.change(screen.getByLabelText('2. Senha do certificado'), {
      target: { value: 'synthetic' },
    });
    send();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('outro CNPJ'));
    expect(screen.getByText('Certificado anterior')).toBeVisible();
    expect(props.onSaved).not.toHaveBeenCalled();
  });
  it('bloqueia envio duplicado enquanto processa', async () => {
    let finish!: (v: unknown) => void;
    request.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    render(<SaasCertificatePanel {...props} />);
    select();
    fireEvent.change(screen.getByLabelText('2. Senha do certificado'), {
      target: { value: 'synthetic' },
    });
    send();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Validando senha e salvando…' })).toBeDisabled()
    );
    expect(request).toHaveBeenCalledTimes(1);
    finish({ ok: true, certificate: { expires_at: '2027-01-01' } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Senha validada'));
  });
  it('não mostra ambiente inventado e bloqueia edição quando a leitura falha', async () => {
    request.mockRejectedValueOnce(new Error('Falha de conexão'));
    render(<SaasCompanyProfile organizationId="test-org" />);
    expect(screen.queryByText('HOMOLOGAÇÃO')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).toBeNull();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Falha de conexão'));
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  });
});
