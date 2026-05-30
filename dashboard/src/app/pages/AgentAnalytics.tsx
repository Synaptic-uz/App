import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, MousePointerClick, Users, ArrowUpRight } from 'lucide-react';
import { api } from '../../lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { PageShell, PageHeader, StatCard, Panel, EmptyState, BackLink } from '../components/design';

const CHART_LINE = '#0026e6';
const CHART_FILL_ID = 'agentChartFill';

export default function AgentAnalytics() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAgents() {
      try {
        const ags = await api.getAgents();
        setAgents(ags);
        if (ags.length > 0) {
          setSelectedAgentId(ags[0].username);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load agents', err);
        setLoading(false);
      }
    }
    loadAgents();
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      if (!selectedAgentId) return;
      setLoading(true);
      try {
        const data = await api.getAgentStats(selectedAgentId);
        setDashboard(data);
      } catch (err) {
        console.error('Failed to load agent dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [selectedAgentId]);

  if (!loading && !agents.length) {
    return (
      <PageShell>
        <EmptyState
          title="Agentlar topilmadi"
          description="Analitikani ko‘rish uchun birinchi AI agentingizni ro‘yxatdan o‘tkazing."
          action={{ to: '/agent/manage', label: 'Agent ro‘yxatdan o‘tkazish' }}
        />
      </PageShell>
    );
  }

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

  return (
    <PageShell className="animate-fadeIn">
      <BackLink />

      <PageHeader
        title={agent.username ? `${agent.username} — analitika` : 'Agent analitika'}
        description={`So‘nggi ${periodDays} kun: bosishlar, CTR va agent ulushi.`}
        actions={
          agents.length > 0 ? (
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-[min(100%,280px)] min-h-12 rounded-[var(--radius-md)] border-[var(--color-border-strong)] bg-[var(--color-surface)]">
                <SelectValue placeholder="Agentni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.username} value={a.username}>
                    {a.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      {loading ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Daromad (jami)"
              value={`${revenueEarned.toLocaleString('uz-UZ')} so‘m`}
              hint="Barcha vaqt"
              icon={DollarSign}
            />
            <StatCard
              label="Ko‘rinishlar"
              value={totals.impressions.toLocaleString('uz-UZ')}
              hint={`${periodDays} kun`}
              icon={Users}
              accent="neutral"
            />
            <StatCard
              label="Bosishlar"
              value={totals.clicks.toLocaleString('uz-UZ')}
              hint={`${periodDays} kun`}
              icon={MousePointerClick}
            />
            <StatCard label="CTR" value={totals.ctr} hint={`${periodDays} kun`} icon={ArrowUpRight} accent="neutral" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel>
              <h2 className="text-lg font-bold text-[var(--color-text)]">Kunlik bosishlar</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)] mb-6">Oxirgi 7 kun</p>
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
              <h2 className="text-lg font-bold text-[var(--color-text)]">Jami ko‘rinishlar</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)] mb-6">
                Reklamalarni ko‘rgan foydalanuvchilar
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
