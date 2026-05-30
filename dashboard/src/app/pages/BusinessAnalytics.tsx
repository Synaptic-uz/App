import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { MousePointerClick, Eye, Wallet, Zap, Coins, PiggyBank } from 'lucide-react';
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
import RouteFallback from '../components/RouteFallback';

const BusinessDailyChart = lazy(() => import('../components/analytics/BusinessDailyChart'));

export default function BusinessAnalytics() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const camps = await api.getCampaigns();
        setCampaigns(camps);
        if (camps.length > 0) {
          setSelectedCampaignId(camps[0]._id || camps[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load campaigns', err);
        setLoading(false);
      }
    }
    loadCampaigns();
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      if (!selectedCampaignId) return;
      setLoading(true);
      try {
        const data = await api.getCampaignDashboard(selectedCampaignId);
        setDashboard(data);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [selectedCampaignId]);

  if (!loading && !campaigns.length) {
    return (
      <PageShell>
        <EmptyState
          title={t('campaigns.noData')}
          description={t('analytics.noDataDesc')}
          action={{ to: '/business/campaigns', label: t('campaigns.create') }}
        />
      </PageShell>
    );
  }

  const periodDays = dashboard?.period_days ?? 7;
  const { totals, daily_stats = [], campaign } = dashboard || {
    totals: { clicks: 0, impressions: 0, ctr: '0%', spent_period: 0, cpc_rate: 0, avg_cpc: 0 },
    daily_stats: [],
    campaign: {},
  };

  const dailyChartData = daily_stats.map((d: any) => ({
    day: new Date(d.date).toLocaleDateString('uz-UZ', { weekday: 'short' }),
    clicks: d.clicks,
    impressions: d.impressions,
  }));

  const funnelData = [
    { stage: t('analytics.impressions'), count: totals.impressions ?? 0, rate: '—' },
    { stage: t('analytics.clicks'), count: totals.clicks ?? 0, rate: totals.ctr ?? '0%' },
    { stage: t('analytics.conversions'), count: totals.conversions ?? 0, rate: totals.conversion_rate ?? '0%' },
  ];

  return (
    <PageShell className="animate-fadeIn">
      <BackLink />

      <PageHeader
        title={campaign.name ? t('analytics.campaignAnalytics', { name: campaign.name }) : t('analytics.businessAnalytics')}
        description={t('analytics.description', { days: periodDays })}
        actions={
          campaigns.length > 0 ? (
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-[min(100%,280px)] min-h-12 rounded-[var(--radius-md)] border-[var(--color-border-strong)] bg-white shadow-[var(--shadow-xs)]">
                <SelectValue placeholder={t('analytics.selectCampaign')} />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => {
                  const id = c._id || c.id;
                  return (
                    <SelectItem key={id} value={id}>
                      {c.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)]" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard
              label={t('analytics.impressions')}
              value={totals.impressions.toLocaleString('uz-UZ')}
              hint={`${periodDays} ${t('common.days')}`}
              icon={Eye}
            />
            <StatCard
              label={t('analytics.clicks')}
              value={totals.clicks.toLocaleString('uz-UZ')}
              hint={`${periodDays} ${t('common.days')}`}
              icon={MousePointerClick}
            />
            <StatCard label={t('analytics.ctr')} value={totals.ctr} hint={t('analytics.hints.ctr')} icon={Zap} />
            <StatCard
              label={t('campaigns.cpcRate')}
              value={`${(totals.cpc_rate || campaign.cpc_rate || 0).toLocaleString()} ${t('common.uzs')}`}
              hint={t('analytics.hints.cpc')}
              icon={Coins}
              accent="neutral"
            />
            <StatCard
              label={t('analytics.spent')}
              value={`${(totals.spent_period || 0).toLocaleString()} ${t('common.uzs')}`}
              hint={`${periodDays} ${t('common.days')} (${t('analytics.clicks')} × ${t('campaigns.cpc')})`}
              icon={PiggyBank}
              accent="neutral"
            />
            <StatCard
              label={t('analytics.budgetRemaining')}
              value={`${(campaign.budget_remaining ?? 0).toLocaleString()} ${t('common.uzs')}`}
              hint={t('analytics.totalBudget', { amount: (campaign.budget || 0).toLocaleString(), currency: t('common.uzs') })}
              icon={Wallet}
              accent="neutral"
            />
          </div>

          <div className="space-y-6">
            <Panel>
              <h2 className="text-lg font-bold text-[#111111]">{t('analytics.dailyActivity')}</h2>
              <p className="mt-1 text-sm text-[#71717a] mb-6">{t('analytics.dailyActivityDesc', { days: periodDays })}</p>
              <Suspense fallback={<div className="h-72 md:h-80 flex items-center justify-center"><RouteFallback /></div>}>
                <BusinessDailyChart data={dailyChartData} />
              </Suspense>
            </Panel>

            <Panel>
              <h2 className="text-lg font-bold text-[#111111]">Konversiya voronkasi</h2>
              <p className="mt-1 text-sm text-[#71717a] mb-6">
                {t('analytics.funnelDesc', { days: periodDays })}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[320px]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-3 px-4 font-semibold text-[#71717a]">{t('analytics.stage')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-[#71717a]">{t('analytics.count')}</th>
                      <th className="text-right py-3 px-4 font-semibold text-[#71717a]">{t('analytics.percentage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnelData.map((row) => (
                      <tr
                        key={row.stage}
                        className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)] transition-colors"
                      >
                        <td className="py-4 px-4 font-medium text-[#111111]">{row.stage}</td>
                        <td className="py-4 px-4 text-right tabular-nums text-[#111111]">
                          {row.count.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right text-[#71717a]">{row.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </>
      )}
    </PageShell>
  );
}
