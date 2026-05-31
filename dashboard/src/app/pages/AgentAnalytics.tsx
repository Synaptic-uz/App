import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MousePointerClick, Users, ArrowUpRight, Coins, BarChart3, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import {
  PageShell,
  PageHeader,
  StatCard,
  Panel,
  EmptyState,
  BackLink,
  MobileCardList,
  DataCard,
  DataTableShell,
  Badge,
  AppLinkButton,
  AppButton,
} from '../components/design';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';

const CHART_LINE = '#0026e6';
const CHART_FILL_ID = 'agentChartFill';

function formatCount(value: unknown) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  return num > 1e12 ? num.toExponential(2) : num.toLocaleString('uz-UZ');
}

export default function AgentAnalytics() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { agent_code } = useParams<{ agent_code?: string }>();
  const detailMode = !!agent_code;

  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(detailMode);
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadAgents() {
      setLoadingAgents(true);
      try {
        const ags = await api.getAgents();
        if (!cancelled) setAgents(Array.isArray(ags) ? ags : []);
      } catch (err) {
        console.error('Failed to load agents', err);
        if (!cancelled) setAgents([]);
      } finally {
        if (!cancelled) setLoadingAgents(false);
      }
    }

    loadAgents();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!detailMode || !agent_code) {
      setDashboard(null);
      setDashboardError('');
      setLoadingDashboard(false);
      return () => {
        cancelled = true;
      };
    }

    async function loadDashboard() {
      setLoadingDashboard(true);
      setDashboardError('');
      try {
        const data = await api.getAgentStats(agent_code);
        if (!cancelled) setDashboard(data);
      } catch (err) {
        console.error('Failed to load agent dashboard', err);
        if (!cancelled) {
          setDashboard(null);
          setDashboardError(err instanceof Error ? err.message : t('analytics.agentLoadError'));
        }
      } finally {
        if (!cancelled) setLoadingDashboard(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [agent_code, detailMode, t]);

  const activeAgents = useMemo(() => agents.filter((a) => a.active).length, [agents]);
  const totalRequests = useMemo(
    () => agents.reduce((sum, a) => sum + Number(a.total_requests || 0), 0),
    [agents]
  );
  const totalClicks = useMemo(
    () => agents.reduce((sum, a) => sum + Number(a.total_clicks || 0), 0),
    [agents]
  );
  const totalRevenue = useMemo(
    () => agents.reduce((sum, a) => sum + Number(a.revenue_earned || 0), 0),
    [agents]
  );

  const periodDays = dashboard?.period_days ?? 7;
  const { totals, daily_stats = [], agent } = dashboard || {
    totals: { clicks: 0, impressions: 0, revenue_earned: 0, ctr: '0%' },
    daily_stats: [],
    agent: {},
  };

  const revenueEarned = totals.revenue_earned ?? agent.revenue_earned ?? 0;

  const clicksData = daily_stats.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('uz-UZ', { weekday: 'short' }),
    clicks: d.clicks,
  }));

  const visitorsData = daily_stats.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('uz-UZ', { weekday: 'short' }),
    visitors: d.impressions,
  }));

  const tooltipStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
  };

  if (detailMode) {
    const agentTitle = dashboard?.agent?.username || agent_code;
    const detailEmpty = !loadingDashboard && (!dashboard || dashboardError);

    return (
      <PageShell className="animate-fadeIn">
        <BackLink to="/agent/analytics" />

        {detailEmpty ? (
          <EmptyState
            title={t('analytics.agentNotFound')}
            description={dashboardError || t('analytics.agentNotFoundDesc')}
            action={<AppButton onClick={() => window.history.back()} variant="secondary">{t('common.back')}</AppButton>}
          />
        ) : loadingDashboard ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-[var(--radius-lg)] bg-black/5" />
              ))}
            </div>
            <Skeleton className="h-96 w-full rounded-[var(--radius-lg)] bg-black/5" />
          </div>
        ) : (
          <>
            <PageHeader
              title={agentTitle ? `${agentTitle} — ${t('analytics.title').toLowerCase()}` : t('analytics.agentAnalytics')}
              description={t('analytics.descriptionAgent', { days: periodDays })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label={t('analytics.revenue')}
                value={format(revenueEarned)}
                hint={t('analytics.all')}
                icon={Coins}
              />
              <StatCard
                label={t('analytics.impressions')}
                value={formatCount(totals.impressions)}
                hint={`${periodDays} ${t('common.days')}`}
                icon={Users}
                accent="neutral"
              />
              <StatCard
                label={t('analytics.clicks')}
                value={formatCount(totals.clicks)}
                hint={`${periodDays} ${t('common.days')}`}
                icon={MousePointerClick}
              />
              <StatCard label={t('analytics.ctr')} value={totals.ctr} hint={`${periodDays} ${t('common.days')}`} icon={ArrowUpRight} accent="neutral" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Panel>
                <h2 className="text-lg font-bold text-[var(--color-text)]">{t('analytics.dailyClicks')}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)] mb-6">{t('analytics.week')}</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={clicksData}>
                      <defs>
                        <linearGradient id={CHART_FILL_ID} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e8ebf2" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#e8ebf2" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.06)" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke={CHART_LINE}
                        strokeWidth={2.5}
                        fill={`url(#${CHART_FILL_ID})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel>
                <h2 className="text-lg font-bold text-[var(--color-text)]">{t('analytics.totalImpressions')}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)] mb-6">
                  {t('analytics.impressionsDesc')}
                </p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visitorsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.06)" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="visitors"
                        stroke={CHART_LINE}
                        strokeWidth={2.5}
                        dot={{ fill: '#001cff', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          </>
        )}
      </PageShell>
    );
  }

  if (!loadingAgents && agents.length === 0) {
    return (
      <PageShell>
        <EmptyState
          title={t('analytics.agentListEmptyTitle')}
          description={t('analytics.agentListEmptyDesc')}
          action={{ to: '/agent/manage', label: t('agents.register') }}
        />
      </PageShell>
    );
  }

  const listActions = (
    <AppLinkButton to="/agent/manage" variant="secondary" className="gap-2">
      <BarChart3 className="w-4 h-4" />
      {t('agents.register')}
    </AppLinkButton>
  );

  return (
    <PageShell className="animate-fadeIn">
      <BackLink />

      <PageHeader
        title={t('analytics.agentListTitle')}
        description={t('analytics.agentListDesc')}
        actions={listActions}
      />

      {loadingAgents ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[var(--radius-lg)] bg-black/5" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-lg)] bg-black/5" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label={t('analytics.totalAgents')}
              value={agents.length.toLocaleString('uz-UZ')}
              hint={t('analytics.agentListDesc')}
              icon={Users}
            />
            <StatCard
              label={t('analytics.activeAgents')}
              value={activeAgents.toLocaleString('uz-UZ')}
              hint={t('agents.active')}
              icon={CheckCircle2}
              accent="neutral"
            />
            <StatCard
              label={t('analytics.totalRequests')}
              value={totalRequests.toLocaleString('uz-UZ')}
              hint={`${t('agents.requests')} · ${t('analytics.all')}`}
              icon={MousePointerClick}
            />
            <StatCard
              label={t('analytics.totalClicks')}
              value={totalClicks.toLocaleString('uz-UZ')}
              hint={format(totalRevenue)}
              icon={Coins}
              accent="neutral"
            />
          </div>

          <MobileCardList>
            {agents.map((agentRow) => (
              <DataCard
                key={agentRow.username}
                title={agentRow.username}
                subtitle={agentRow.owner_email || agentRow.ownerEmail || ''}
                meta={`${t('agents.requests')}: ${formatCount(agentRow.total_requests)} · ${t('agents.clicks')}: ${formatCount(agentRow.total_clicks)}`}
                badges={
                  <>
                    {agentRow.active ? (
                      <Badge variant="success">{t('agents.active')}</Badge>
                    ) : (
                      <Badge variant="danger">{t('agents.paused')}</Badge>
                    )}
                    <Badge variant="neutral">{agentRow.username}</Badge>
                  </>
                }
                actions={
                  <AppLinkButton
                    to={`/agent/${encodeURIComponent(agentRow.username)}/analytics`}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    {t('analytics.openAnalytics')}
                  </AppLinkButton>
                }
              />
            ))}
          </MobileCardList>

          <DataTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)]">{t('agents.username')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)]">{t('agents.ownerEmail')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)] text-center">{t('agents.status')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)] text-right">{t('agents.requests')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)] text-right">{t('agents.clicks')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)] text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agentRow) => (
                  <tr
                    key={agentRow.username}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)]/80 transition-colors"
                  >
                    <td className="p-4 max-w-[180px]">
                      <p className="font-semibold text-[var(--color-text)] truncate">{agentRow.username}</p>
                    </td>
                    <td className="p-4 max-w-[220px]">
                      <p className="text-[var(--color-text-secondary)] truncate">{agentRow.owner_email || agentRow.ownerEmail || '-'}</p>
                    </td>
                    <td className="p-4 text-center">
                      {agentRow.active ? (
                        <Badge variant="success">{t('agents.active')}</Badge>
                      ) : (
                        <Badge variant="danger">{t('agents.paused')}</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right tabular-nums text-[var(--color-text)]">
                      {formatCount(agentRow.total_requests)}
                    </td>
                    <td className="p-4 text-right tabular-nums text-[var(--color-text)]">
                      {formatCount(agentRow.total_clicks)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center">
                        <AppLinkButton
                          to={`/agent/${encodeURIComponent(agentRow.username)}/analytics`}
                          variant="secondary"
                          size="sm"
                        >
                          {t('analytics.openAnalytics')}
                        </AppLinkButton>
                      </div>
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
