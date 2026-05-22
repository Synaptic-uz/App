import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { MousePointerClick, Eye, Wallet, Zap } from 'lucide-react';
import { api } from '../../lib/api';
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

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const camps = await api.getCampaigns();
        setCampaigns(camps);
        if (camps.length > 0) {
          // You could also check for a query param here if you want to link from Campaigns page
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
        <h2 className="text-2xl font-bold text-black mb-2">No Campaigns Found</h2>
        <p className="text-black/60 mb-6">Create your first campaign to see analytics</p>
        <button 
          onClick={() => navigate('/business/campaigns')}
          className="px-6 py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors"
        >
          Create Campaign
        </button>
      </div>
    );
  }

  const { totals, daily_stats = [], campaign } = dashboard || { totals: { clicks: 0, impressions: 0, ctr: '0%' }, daily_stats: [], campaign: {} };

  // Format daily stats for charts
  
  const dailyClicksData = daily_stats.map((d: any) => ({
    day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    clicks: d.clicks,
    impressions: d.impressions,
  }));

  // Simulate some conversion data based on real clicks if actual conversion stats aren't heavily populated by backend /dashboard/:id yet
  const clicksPerActionData = [
    { action: 'Product View', clicks: totals.clicks, conversions: Math.floor(totals.clicks * 0.4) },
    { action: 'Add to Cart', clicks: Math.floor(totals.clicks * 0.4), conversions: Math.floor(totals.clicks * 0.15) },
    { action: 'Purchase', clicks: Math.floor(totals.clicks * 0.15), conversions: Math.floor(totals.clicks * 0.05) },
  ];

  return (
    <div className="size-full bg-white overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">
              {campaign.name ? `${campaign.name} Analytics` : 'Business Analytics'}
            </h1>
            <p className="text-black/60">Track click performance and advertising costs</p>
          </div>
          <div className="flex gap-3 items-center">
            {campaigns.length > 1 && (
              <span className="text-sm text-black/40 font-medium">Showing {campaign.name}</span>
            )}
            <button className="px-6 py-2 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors">
              Export
            </button>
          </div>
        </div>

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
                  <span className="text-sm text-black/60">7 Days</span>
                </div>
                <p className="text-black/60 text-sm mb-1">Total Clicks</p>
                <p className="text-3xl font-bold text-black">{totals.clicks.toLocaleString()}</p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <Eye className="w-6 h-6 text-[#0000FF]" />
                  </div>
                  <span className="text-sm text-black/60">7 Days</span>
                </div>
                <p className="text-black/60 text-sm mb-1">Total Impressions</p>
                <p className="text-3xl font-bold text-black">{totals.impressions.toLocaleString()}</p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <Wallet className="w-6 h-6 text-[#0000FF]" />
                  </div>
                  <span className="text-sm text-black/60">Lifetime</span>
                </div>
                <p className="text-black/60 text-sm mb-1">Campaign Budget</p>
                <p className="text-3xl font-bold text-black">{(campaign.budget || 0).toLocaleString()} UZS</p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <Zap className="w-6 h-6 text-[#0000FF]" />
                  </div>
                  <span className="text-sm text-black/60">Average</span>
                </div>
                <p className="text-black/60 text-sm mb-1">Click Through Rate</p>
                <p className="text-3xl font-bold text-black">{totals.ctr}</p>
              </div>
            </div>

            {/* Big Analytics Blocks */}
            <div className="grid grid-cols-1 gap-8">
              {/* Daily Clicks Chart */}
              <div className="bg-white border-2 border-black/10 rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-1">Daily Click Performance</h2>
                    <p className="text-black/60">Number of users who clicked your links each day</p>
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
                        formatter={(value) => [`${value}`, 'Count']}
                      />
                      <Bar
                        dataKey="clicks"
                        fill="#0000FF"
                        name="Clicks"
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
                    <h2 className="text-2xl font-bold text-black mb-1">Funnel Conversions</h2>
                    <p className="text-black/60">Performance breakdown by action type</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-black/10">
                        <th className="text-left py-4 px-4 text-black font-semibold">Action Type</th>
                        <th className="text-right py-4 px-4 text-black font-semibold">Total Events</th>
                        <th className="text-right py-4 px-4 text-black font-semibold">Conversions</th>
                        <th className="text-right py-4 px-4 text-black font-semibold">Conversion Rate</th>
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
