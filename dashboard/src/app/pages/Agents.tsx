import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuth } from '../context/AuthContext';
import { Plus, CheckCircle2, XCircle, Copy, Check, Pause, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  PageShell,
  PageHeader,
  BackLink,
  AppButton,
  Alert,
  Badge,
  FormField,
  inputClassName,
  DataTableShell,
  MobileCardList,
  DataCard,
  IconButton,
} from '../components/design';

export default function Agents() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const currentLocale = i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    setLoading(true);
    try {
      const ags = await api.getAgents();
      setAgents(Array.isArray(ags) ? ags : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await api.registerAgent({
        username,
        owner_email: user?.email || '',
      });
      setNewApiKey(result.api_key);
      if (result.api_key) {
        localStorage.setItem('synaptic_demo_api_key', result.api_key);
      }
      setUsername('');
      await loadAgents();
      toast.success(t('agents.successRegister'));
    } catch (err: any) {
      setError(err.message || t('agents.registerError'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setNewApiKey(null);
      setError('');
      setCopied(false);
    }
  }

  async function handleToggleActive(agent: { _id: string; username: string; active: boolean }) {
    setStatusUpdatingId(agent._id);
    try {
      await api.updateAgent(agent._id, { active: !agent.active });
      toast.success(!agent.active ? t('agents.statusActive') : t('agents.statusPaused'));
      await loadAgents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('agents.statusError');
      toast.error(msg);
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleDeleteAgent(agent: { _id: string; username: string }) {
    if (!window.confirm(t('agents.deleteConfirm', { username: agent.username }))) return;
    try {
      await api.deleteAgent(agent._id);
      toast.success(t('agents.deleteSuccess'));
      await loadAgents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('agents.deleteError');
      toast.error(msg);
    }
  }

  function renderAgentActions(agent: { _id: string; username: string; active: boolean }) {
    return (
      <>
        <IconButton
          label={agent.active ? t('agents.pause') : t('agents.resume')}
          onClick={() => handleToggleActive(agent)}
          disabled={statusUpdatingId === agent._id}
        >
          {agent.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </IconButton>
        <IconButton
          label={t('agents.delete')}
          className="hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
          onClick={() => handleDeleteAgent(agent)}
        >
          <Trash2 className="w-4 h-4" />
        </IconButton>
      </>
    );
  }

  async function copyApiKey() {
    if (!newApiKey) return;
    await navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <PageShell className="animate-fadeIn">
      <BackLink />

      <PageHeader
        title={t('agents.headerTitle')}
        description={t('agents.headerDesc')}
        actions={
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <AppButton className="gap-2">
                <Plus className="w-5 h-5" />
                {t('agents.registerBtn')}
              </AppButton>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-[var(--radius-xl)]">
              <DialogHeader>
                <DialogTitle>{t('agents.registerDialogTitle')}</DialogTitle>
              </DialogHeader>
              {newApiKey ? (
                <div className="space-y-4 mt-2 animate-scaleIn">
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {t('agents.registerSuccessDesc')}
                  </p>
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4 font-mono text-sm break-all text-[var(--color-text)]">
                    {newApiKey}
                  </div>
                  <div className="flex gap-2">
                    <AppButton onClick={copyApiKey} className="flex-1 gap-2">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? t('agents.copied') : t('agents.copy')}
                    </AppButton>
                    <AppButton variant="secondary" onClick={() => handleDialogChange(false)}>
                      {t('agents.ready')}
                    </AppButton>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4 mt-2">
                  {error && <Alert>{error}</Alert>}
                  <FormField label={t('agents.usernameLabel')} hint={t('agents.usernameHint')}>
                    <input
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={inputClassName}
                      placeholder={t('agents.usernamePlaceholder')}
                    />
                  </FormField>
                  <FormField label={t('agents.ownerEmailLabel')}>
                    <input disabled value={user?.email || ''} className={inputClassName} />
                  </FormField>
                  <AppButton type="submit" disabled={submitting} className="w-full">
                    {submitting ? t('agents.registering') : t('agents.createApiKey')}
                  </AppButton>
                </form>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)]" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-12 text-center">
          <p className="text-[var(--color-text-secondary)] mb-4">{t('agents.noAgents')}</p>
          <AppButton onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            {t('agents.registerFirst')}
          </AppButton>
        </div>
      ) : (
        <>
          <MobileCardList>
            {agents.map((agent) => (
              <DataCard
                key={agent._id}
                title={agent.username}
                subtitle={agent.owner_email}
                meta={t('agents.lastActivity', { 
                  date: new Date(agent.last_seen || agent.updatedAt).toLocaleDateString(currentLocale) 
                })}
                badges={
                  agent.active ? (
                    <Badge variant="success">
                      <CheckCircle2 className="w-3 h-3" /> {t('agents.active')}
                    </Badge>
                  ) : (
                    <Badge variant="danger">
                      <XCircle className="w-3 h-3" /> {t('agents.paused')}
                    </Badge>
                  )
                }
                actions={renderAgentActions(agent)}
              />
            ))}
          </MobileCardList>

          <DataTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)]">{t('agents.agentId')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)]">{t('agents.ownerEmail')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)] text-center">{t('agents.status')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)] text-center">{t('agents.actions')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)] text-right">{t('agents.requests')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)] text-right">{t('agents.clicks')}</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr
                    key={agent._id}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)]/80 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-semibold text-[var(--color-text)]">{agent.username}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {t('agents.lastActivity', { 
                          date: new Date(agent.last_seen || agent.updatedAt).toLocaleDateString(currentLocale) 
                        })}
                      </p>
                    </td>
                    <td className="p-4 text-[var(--color-text-secondary)]">{agent.owner_email}</td>
                    <td className="p-4 text-center">
                      {agent.active ? (
                        <Badge variant="success">
                          <CheckCircle2 className="w-3 h-3" /> {t('agents.active')}
                        </Badge>
                      ) : (
                        <Badge variant="danger">
                          <XCircle className="w-3 h-3" /> {t('agents.paused')}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        {renderAgentActions(agent)}
                      </div>
                    </td>
                    <td className="p-4 text-right tabular-nums text-[var(--color-text)]">
                      {(agent.total_requests || 0).toLocaleString(currentLocale)}
                    </td>
                    <td className="p-4 text-right tabular-nums font-semibold text-[var(--color-primary)]">
                      {(agent.total_clicks || 0).toLocaleString(currentLocale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </>
      )}
    </PageShell>
  );
}
