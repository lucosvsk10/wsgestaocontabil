import { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Strength = {
  level: 0 | 1 | 2 | 3 | 4;
  label: '' | 'Fraco' | 'Normal' | 'Forte' | 'Excelente';
};

function passwordStrength(value: string): Strength {
  if (!value) return { level: 0, label: '' };

  const classes = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;

  if (value.length < 8) return { level: 1, label: 'Fraco' };
  if (value.length >= 16 || (value.length >= 12 && classes >= 3)) return { level: 4, label: 'Excelente' };
  if (value.length >= 12 || (value.length >= 10 && classes >= 2)) return { level: 3, label: 'Forte' };
  return { level: 2, label: 'Normal' };
}

const segmentClass = (index: number, level: number) => {
  if (index >= level) return 'bg-muted';
  if (level === 1) return 'bg-red-500';
  if (level === 2) return 'bg-amber-500';
  if (level === 3) return 'bg-emerald-500';
  return 'bg-emerald-600';
};

export function FirstAccessPasswordModal() {
  const { userData, refreshUserData } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState('');
  const required = Boolean((userData as any)?.role === 'client' && (userData as any)?.must_change_password);
  const strength = useMemo(() => passwordStrength(password), [password]);
  const canSave = strength.level >= 2 && password === confirm && !saving;

  const save = async () => {
    setError('');
    if (strength.level < 2) {
      setError('Escolha uma senha com intensidade pelo menos Normal.');
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
      setDismissed(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível alterar a senha.');
    } finally {
      setSaving(false);
    }
  };

  return <Dialog
    open={required && !dismissed}
    onOpenChange={(open) => {
      if (!open) {
        setDismissed(true);
        setError('');
      }
    }}
  >
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Altere sua senha de primeiro acesso</DialogTitle>
        <DialogDescription>
          Você entrou com a senha padrão fornecida pela WS. Recomendamos criar uma senha exclusiva agora. Se preferir, pode fechar esta janela e fazer isso depois.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="new-client-password">Nova senha</Label>
          <div className="relative">
            <Input
              id="new-client-password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              onClick={() => setShow((value) => !value)}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="space-y-1.5" aria-live="polite">
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((index) => <span key={index} className={`h-1.5 rounded-full transition-colors ${segmentClass(index, strength.level)}`} />)}
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-muted-foreground">Intensidade da senha</span>
              <span className="font-medium text-foreground">{strength.label || 'Digite uma senha'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-client-password">Confirmar nova senha</Label>
          <div className="relative">
            <Input
              id="confirm-client-password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              onClick={() => setShow((value) => !value)}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {confirm && password !== confirm && <p className="text-xs text-destructive">As senhas ainda não coincidem.</p>}
        {error && <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

        <Button className="w-full" disabled={!canSave} onClick={() => void save()}>
          {saving ? 'Alterando...' : 'Salvar nova senha'}
        </Button>
        <p className="text-center text-[11px] leading-5 text-muted-foreground">
          A partir do nível Normal a senha já pode ser salva. Enquanto a senha padrão continuar ativa, este aviso voltará a aparecer em um novo acesso.
        </p>
      </div>
    </DialogContent>
  </Dialog>;
}
