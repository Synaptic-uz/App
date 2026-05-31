import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { User, Building2, Phone, Lock, Save, Loader2, ArrowRight, Monitor, Settings, Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency, type Currency } from '../context/CurrencyContext';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useAuth } from '../context/AuthContext';
import type { AccountStats } from '../context/auth-context';
import {
  PageShell,
  PageHeader,
  Panel,
  FormField,
  inputClassName,
  AppButton,
  AppLinkButton,
  Alert,
  Badge,
  BackLink,
  SuccessBanner,
} from '../components/design';
import { cn } from '../components/ui/utils';

type Tab = 'info' | 'password' | 'sessions' | 'settings';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('info');

  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [companyName, setCompanyName] = useState(user?.company_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [sessions, setSessions] = useState<
    { id: string; label: string; ip: string; last_used_at: string; current: boolean }[]
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const isBusiness = user?.role === 'business';

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name ?? '');
    setCompanyName(user.company_name ?? '');
    setPhone(user.phone ?? '');
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const data = await api.me();
        if (!cancelled) {
          updateUser(data.user);
          setStats(data.stats || null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ma’lumot yuklanmadi';
        toast.error(msg);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  useEffect(() => {
    if (tab !== 'sessions') return;
    setSessionsLoading(true);
    api
      .getAuthSessions()
      .then((data) => setSessions(data.sessions || []))
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Sessiyalar yuklanmadi'))
      .finally(() => setSessionsLoading(false));
  }, [tab]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      const data = await api.updateProfile({
        display_name: displayName.trim(),
        company_name: isBusiness ? companyName.trim() : undefined,
        phone: phone.trim(),
      });
      updateUser(data.user);
      setStats(data.stats || null);
      setProfileSaved(true);
      toast.success('Profil saqlandi');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Saqlab bo‘lmadi';
      setProfileError(msg);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Yangi parollar mos emas');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Yangi parol kamida 6 belgidan iborat bo‘lsin');
      return;
    }
    setSavingPassword(true);
    try {
      const data = await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      updateUser(data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Parol yangilandi');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Parol yangilanmadi';
      setPasswordError(msg);
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleRevokeSession(id: string) {
    try {
      await api.revokeSession(id);
      setSessions((s) => s.filter((x) => x.id !== id));
      toast.success(t('profile.sessionRevokeSuccess'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bekor qilib bo‘lmadi');
    }
  }

  async function handleRevokeAllSessions() {
    try {
      await api.revokeAllSessions();
      setSessions((s) => s.filter((x) => x.current));
      toast.success(t('profile.sessionsRevokeAllSuccess'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bekor qilib bo‘lmadi');
    }
  }

  const roleLabel = isBusiness ? t('auth.roleBusiness') : t('auth.roleAgent');
  const nextPath = isBusiness ? '/business/campaigns' : '/agent/manage';
  const nextLabel = isBusiness ? t('profile.goToCampaigns') : t('profile.goToAgents');

  if (!user) {
    return (
      <PageShell>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="animate-fadeIn">
      <Helmet>
        <title>Profil — Synaptic</title>
      </Helmet>

      <BackLink />

      <PageHeader
        title={t('profile.headerTitle')}
        description={
          isBusiness
            ? t('profile.headerDescBusiness')
            : t('profile.headerDescAgent')
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
        <Panel className="lg:col-span-1 p-5 space-y-4 h-fit">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-icon-bg)] text-xl font-bold text-[var(--color-primary)]">
              {(displayName || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[var(--color-text)] truncate">
                {displayName || t('profile.noName')}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] truncate">{user.email}</p>
            </div>
          </div>
          <Badge variant={isBusiness ? 'primary' : 'neutral'}>{roleLabel}</Badge>

          {!statsLoading && isBusiness && stats && (
            <div className="pt-3 border-t border-[var(--color-border)] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">{t('profile.campaigns')}</span>
                <span className="font-semibold tabular-nums">{stats.campaigns ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">{t('profile.active')}</span>
                <span className="font-semibold tabular-nums">{stats.active_campaigns ?? 0}</span>
              </div>
            </div>
          )}

          {!statsLoading && !isBusiness && stats && (
            <div className="pt-3 border-t border-[var(--color-border)] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">{t('profile.agents')}</span>
                <span className="font-semibold tabular-nums">{stats.agents ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">{t('profile.clicks')}</span>
                <span className="font-semibold tabular-nums">{stats.total_clicks ?? 0}</span>
              </div>
            </div>
          )}

          <AppLinkButton to={nextPath} className="w-full gap-2 mt-2">
            {nextLabel}
            <ArrowRight className="w-4 h-4" />
          </AppLinkButton>
        </Panel>

        <div className="lg:col-span-2 space-y-4">
          <div
            className="flex gap-1 p-1 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]"
            role="tablist"
          >
            {(
              [
                { id: 'info' as const, label: t('profile.infoTab'), icon: User },
                { id: 'password' as const, label: t('profile.passwordTab'), icon: Lock },
                { id: 'settings' as const, label: t('profile.settingsTab'), icon: Settings },
                { id: 'sessions' as const, label: t('profile.sessionsTab'), icon: Monitor },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 min-h-11 rounded-[var(--radius-sm)] text-sm font-semibold transition-colors',
                  tab === id
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-xs)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <Panel className="p-5 md:p-6">
              {profileSaved && (
                <SuccessBanner className="mb-4">
                  {t('profile.saveSuccessDesc', { type: isBusiness ? t('profile.campaign') : t('profile.agent') })}
                </SuccessBanner>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {profileError && <Alert>{profileError}</Alert>}

                <FormField label={t('profile.nameLabel')} hint={t('profile.nameHint')}>
                  <input
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setProfileSaved(false);
                    }}
                    className={inputClassName}
                    placeholder="Masalan: Dilyor"
                    autoComplete="name"
                  />
                </FormField>

                {isBusiness && (
                  <FormField label={t('profile.companyLabel')} hint={t('profile.companyHint')}>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                      <input
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          setProfileSaved(false);
                        }}
                        className={cn(inputClassName, 'pl-12')}
                        placeholder="Masalan: Hamkorbank"
                        autoComplete="organization"
                      />
                    </div>
                  </FormField>
                )}

                <FormField label={t('profile.phoneLabel')} hint={t('profile.phoneHint')}>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                    <input
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setProfileSaved(false);
                      }}
                      className={cn(inputClassName, 'pl-12')}
                      placeholder="+998 90 123 45 67"
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>
                </FormField>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <AppButton type="submit" disabled={savingProfile} className="gap-2 sm:min-w-[140px]">
                    {savingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {t('profile.saveBtn')}
                  </AppButton>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center min-h-12 px-4 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                  >
                    {t('profile.cancelBtn')}
                  </Link>
                </div>
              </form>
            </Panel>
          )}

          {tab === 'password' && (
            <Panel className="p-5 md:p-6">
              <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
                {t('profile.passwordNote')}
              </p>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && <Alert>{passwordError}</Alert>}
                <FormField label={t('profile.currentPasswordLabel')}>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClassName}
                  />
                </FormField>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField label={t('profile.newPasswordLabel')} hint={t('profile.newPasswordHint')}>
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={inputClassName}
                    />
                  </FormField>
                  <FormField label={t('profile.confirmPasswordLabel')}>
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClassName}
                    />
                  </FormField>
                </div>
                <AppButton type="submit" variant="secondary" disabled={savingPassword} className="gap-2">
                  {savingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {t('profile.updatePasswordBtn')}
                </AppButton>
              </form>
            </Panel>
          )}

          {tab === 'sessions' && (
            <Panel className="p-5 md:p-6">
              <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
                {t('profile.sessionsNote')}
              </p>
              {sessionsLoading ? (
                <div className="flex justify-center py-8" role="status" aria-label={t('profile.loadingSessions')}>
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                  <span className="sr-only">{t('profile.loadingSessions')}</span>
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  {t('profile.noOtherSessions')}
                </p>
              ) : (
                <ul className="space-y-3">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                    >
                      <div>
                        <p className="font-semibold text-[var(--color-text)]">
                          {s.label}
                          {s.current && (
                            <span className="ml-2 text-xs font-medium text-[var(--color-primary)]">
                              {t('profile.currentSession')}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          {s.ip || t('profile.unknownIp')} · {t('profile.lastUsed', { date: new Date(s.last_used_at).toLocaleString(i18n.language) })}
                        </p>
                      </div>
                      {!s.current && (
                        <AppButton
                          type="button"
                          variant="secondary"
                          className="text-sm"
                          onClick={() => handleRevokeSession(s.id)}
                        >
                          {t('profile.revokeBtn')}
                        </AppButton>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {sessions.some((s) => !s.current) && (
                <AppButton
                  type="button"
                  variant="secondary"
                  className="mt-4 w-full sm:w-auto"
                  onClick={handleRevokeAllSessions}
                >
                  {t('profile.revokeAllBtn')}
                </AppButton>
              )}
            </Panel>
          )}

          {tab === 'settings' && (
            <Panel className="p-5 md:p-6">
              <h3 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[var(--color-primary)]" />
                {t('profile.settingsTitle')}
              </h3>
              <div className="space-y-6">
                <FormField 
                  label={t('profile.currencyLabel')} 
                  hint={t('profile.currencyHint')}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['UZS', 'USD', 'EUR', 'RUB'] as Currency[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                           setCurrency(c);
                           toast.success(t('profile.currencyChangeSuccess', { currency: c }));
                        }}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1.5 p-4 rounded-[var(--radius-lg)] border transition-all duration-200',
                          currency === c
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)] shadow-[var(--shadow-sm)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                        )}
                      >
                        <span className="text-sm font-bold">{c === 'UZS' ? t('common.currencySymbol') : c}</span>
                        <span className="text-[10px] opacity-70 uppercase">{t(`profile.currencyNames.${c}`)}</span>
                      </button>
                    ))}
                  </div>
                </FormField>

                <div className="pt-4 border-t border-[var(--color-border)]">
                   <div className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)]">
                      <Coins className="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">{t('profile.currencyDisclaimerTitle')}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mt-1">
                          {t('profile.currencyDisclaimerDesc')}
                        </p>
                      </div>
                   </div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </PageShell>
  );
}
