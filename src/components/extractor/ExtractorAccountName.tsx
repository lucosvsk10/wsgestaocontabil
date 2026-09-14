import { useEffect, useState } from 'react';
import { extractorRequest } from '@/lib/extractor/request';

export function ExtractorAccountName({ name, onSaved }: { name: string; onSaved?: () => void }) {
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setValue(name);
  }, [name]);
  return (
    <form
      className="col-span-full space-y-3 rounded-xl border p-4"
      onSubmit={async e => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setMessage('');
        try {
          const result = await extractorRequest({ action: 'save_account', name: value.trim() });
          setValue(result.account.name);
          setFailed(false);
          setMessage('Nome da conta salvo.');
          onSaved?.();
        } catch (err) {
          setFailed(true);
          setMessage(err instanceof Error ? err.message : 'Não foi possível salvar.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-sm font-medium">
        Nome da conta
        <input
          className="mt-2 w-full rounded-lg border p-3"
          value={value}
          required
          minLength={2}
          maxLength={120}
          disabled={busy}
          onChange={e => setValue(e.target.value)}
        />
      </label>
      <p className="text-sm text-muted-foreground">
        Altera o nome exibido no painel, sem mudar o CNPJ, o acesso ou a assinatura.
      </p>
      {message && (
        <p role={failed ? 'alert' : 'status'} className="text-sm">
          {message}
        </p>
      )}
      <button className="extractor-primary" disabled={busy || value.trim() === name}>
        {busy ? 'Salvando…' : 'Salvar nome'}
      </button>
    </form>
  );
}
