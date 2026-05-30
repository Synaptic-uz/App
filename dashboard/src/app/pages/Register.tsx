import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../../lib/api';
import { Lock, Mail, Briefcase, Bot, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { AuthLayout, AuthCard, FormField, inputClassName, Logo, Alert } from '../components/design';
import { cn } from '../components/ui/utils';

export default function Register() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const location = useLocation();
  const initialRole = (location.state as { role?: 'business' | 'agent' })?.role ?? 'business';
  const [role, setRole] = useState<'business' | 'agent'>(initialRole);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { token, user, refreshToken } = await api.register({ email, password, role });
      login(token, user, refreshToken);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || t('auth.registerFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Helmet>
        <title>{t('auth.registerPageTitle')}</title>
        <meta name="description" content={t('auth.registerPageDesc')} />
        <link rel="canonical" href="https://synaptic.uz/register" />
      </Helmet>
      <AuthCard>
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">{t('auth.createAccount')}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('auth.joinFuture')}</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && <Alert>{error}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { id: 'business' as const, label: t('auth.roleBusiness'), icon: Briefcase },
                { id: 'agent' as const, label: t('auth.roleAgent'), icon: Bot },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRole(id)}
                className={cn(
                  'flex flex-col items-center gap-2 min-h-[88px] rounded-[var(--radius-md)] border-2 p-4 transition-all',
                  role === id
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-muted)] shadow-[var(--shadow-xs)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                )}
              >
                <Icon
                  className={cn(
                    'w-6 h-6',
                    role === id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-semibold',
                    role === id ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>

          <FormField label={t('auth.email')}>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
              <input
                type="email"
                required
                className={cn(inputClassName, 'pl-12')}
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label={t('auth.password')}>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
              <input
                type="password"
                required
                className={cn(inputClassName, 'pl-12')}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </FormField>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-12 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-sm font-semibold text-white shadow-[var(--shadow-glow)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.createAccount')}
          </button>

          <p className="text-center text-sm text-[var(--color-text-secondary)]">
            {t('auth.alreadyAccount')}{' '}
            <Link to="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
              {t('auth.signIn')}
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
