import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, MousePointerClick, Users, ArrowUpRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Skeleton } from "../components/ui/skeleton";
import { uz, dateLocale } from '../../lib/uz';

export default function AgentAnalytics() {
  const navigate = useNavigate();
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
        console.error("Failed to load agents", err);
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
        console.error("Failed to load agent dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [selectedAgentId]);

  if (!loading && !agents.length) {
    return (
      <div className="size-full bg-white flex flex-col items-center justify-center min-h-[500px]">
        <h2 className="text-2xl font-bold text-black mb-2">{uz.agentAnalytics.noAgents}</h2>
        <p className="text-black/60 mb-6">{uz.agentAnalytics.noAgentsSub}</p>
        <button 
          onClick={() => navigate('/agent/manage')}
          className="px-6 py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors"
        >
          {uz.agentAnalytics.registerAgent}
        </button>
      </div>
    );
  }

  const { totals, daily_stats = [], agent } = dashboard || { totals: { clicks: 0, impressions: 0, ctr: '0%' }, daily_stats: [], agent: {} };

  const revenueEarned = totals.revenue_earned ?? 0;
  const revenuePerClick = totals.clicks > 0 ? Math.round(revenueEarned / totals.clicks) : 0;

  const revenueData = daily_stats.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString(dateLocale, { weekday: 'short' }),
    revenue: d.clicks * revenuePerClick,
  }));

  const visitorsData = daily_stats.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString(dateLocale, { weekday: 'short' }),
    visitors: d.impressions,
  }));

  return (
    <div className="size-full bg-white overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">
              {agent.username ? uz.agentAnalytics.agentTitle(agent.username) : uz.agentAnalytics.title}
            </h1>
            <p className="text-black/60">{uz.agentAnalytics.subtitle}</p>
          </div>
          <div className="flex gap-3 items-center">
            {agents.length > 1 && (
              <span className="text-sm text-black/40 font-medium">{uz.agentAnalytics.showing(agent.username)}</span>
            )}
            <button className="px-6 py-2 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors">
              {uz.agentAnalytics.download}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <DollarSign className="w-6 h-6 text-[#0000FF]" />
                  </div>
                  <span className="flex items-center text-sm text-[#0000FF] font-medium">
                    +14.5% <ArrowUpRight className="w-4 h-4 ml-1" />
                  </span>
                </div>
                <p className="text-black/60 text-sm mb-1">{uz.agentAnalytics.revenue}</p>
                <p className="text-3xl font-bold text-black">{revenueEarned.toLocaleString()} {uz.common.uzs}</p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <Users className="w-6 h-6 text-[#0000FF]" />
                  </div>
                </div>
                <p className="text-black/60 text-sm mb-1">{uz.agentAnalytics.impressions}</p>
                <p className="text-3xl font-bold text-black">{totals.impressions.toLocaleString()}</p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <MousePointerClick className="w-6 h-6 text-[#0000FF]" />
                  </div>
                </div>
                <p className="text-black/60 text-sm mb-1">{uz.agentAnalytics.clicks}</p>
                <p className="text-3xl font-bold text-black">{totals.clicks.toLocaleString()}</p>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-[#0000FF]/10 rounded-lg">
                    <ArrowUpRight className="w-6 h-6 text-[#0000FF]" />
                  </div>
                </div>
                <p className="text-black/60 text-sm mb-1">{uz.agentAnalytics.ctr}</p>
                <p className="text-3xl font-bold text-black">{totals.ctr}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border-2 border-black/10 rounded-xl p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-black mb-1">{uz.agentAnalytics.revenueChart}</h2>
                  <p className="text-black/60">{uz.agentAnalytics.revenueChartSub}</p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0000FF" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0000FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#000000" opacity={0.1} vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#000000" 
                        style={{ fontSize: '12px' }}
                        tickMargin={10}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#000000" 
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `${value >= 1000 ? value / 1000 + 'k' : value}`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white',
                          border: '2px solid #0000FF',
                          borderRadius: '8px',
                          color: '#000000'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#0000FF" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border-2 border-black/10 rounded-xl p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-black mb-1">{uz.agentAnalytics.impressionsChart}</h2>
                  <p className="text-black/60">{uz.agentAnalytics.impressionsChartSub}</p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visitorsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#000000" opacity={0.1} vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#000000" 
                        style={{ fontSize: '12px' }}
                        tickMargin={10}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#000000" 
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `${value >= 1000 ? value / 1000 + 'k' : value}`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white',
                          border: '2px solid #0000FF',
                          borderRadius: '8px',
                          color: '#000000'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="visitors" 
                        stroke="#0000FF" 
                        strokeWidth={3}
                        dot={{ fill: '#0000FF', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
