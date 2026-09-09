import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const strongPassword = (value: string) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);

export function FirstAccessPasswordModal() {
  const { userData, refreshUserData } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const required = Boolean((userData as any)?.role === 'client' && (userData as any)?.must_change_password);

  const save = async () => {
    setError('');
    if (!strongPassword(password)) {
      setError('Use pelo menos 8 caracteres, com letra, número e caractere especial.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setSaving(true);
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;
      const { error: flagError } = await (supabase as any).rpc('mark_client_password_changed');
      if (flagError) throw flagError;
      await refreshUserData();
      setPassword('');
      setConfirm('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível alterar a senha.');
    } finally {
      setSaving(false);
    }
  };

  return <Dialog open={required}>
    <DialogContent className="sm:max-w-md" onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
      <DialogHeader>
        <DialogTitle>Altere sua senha de primeiro acesso</DialogTitle>
        <DialogDescription>
          Você entrou com a senha padrão fornecida pela WS. Antes de continuar, crie uma senha exclusiva para sua empresa.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="new-client-password">Nova senha</Label>
          <Input id="new-client-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-client-password">Confirmar nova senha</Label>
          <Input id="confirm-client-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </div>
        <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setShow((value) => !value)}>
          {show ? 'Ocultar senhas' : 'Mostrar senhas'}
        </button>
        {error && <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={saving} onClick={() => void save()}>{saving ? 'Alterando...' : 'Salvar nova senha'}</Button>
        <p className="text-center text-[11px] leading-5 text-muted-foreground">Essa alteração é obrigatória apenas no primeiro acesso ou após uma redefinição administrativa.</p>
      </div>
    </DialogContent>
  </Dialog>;
}
