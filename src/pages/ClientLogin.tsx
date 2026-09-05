import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import '@/styles/client-login.css';

type MembershipQuery = PromiseLike<{
  data: Array<{ id: string }> | null;
  error: { message: string } | null;
}>;

type MembershipDatabase = {
  from(table: 'organization_members'): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          limit(count: number): MembershipQuery;
        };
      };
    };
  };
};

const membershipDb = supabase as unknown as MembershipDatabase;
const STANDARD_LOGO = '/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png';
const LIGHT_LOGO = '/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png';

const ClientLogin = () => {
  const [email, setEmail] = useState('');
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
    // Never allow the login page to act as an open redirect. Only local,
    // absolute application paths are accepted.
    if (redirectPath?.startsWith('/') && !redirectPath.startsWith('//') && !redirectPath.includes('\\')) {
      return redirectPath;
    }

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    if (roles?.some(({ role }) => role === 'admin')) return '/admin';

    const { data: membership } = await membershipDb
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (membership?.length) return '/app';
    return '/client';
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError, data } = await signIn(email, password);
      if (signInError || !data?.user) {
        setError('Não foi possível entrar. Confira seu e-mail e sua senha.');
        toast({
          title: 'Não foi possível entrar',
          description: 'Confira seu e-mail e sua senha.',
          variant: 'destructive',
        });
        return;
      }

      notifyLogin().catch(() => undefined);
      const destination = await resolveDestination(data.user.id);
      navigate(destination, { replace: true });
    } catch (caughtError: unknown) {
      setError('Ocorreu um erro inesperado. Tente novamente.');
      console.error(caughtError instanceof Error ? caughtError.message : caughtError);
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
              <p>Entre com seus dados para continuar.</p>
            </header>

            <form onSubmit={handleSubmit} className="ws-login-form">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <div className="ws-login-password-head">
                <label htmlFor="password">Senha</label>
                <button type="button">Esqueci minha senha</button>
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
