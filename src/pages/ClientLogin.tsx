import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrentProductAccess } from '@/utils/auth/productAccess';
import '@/styles/client-login.css';
import '@/styles/shared-entry-visual.css';

const STANDARD_LOGO = '/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png';
const LIGHT_LOGO = '/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png';
const WS_TEST_EMAIL = 'wsteste@gmail.com';

const ClientLogin = () => {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { notifyLogin } = useNotifications();
  const { theme, setTheme } = useTheme();
  const light = theme === 'light';
  const logo = light ? LIGHT_LOGO : STANDARD_LOGO;

  const resolveDestination = async (userId: string) => {
    const redirectPath = new URLSearchParams(location.search).get('redirect');
    if (redirectPath?.startsWith('/') && !redirectPath.startsWith('//') && !redirectPath.includes('\\')) {
      return redirectPath;
    }

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    if (roles?.some(({ role }) => role === 'admin')) return '/admin';

    const access = await getCurrentProductAccess();
    if (access.saas) return '/app';
    if (access.extractor) return '/extrator';
    return '/client';
  };

  const signInWithUsername = async (username: string, currentPassword: string) => {
    const response = await fetch('https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/client-username-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ username: username.trim().toLowerCase(), password: currentPassword }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.access_token || !payload?.refresh_token) {
      throw new Error(payload?.error || 'Usuário ou senha inválidos.');
    }

    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
    });

    if (sessionError || !data.user) throw sessionError || new Error('Não foi possível iniciar a sessão.');
    return data.user;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const normalizedCredential = credential.trim();
      let user;

      if (normalizedCredential.includes('@')) {
        const { error: signInError, data } = await signIn(normalizedCredential, password);
        if (signInError || !data?.user) throw new Error('Usuário ou senha inválidos.');
        user = data.user;
      } else {
        user = await signInWithUsername(normalizedCredential, password);
      }

      notifyLogin().catch(() => undefined);

      if (user.email?.trim().toLowerCase() === WS_TEST_EMAIL) {
        navigate('/escolher-produto', { replace: true });
        return;
      }

      const destination = await resolveDestination(user.id);
      navigate(destination, { replace: true });
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error && caughtError.message.includes('Muitas tentativas')
        ? caughtError.message
        : 'Não foi possível entrar. Confira seu usuário e sua senha.';
      setError(message);
      toast({
        title: 'Não foi possível entrar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={`ws-login-page ${light ? 'is-light' : 'is-standard'}`}>
      <div className="ws-login-shell">
        <section className="ws-login-presentation">
          <div className="ws-login-grid" aria-hidden="true" />
          <Link to="/" className="ws-login-brand" aria-label="Ir para o site da WS Gestão Contábil">
            <img src={logo} alt="WS Gestão Contábil" />
          </Link>

          <div className="ws-login-presentation-copy">
            <h1>Sua operação fiscal em um lugar só.</h1>
            <p>Emita documentos, organize empresas e acompanhe sua rotina fiscal com segurança e clareza.</p>

            <div className="ws-login-points">
              <div>
                <strong>Operação centralizada</strong>
                <span>Cadastros e emissões reunidos no mesmo ambiente.</span>
              </div>
              <div>
                <strong>Acesso controlado</strong>
                <span>Cada empresa permanece separada e protegida.</span>
              </div>
            </div>
          </div>

          <span className="ws-login-signature">WS Gestão Contábil · Major Isidoro, AL</span>
        </section>

        <section className="ws-login-access">
          <div className="ws-login-theme-switch" role="group" aria-label="Aparência da tela">
            <button type="button" aria-pressed={!light} onClick={() => setTheme('default')}>Padrão</button>
            <button type="button" aria-pressed={light} onClick={() => setTheme('light')}>Claro</button>
          </div>

          <div className="ws-login-form-wrap">
            <Link to="/" className="ws-login-mobile-brand" aria-label="Ir para o site da WS Gestão Contábil">
              <img src={logo} alt="WS Gestão Contábil" />
            </Link>

            <header className="ws-login-heading">
              <span>Acesso à plataforma</span>
              <h2>Bem-vindo de volta</h2>
              <p>Clientes do escritório entram com nome de usuário. Administradores e produtos fiscais continuam podendo usar e-mail.</p>
            </header>

            <form onSubmit={handleSubmit} className="ws-login-form">
              <label htmlFor="credential">Usuário</label>
              <input
                id="credential"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="seu.usuario"
                value={credential}
                onChange={(event) => setCredential(event.target.value)}
                required
              />

              <div className="ws-login-password-head">
                <label htmlFor="password">Senha</label>
              </div>
              <div className="ws-login-password-field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {error && <div role="alert" className="ws-login-error">{error}</div>}

              <button type="submit" className="ws-login-submit" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <footer className="ws-login-footer">
              <p>Acesso exclusivo para usuários autorizados.</p>
              <nav aria-label="Documentos legais">
                <Link to="/termos-de-servico">Termos de Serviço</Link>
                <Link to="/politica-de-privacidade">Política de Privacidade</Link>
              </nav>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ClientLogin;
