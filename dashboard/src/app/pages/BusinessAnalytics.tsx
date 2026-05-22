import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { MousePointerClick, DollarSign, Wallet, Zap } from 'lucide-react';
import { api } from '../../lib/api';
import MainBalanceBanner from '../components/MainBalanceBanner';
import { uz, dateLocale } from '../../lib/uz';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";

export default function BusinessAnalytics() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mainBalance, setMainBalance] = useState(0);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const data = await api.getCampaigns();
        const camps = Array.isArray(data) ? data : data.campaigns || [];
        setCampaigns(camps);
        setMainBalance(
          typeof data?.main_balance === 'number'
            ? data.main_balance
            : camps.reduce((s: number, c: { budget?: number }) => s + (c.budget || 0), 0)
        );
        if (camps.length > 0) {
          setSelectedCampaignId(camps[0].id || camps[0]._id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load campaigns", err);
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
        if (data?.campaign?.budget !== undefined) {
          const dataCamps = await api.getCampaigns();
          const list = Array.isArray(dataCamps) ? dataCamps : dataCamps.campaigns || [];
          setMainBalance(
            typeof dataCamps?.main_balance === 'number'
              ? dataCamps.main_balance
              : list.reduce((s: number, c: { budget?: number }) => s + (c.budget || 0), 0)
          );
        }
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [selectedCampaignId]);

  if (!loading && !campaigns.length) {
    return (
      <div className="size-full bg-white flex flex-col items-center justify-center min-h-[500px]">
        <h2 className="text-2xl font-bold text-black mb-2">{uz.businessAnalytics.noCampaigns}</h2>
        <p className="text-black/60 mb-6">{uz.businessAnalytics.noCampaignsSub}</p>
        <button 
          onClick={() => navigate('/business/campaigns')}
          className="px-6 py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors"
        >
          {uz.businessAnalytics.createCampaign}
        </button>
      </div>
    );
  }

  const { totals, daily_stats = [], campaign } = dashboard || { totals: { clicks: 0, impressions: 0, ctr: '0%' }, daily_stats: [], campaign: {} };

  // Calculate CPC trend and format for charts
  const avgCostPerClick = campaign.cpc_rate ? (campaign.cpc_rate / 1000).toFixed(2) : "0.00"; // Assuming cpc_rate is in UZS, convert to a display friendly number for demo or leave it
  
  const dailyClicksData = daily_stats.map((d: any) => ({
    day: new Date(d.date).toLocaleDateString(dateLocale, { weekday: 'short' }),
    clicks: d.clicks,
    impressions: d.impressions,
  }));

  // Simulate some conversion data based on real clicks if actual conversion stats aren't heavily populated by backend /dashboard/:id yet
  const clicksPerActionData = [
    { action: uz.businessAnalytics.productView, clicks: totals.clicks, conversions: Math.floor(totals.clicks * 0.4) },
    { action: uz.businessAnalytics.addToCart, clicks: Math.floor(totals.clicks * 0.4), conversions: Math.floor(totals.clicks * 0.15) },
    { action: uz.businessAnalytics.purchase, clicks: Math.floor(totals.clicks * 0.15), conversions: Math.floor(totals.clicks * 0.05) },
  ];

  return (
    <div className="size-full bg-white overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">
              {campaign.name ? uz.businessAnalytics.campaignTitle(campaign.name) : uz.businessAnalytics.title}
            </h1>
            <p className="text-black/60">{uz.businessAnalytics.subtitle}</p>
          </div>
          <div className="flex gap-3 items-center">
            {campaigns.length > 1 && (
              <span className="text-sm text-black/40 font-medium">{uz.businessAnalytics.showing(campaign.name)}</span>
            )}
            <button className="px-6 py-2 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors">
              {uz.common.export}
            </button>
          </div>
        </div>

        {!loading && campaigns.length > 0 && (
          <MainBalanceBanner
            mainBalance={mainBalance}
            campaignCount={campaigns.length}
            className="mb-8"
          />
        )}

        {loading ? (
          <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl bg-black/5" />)}
             </div>
             <Skeleton className="h-96 w-full rounded-xl bg-black/5" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <MousePointerClick className="w-6 h-6 text-[#0000FF]" />
                  </div>
                  <span className="text-sm text-black/60">{uz.common.days7}</span>
                </div>
                <p className="text-black/60 text-sm mb-1">{uz.businessAnalytics.totalClicks}</p>
                <p className="text-3xl font-bold text-black">{totals.clicks.toLocaleString()}</p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <DollarSign className="w-6 h-6 text-[#0000FF]" />
                  </div>
                  <span className="text-sm text-black/60">{uz.common.average}</span>
                </div>
                <p className="text-black/60 text-sm mb-1">{uz.businessAnalytics.costPerClick}</p>
                <p className="text-3xl font-bold text-black">{campaign.cpc_rate || 0}</p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <Wallet className="w-6 h-6 text-[#0000FF]" />
                  </div>
                  <span className="text-sm text-black/60">This campaign</span>
                </div>
                <p className="text-black/60 text-sm mb-1">{uz.businessAnalytics.balanceLeft}</p>
                <p className="text-3xl font-bold text-black">
                  {campaign.budget > 0 ? `${(campaign.budget || 0).toLocaleString()} ${uz.common.uzs}` : uz.common.unlimited}
                </p>
                <p className="text-xs text-black/50 mt-1">
                  {uz.businessAnalytics.usedSoFar((campaign.spent || 0).toLocaleString())}
                </p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <Zap className="w-6 h-6 text-[#0000FF]" />
                  </div>
                  <span className="text-sm text-black/60">Average</span>
                </div>
                <p className="text-black/60 text-sm mb-1">{uz.businessAnalytics.ctr}</p>
                <p className="text-3xl font-bold text-black">{totals.ctr}</p>
              </div>
            </div>

            {/* Big Analytics Blocks */}
            <div className="grid grid-cols-1 gap-8">
              {/* Daily Clicks Chart */}
              <div className="bg-white border-2 border-black/10 rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-1">{uz.businessAnalytics.dailyClicks}</h2>
                    <p className="text-black/60">{uz.businessAnalytics.dailyClicksSub}</p>
                  </div>
                </div>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyClicksData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#000000" opacity={0.1} />
                      <XAxis
                        dataKey="day"
                        stroke="#000000"
                        style={{ fontSize: '14px' }}
                      />
                      <YAxis
                        stroke="#000000"
                        style={{ fontSize: '14px' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #0000FF',
                          borderRadius: '8px',
                          color: '#000000'
                        }}
                        formatter={(value) => [`${value}`, uz.common.count]}
                      />
                      <Bar
                        dataKey="clicks"
                        fill="#0000FF"
                        name={uz.agentAnalytics.clicks}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Click Per Action Table */}
              <div className="bg-white border-2 border-black/10 rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-1">{uz.businessAnalytics.funnel}</h2>
                    <p className="text-black/60">{uz.businessAnalytics.funnelSub}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-black/10">
                        <th className="text-left py-4 px-4 text-black font-semibold">{uz.businessAnalytics.actionType}</th>
                        <th className="text-right py-4 px-4 text-black font-semibold">{uz.businessAnalytics.totalEvents}</th>
                        <th className="text-right py-4 px-4 text-black font-semibold">{uz.businessAnalytics.conversions}</th>
                        <th className="text-right py-4 px-4 text-black font-semibold">{uz.businessAnalytics.conversionRate}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clicksPerActionData.map((action) => {
                        const conversionRate = action.clicks > 0 ? ((action.conversions / action.clicks) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={action.action} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                            <td className="py-4 px-4 text-black font-medium">{action.action}</td>
                            <td className="py-4 px-4 text-right text-black">{action.clicks.toLocaleString()}</td>
                            <td className="py-4 px-4 text-right text-black">{action.conversions}</td>
                            <td className="py-4 px-4 text-right text-black">{conversionRate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
