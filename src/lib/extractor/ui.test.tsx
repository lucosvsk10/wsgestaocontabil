import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddCompanyModal } from '@/pages/FiscalExtractorApp';
import { ExtractorAccountName } from '@/components/extractor/ExtractorAccountName';
import { extractorRequest } from './request';
vi.mock('./request', () => ({ extractorRequest: vi.fn(), extractorErrorMessage: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
const request = vi.mocked(extractorRequest);
beforeEach(() => {
  vi.clearAllMocks();
  request.mockReset();
});
afterEach(cleanup);
function setup(name = 'teste.pfx', size = 3) {
  const onClose = vi.fn(),
    onDone = vi.fn();
  render(<AddCompanyModal preview={false} onClose={onClose} onDone={onDone} />);
  const file = new File(['abc'], name);
  Object.defineProperty(file, 'arrayBuffer', {
    value: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
  });
  Object.defineProperty(file, 'size', { value: size });
  fireEvent.change(screen.getByLabelText('Arquivo do certificado'), { target: { files: [file] } });
  return { onClose, onDone };
}
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Validar e salvar' }));
describe('extrator: importação e conta', () => {
  it('seleção não envia; senha é obrigatória', () => {
    setup();
    expect(request).not.toHaveBeenCalled();
    send();
    expect(screen.getByRole('alert')).toHaveTextContent('senha');
  });
  it('arquivo grande é bloqueado localmente', () => {
    setup('a.pfx', 3000000);
    fireEvent.change(screen.getByLabelText('Senha do certificado'), { target: { value: 'test' } });
    send();
    expect(screen.getByRole('alert')).toHaveTextContent('2 MB');
    expect(request).not.toHaveBeenCalled();
  });
  it('exibe erro, preserva arquivo e permite corrigir senha', async () => {
    request
      .mockRejectedValueOnce(new Error('Confira a senha.'))
      .mockResolvedValueOnce({ ok: true, company: { id: 'test' } });
    const { onDone } = setup();
    fireEvent.change(screen.getByLabelText('Senha do certificado'), { target: { value: 'bad' } });
    send();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Confira a senha'));
    fireEvent.change(screen.getByLabelText('Senha do certificado'), { target: { value: 'good' } });
    send();
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ id: 'test' }));
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('bloqueia duplicidade e fechamento durante o salvamento', async () => {
    let finish!: (v: unknown) => void;
    request.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const { onClose } = setup();
    fireEvent.change(screen.getByLabelText('Senha do certificado'), { target: { value: 'pass' } });
    send();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).not.toHaveBeenCalled();
    finish({ ok: true, company: { id: 'test' } });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Validar e salvar' })).toBeEnabled()
    );
  });
  it('salva somente o nome da conta', async () => {
    request.mockResolvedValueOnce({ ok: true, account: { name: 'Conta de teste' } });
    const saved = vi.fn();
    render(<ExtractorAccountName name="Conta atual" onSaved={saved} />);
    fireEvent.change(screen.getByLabelText('Nome da conta'), {
      target: { value: 'Conta de teste' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('salvo'));
    expect(request).toHaveBeenCalledWith({ action: 'save_account', name: 'Conta de teste' });
    expect(saved).toHaveBeenCalledOnce();
  });
});
