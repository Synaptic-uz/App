import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
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
          setSelectedCampaignId(camps[0]._id || camps[0].id);
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
        <h2 className="text-2xl font-bold text-black mb-2">Kampaniyalar topilmadi</h2>
        <p className="text-black/60 mb-6">Analitikani ko‘rish uchun birinchi kampaniyangizni yarating</p>
        <button 
          onClick={() => navigate('/business/campaigns')}
          className="px-6 py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors"
        >
          Kampaniya yaratish
        </button>
      </div>
    );
  }

  const { totals, daily_stats = [], campaign } = dashboard || { totals: { clicks: 0, impressions: 0, ctr: '0%' }, daily_stats: [], campaign: {} };

  // Format daily stats for charts
  
  const dailyClicksData = daily_stats.map((d: any) => ({
    day: new Date(d.date).toLocaleDateString('uz-UZ', { weekday: 'short' }),
    clicks: d.clicks,
    impressions: d.impressions,
  }));

  const funnelData = [
    { stage: 'Ko‘rinishlar', count: totals.impressions ?? 0, rate: '—' },
    { stage: 'Bosishlar', count: totals.clicks ?? 0, rate: totals.ctr ?? '0%' },
    { stage: 'Konversiyalar', count: totals.conversions ?? 0, rate: totals.conversion_rate ?? '0%' },
  ];

  return (
    <div className="size-full bg-white overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">
              {campaign.name ? `${campaign.name} — analitika` : 'Biznes analitika'}
            </h1>
            <p className="text-black/60">Bosishlar samaradorligi va reklama xarajatlarini kuzating</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {campaigns.length > 0 && (
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="w-[min(100%,280px)] bg-white border-black/20">
                  <SelectValue placeholder="Kampaniyani tanlang" />
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
            )}
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
                  <span className="text-sm text-black/60">7 kun</span>
                </div>
                <p className="text-black/60 text-sm mb-1">Jami bosishlar</p>
                <p className="text-3xl font-bold text-black">{totals.clicks.toLocaleString('uz-UZ')}</p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <Eye className="w-6 h-6 text-[#0000FF]" />
                  </div>
                  <span className="text-sm text-black/60">7 kun</span>
                </div>
                <p className="text-black/60 text-sm mb-1">Jami ko‘rinishlar</p>
                <p className="text-3xl font-bold text-black">{totals.impressions.toLocaleString('uz-UZ')}</p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <Wallet className="w-6 h-6 text-[#0000FF]" />
                  </div>
                  <span className="text-sm text-black/60">Umumiy</span>
                </div>
                <p className="text-black/60 text-sm mb-1">Kampaniya byudjeti</p>
                <p className="text-3xl font-bold text-black">{(campaign.budget || 0).toLocaleString('uz-UZ')} so‘m</p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <Zap className="w-6 h-6 text-[#0000FF]" />
                  </div>
                  <span className="text-sm text-black/60">O‘rtacha</span>
                </div>
                <p className="text-black/60 text-sm mb-1">Bosishlar foizi (CTR)</p>
                <p className="text-3xl font-bold text-black">{totals.ctr}</p>
              </div>
            </div>

            {/* Big Analytics Blocks */}
            <div className="grid grid-cols-1 gap-8">
              {/* Daily Clicks Chart */}
              <div className="bg-white border-2 border-black/10 rounded-xl p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-1">Kunlik bosishlar</h2>
                    <p className="text-black/60">Har kuni havolalaringizni bosgan foydalanuvchilar soni</p>
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
                        formatter={(value) => [`${value}`, 'Soni']}
                      />
                      <Bar
                        dataKey="clicks"
                        fill="#0000FF"
                        name="Bosishlar"
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
                    <h2 className="text-2xl font-bold text-black mb-1">Konversiya voronkasi</h2>
                    <p className="text-black/60">Ko‘rinish → bosish → konversiya (jonli ma’lumotlar)</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-black/10">
                        <th className="text-left py-4 px-4 text-black font-semibold">Bosqich</th>
                        <th className="text-right py-4 px-4 text-black font-semibold">Soni</th>
                        <th className="text-right py-4 px-4 text-black font-semibold">Foiz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnelData.map((row) => (
                          <tr key={row.stage} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                            <td className="py-4 px-4 text-black font-medium">{row.stage}</td>
                            <td className="py-4 px-4 text-right text-black">{row.count.toLocaleString('uz-UZ')}</td>
                            <td className="py-4 px-4 text-right text-black">{row.rate}</td>
                          </tr>
                        ))}
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
