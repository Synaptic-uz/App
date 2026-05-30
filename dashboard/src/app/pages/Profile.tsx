import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { User, Building2, Phone, Lock, Save, Loader2, ArrowRight, Monitor } from 'lucide-react';
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

type Tab = 'info' | 'password' | 'sessions';

export default function Profile() {
  const { user, updateUser } = useAuth();
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
      toast.success('Sessiya bekor qilindi');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bekor qilib bo‘lmadi');
    }
  }

  async function handleRevokeAllSessions() {
    try {
      await api.revokeAllSessions();
      setSessions((s) => s.filter((x) => x.current));
      toast.success('Boshqa qurilmalardagi sessiyalar bekor qilindi');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bekor qilib bo‘lmadi');
    }
  }

  const roleLabel = isBusiness ? 'Biznes' : 'AI agent';
  const nextPath = isBusiness ? '/business/campaigns' : '/agent/manage';
  const nextLabel = isBusiness ? 'Kampaniyalarga o‘tish' : 'Agentlarga o‘tish';

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
        title="Profil"
        description={
          isBusiness
            ? 'Ism va kompaniya AI reklama mosligini yaxshilaydi. Saqlang — keyin kampaniya yarating.'
            : 'Ism va telefon kabinetda ko‘rinadi. API kalitlar “Agentlar” bo‘limida.'
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
                {displayName || 'Ism kiritilmagan'}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] truncate">{user.email}</p>
            </div>
          </div>
          <Badge variant={isBusiness ? 'primary' : 'neutral'}>{roleLabel}</Badge>

          {!statsLoading && isBusiness && stats && (
            <div className="pt-3 border-t border-[var(--color-border)] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Kampaniyalar</span>
                <span className="font-semibold tabular-nums">{stats.campaigns ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Faol</span>
                <span className="font-semibold tabular-nums">{stats.active_campaigns ?? 0}</span>
              </div>
            </div>
          )}

          {!statsLoading && !isBusiness && stats && (
            <div className="pt-3 border-t border-[var(--color-border)] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Agentlar</span>
                <span className="font-semibold tabular-nums">{stats.agents ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Bosishlar</span>
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
                { id: 'info' as const, label: 'Ma’lumotlar', icon: User },
                { id: 'password' as const, label: 'Parol', icon: Lock },
                { id: 'sessions' as const, label: 'Sessiyalar', icon: Monitor },
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
                  Profil saqlandi. Endi{' '}
                  <Link to={nextPath} className="font-semibold underline">
                    {isBusiness ? 'kampaniya' : 'agent'}
                  </Link>{' '}
                  qo‘shishingiz mumkin.
                </SuccessBanner>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {profileError && <Alert>{profileError}</Alert>}

                <FormField label="Ism" hint="Kabinetda ko‘rinadi">
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
                  <FormField label="Kompaniya" hint="AI reklama matnida ishlatiladi">
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

                <FormField label="Telefon" hint="Ixtiyoriy">
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
                    Saqlash
                  </AppButton>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center min-h-12 px-4 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                  >
                    Bekor qilish
                  </Link>
                </div>
              </form>
            </Panel>
          )}

          {tab === 'password' && (
            <Panel className="p-5 md:p-6">
              <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
                Parolni o‘zgartirgach, boshqa qurilmalarda qayta kirishingiz kerak bo‘lishi mumkin.
              </p>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && <Alert>{passwordError}</Alert>}
                <FormField label="Joriy parol">
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
                  <FormField label="Yangi parol" hint="Kamida 6 belgi">
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
                  <FormField label="Tasdiqlash">
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
                  Parolni yangilash
                </AppButton>
              </form>
            </Panel>
          )}

          {tab === 'sessions' && (
            <Panel className="p-5 md:p-6">
              <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
                Faol qurilmalar. Boshqa joylardan chiqish uchun barcha sessiyalarni bekor qiling.
              </p>
              {sessionsLoading ? (
                <div className="flex justify-center py-8" role="status" aria-label="Qurilmalar yuklanmoqda">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                  <span className="sr-only">Qurilmalar yuklanmoqda</span>
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Boshqa faol qurilmalar yo‘q — faqat joriy brauzer sessiyasi
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
                              (joriy)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          {s.ip || 'IP noma’lum'} · oxirgi:{' '}
                          {new Date(s.last_used_at).toLocaleString('uz-UZ')}
                        </p>
                      </div>
                      {!s.current && (
                        <AppButton
                          type="button"
                          variant="secondary"
                          className="text-sm"
                          onClick={() => handleRevokeSession(s.id)}
                        >
                          Chiqarish
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
                  Boshqa barcha sessiyalarni bekor qilish
                </AppButton>
              )}
            </Panel>
          )}
        </div>
      </div>
    </PageShell>
  );
}
