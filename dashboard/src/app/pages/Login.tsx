import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api } from '../../lib/api';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { AuthLayout, AuthCard, FormField, inputClassName, Logo, Alert } from '../components/design';
import { cn } from '../components/ui/utils';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { token, user, refreshToken } = await api.login({ email, password });
      login(token, user, refreshToken);
      navigate(from || '/', { replace: true });
    } catch (err: any) {
      setError(err.message || t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Helmet>
        <title>{t('auth.signIn')} - Synaptic AI</title>
        <meta name="description" content="Synaptic AI tizimiga kirish va o‘z reklamalaringizni boshqarish." />
        <link rel="canonical" href="https://synaptic.uz/login" />
      </Helmet>
      <AuthCard>
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">{t('auth.signIn')}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t('auth.welcomeBack')}</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && <Alert>{error}</Alert>}

          <FormField label={t('auth.email')}>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
              <input
                type="email"
                required
                className={cn(inputClassName, 'pl-12')}
                placeholder="siz@kompaniya.uz"
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
                placeholder="••••••••"
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
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.signIn')}
          </button>

          <p className="text-center text-sm text-[var(--color-text-secondary)]">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-semibold text-[var(--color-primary)] hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
