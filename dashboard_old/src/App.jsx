import React, { useState, useEffect } from 'react';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
} from 'recharts';
import {
	Layout,
	Plus,
	Send,
	Zap,
	ExternalLink,
	Activity,
	Target,
	TrendingUp,
	Eye,
	MousePointer,
	ShoppingCart,
	Brain,
	Bot,
	Key,
	Copy,
	Check,
} from 'lucide-react';

const API_BASE = 'http://localhost:3006/api';
const AUTH_BASE = 'http://localhost:3006/authorized';

const INTENT_COLORS = { cold: '#6b7280', warm: '#f59e0b', hot: '#10b981' };
const INTENT_LABELS = { cold: "Cold (Qiziqish)", warm: "Warm (Taqqoslash)", hot: "Hot (Sotib olish)" };

function App() {
	const [activeTab, setActiveTab] = useState('overview');
	const [stats, setStats] = useState({ campaigns: [], overview: { totalImpressions: 0, totalClicks: 0, totalConversions: 0, ctr: '0%', conversion_rate: '0%' } });
	const [intentStats, setIntentStats] = useState(null);
	const [agents, setAgents] = useState([]);
	const [selectedAgent, setSelectedAgent] = useState(null);
	const [agentStats, setAgentStats] = useState(null);
	const [prompt, setPrompt] = useState('');
	const [response, setResponse] = useState(null);
	const [loading, setLoading] = useState(false);
	const [showCampaignModal, setShowCampaignModal] = useState(false);
	const [showAgentModal, setShowAgentModal] = useState(false);
	const [selectedCampaign, setSelectedCampaign] = useState(null);
	const [campaignDashboard, setCampaignDashboard] = useState(null);
	const [newCampaign, setNewCampaign] = useState({ name: '', category: 'electronics', brand_url: '', link_text: '', tagline: '', description: '', keywords: '', cpc_rate: 0, cpa_percentage: 0, tone: 'informative', budget: 0 });
	const [newAgent, setNewAgent] = useState({ username: '', owner_email: '' });
	const [createdApiKey, setCreatedApiKey] = useState(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		fetchStats();
		fetchIntentStats();
		fetchAgents();
		const interval = setInterval(() => { fetchStats(); fetchIntentStats(); fetchAgents(); }, 5000);
		return () => clearInterval(interval);
	}, []);

	const fetchStats = async () => {
		try {
			const res = await fetch(`${API_BASE}/analytics`);
			setStats(await res.json());
		} catch (e) { console.error('Failed to fetch stats'); }
	};

	const fetchIntentStats = async () => {
		try {
			const res = await fetch(`${API_BASE}/intent-stats`);
			setIntentStats(await res.json());
		} catch (e) { console.error('Failed to fetch intent stats'); }
	};

	const fetchAgents = async () => {
		try {
			const res = await fetch(`${API_BASE}/agents`);
			setAgents(await res.json());
		} catch (e) { console.error('Failed to fetch agents'); }
	};

	const fetchAgentStats = async (username) => {
		try {
			const res = await fetch(`${API_BASE}/agents/${username}/stats`);
			setAgentStats(await res.json());
		} catch (e) { console.error('Failed to fetch agent stats'); }
	};

	const fetchCampaignDashboard = async (campaignId) => {
		try {
			const res = await fetch(`${API_BASE}/dashboard/${campaignId}`);
			setCampaignDashboard(await res.json());
		} catch (e) { console.error('Failed to fetch campaign dashboard'); }
	};

	const handleTestPrompt = async () => {
		setLoading(true);
		try {
			const res = await fetch(`${API_BASE}/enrich`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
			setResponse(await res.json());
		} catch (e) { setResponse({ text: 'Error generating response' }); }
		setLoading(false);
	};

	const handleTestB2B = async () => {
		setLoading(true);
		const agent = agents[0];
		if (!agent) { alert('No agents registered. Create one first!'); setLoading(false); return; }

		try {
			const res = await fetch(`${AUTH_BASE}/send_result`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt, api_key: createdApiKey || 'sk-synaptic-demo' }),
			});
			const data = await res.json();
			setResponse({
				text: data.match ? `✅ Match!\n\n${data.suggestion}\n\nTracking: ${data.tracking_url}` : '❌ No match found',
				enriched: data.match,
				campaign_name: data.campaign?.name,
				similarity_score: null,
				intent: { type: 'b2b', confidence: 1, signals: [data.match ? 'matched' : 'no_match'] },
				performance: { total_ms: 0, intent_method: 'b2b', match_method: 'vector' },
				usage: { total_tokens: 0 },
			});
		} catch (e) { setResponse({ text: 'B2B API Error' }); }
		setLoading(false);
	};

	const handleCreateCampaign = async (e) => {
		e.preventDefault();
		try {
			const res = await fetch(`${API_BASE}/campaigns`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...newCampaign, keywords: newCampaign.keywords.split(',').map(k => k.trim()).filter(Boolean) }),
			});
			if (res.ok) {
				setShowCampaignModal(false);
				setNewCampaign({ name: '', category: 'electronics', brand_url: '', link_text: '', tagline: '', description: '', keywords: '', cpc_rate: 0, cpa_percentage: 0, tone: 'informative', budget: 0 });
				fetchStats();
			}
		} catch (e) { console.error('Failed to create campaign'); }
	};

	const handleRegisterAgent = async (e) => {
		e.preventDefault();
		try {
			const res = await fetch(`${API_BASE}/agents/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newAgent),
			});
			const data = await res.json();
			if (res.ok) {
				setCreatedApiKey(data.api_key);
				setNewAgent({ username: '', owner_email: '' });
				fetchAgents();
			} else {
				alert(data.error);
			}
		} catch (e) { console.error('Failed to register agent'); }
	};

	const copyToClipboard = (text) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const intentPieData = intentStats?.intent_distribution?.map(d => ({ name: INTENT_LABELS[d._id] || d._id, value: d.count })) || [];
	const categoryData = intentStats?.top_categories?.map(c => ({ name: c._id, matches: c.count })) || [];
	const dailyChartData = campaignDashboard?.daily_stats?.map(d => ({ date: d.date, impressions: d.impressions, clicks: d.clicks, conversions: d.conversions })) || [];
	const agentDailyData = agentStats?.daily_stats?.map(d => ({ date: d.date, impressions: d.impressions, clicks: d.clicks })) || [];

	return (
		<div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
			<header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					<h1 style={{ fontSize: '36px', margin: 0 }}>Synaptic <span className="gradient-text">AI(SI)</span></h1>
					<p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Intent-Based Conversational Commerce Platform</p>
				</div>
				<div style={{ display: 'flex', gap: '10px' }}>
					<button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => setShowAgentModal(true)}>
						<Bot size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Register Agent
					</button>
					<button className="btn btn-primary" onClick={() => setShowCampaignModal(true)}>
						<Plus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> New Campaign
					</button>
				</div>
			</header>

			<div style={{ display: 'flex', gap: '8px', marginBottom: '30px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap' }}>
				{[
					{ id: 'overview', label: 'Overview', icon: Layout },
					{ id: 'agents', label: 'AI Agents', icon: Bot },
					{ id: 'intent', label: 'Intent Analytics', icon: Brain },
					{ id: 'demo', label: 'Live Demo', icon: Zap },
					{ id: 'campaigns', label: 'Campaigns', icon: Target },
				].map(tab => (
					<button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedCampaign(null); setCampaignDashboard(null); setSelectedAgent(null); setAgentStats(null); }}
						style={{ padding: '10px 20px', background: activeTab === tab.id ? 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))' : 'transparent', border: 'none', borderRadius: '8px', color: activeTab === tab.id ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
						<tab.icon size={16} /> {tab.label}
					</button>
				))}
			</div>

			{activeTab === 'overview' && (
				<>
					<div className="stats-grid">
						<div className="glass card stat-card"><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Eye size={24} color="var(--accent-blue)" /><div><h3>Impressions</h3><p className="value">{stats.overview.totalImpressions}</p></div></div></div>
						<div className="glass card stat-card"><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><MousePointer size={24} color="var(--accent-purple)" /><div><h3>Clicks</h3><p className="value" style={{ color: 'var(--accent-purple)' }}>{stats.overview.totalClicks}</p></div></div></div>
						<div className="glass card stat-card"><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><ShoppingCart size={24} color="#10b981" /><div><h3>Conversions</h3><p className="value" style={{ color: '#10b981' }}>{stats.overview.totalConversions}</p></div></div></div>
						<div className="glass card stat-card"><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><TrendingUp size={24} color="gold" /><div><h3>CTR</h3><p className="value" style={{ color: 'gold' }}>{stats.overview.ctr}</p></div></div></div>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
						<div className="glass card">
							<h2 style={{ fontSize: '20px', margin: '0 0 20px' }}>Intent Distribution</h2>
							{intentPieData.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}><PieChart><Pie data={intentPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>{intentPieData.map((_, i) => (<Cell key={i} fill={Object.values(INTENT_COLORS)[i % 3]} />))}</Pie><Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} /></PieChart></ResponsiveContainer>
							) : (<div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No intent data yet</div>)}
						</div>
						<div className="glass card">
							<h2 style={{ fontSize: '20px', margin: '0 0 20px' }}>Top Categories</h2>
							{categoryData.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}><BarChart data={categoryData}><CartesianGrid strokeDasharray="3 3" stroke="#222" /><XAxis dataKey="name" stroke="#666" /><YAxis stroke="#666" /><Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} /><Bar dataKey="matches" fill="var(--accent-blue)" /></BarChart></ResponsiveContainer>
							) : (<div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No category data yet</div>)}
						</div>
					</div>

					<div className="glass card">
						<h2 style={{ fontSize: '20px', margin: '0 0 20px' }}>Campaign Performance</h2>
						<table>
							<thead><tr><th>Campaign</th><th>Category</th><th>Impressions</th><th>Clicks</th><th>Conversions</th><th>CTR</th><th>Budget</th><th>Spent</th><th></th></tr></thead>
							<tbody>
								{stats.campaigns.map((c, i) => (
									<tr key={i}>
										<td style={{ fontWeight: 600 }}>{c.name}</td>
										<td><span className="tag">{c.category}</span></td>
										<td>{c.impressions}</td><td>{c.clicks}</td>
										<td style={{ color: '#10b981' }}>{c.conversions}</td>
										<td>{c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : 0}%</td>
										<td>{c.budget ? `${(c.budget / 1000).toFixed(0)}K` : '-'}</td>
										<td>{c.spent ? `${(c.spent / 1000).toFixed(1)}K` : '0'}</td>
										<td><button onClick={() => { setSelectedCampaign(c); fetchCampaignDashboard(c.id); setActiveTab('campaigns'); }} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}><ExternalLink size={16} /></button></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}

			{activeTab === 'agents' && !selectedAgent && (
				<>
					<div style={{ marginBottom: '30px' }}>
						<h2 style={{ fontSize: '24px', margin: '0 0 8px' }}>AI Agent Partners</h2>
						<p style={{ color: 'var(--text-secondary)' }}>External bots & agents integrating Synaptic recommendations</p>
					</div>

					<div className="stats-grid">
						<div className="glass card stat-card"><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Bot size={24} color="var(--accent-blue)" /><div><h3>Total Agents</h3><p className="value">{agents.length}</p></div></div></div>
						<div className="glass card stat-card"><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Activity size={24} color="#10b981" /><div><h3>Active</h3><p className="value" style={{ color: '#10b981' }}>{agents.filter(a => a.active).length}</p></div></div></div>
						<div className="glass card stat-card"><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><MousePointer size={24} color="var(--accent-purple)" /><div><h3>Total Clicks</h3><p className="value" style={{ color: 'var(--accent-purple)' }}>{agents.reduce((s, a) => s + (a.total_clicks || 0), 0)}</p></div></div></div>
					</div>

					<div className="glass card">
						<table>
							<thead><tr><th>Username</th><th>Email</th><th>Requests</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Last Seen</th><th>Status</th><th></th></tr></thead>
							<tbody>
								{agents.map((a, i) => (
									<tr key={i} style={{ cursor: 'pointer' }} onClick={() => { setSelectedAgent(a); fetchAgentStats(a.username); }}>
										<td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={16} color="var(--accent-blue)" />{a.username}</td>
										<td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{a.owner_email}</td>
										<td>{a.total_requests || 0}</td>
										<td>{a.total_impressions || 0}</td>
										<td style={{ color: 'var(--accent-purple)' }}>{a.total_clicks || 0}</td>
										<td>{a.total_impressions > 0 ? ((a.total_clicks / a.total_impressions) * 100).toFixed(1) : 0}%</td>
										<td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.last_seen ? new Date(a.last_seen).toLocaleString() : 'Never'}</td>
										<td><span className="tag" style={{ border: `1px solid ${a.active ? '#10b981' : '#ef4444'}`, color: a.active ? '#10b981' : '#ef4444' }}>{a.active ? 'Active' : 'Inactive'}</span></td>
										<td><button onClick={(e) => { e.stopPropagation(); setSelectedAgent(a); fetchAgentStats(a.username); }} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '13px' }}>View Stats <ExternalLink size={12} style={{ marginLeft: '4px' }} /></button></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}

			{activeTab === 'agents' && selectedAgent && agentStats && (
				<>
					<button onClick={() => { setSelectedAgent(null); setAgentStats(null); }} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>← Back to Agents</button>

					<div className="glass card" style={{ marginBottom: '30px' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<Bot size={32} color="var(--accent-blue)" />
								<div>
									<h2 style={{ margin: 0 }}>{agentStats.agent.username}</h2>
									<p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>{agentStats.agent.owner_email}</p>
								</div>
							</div>
							<span className="tag" style={{ border: `1px solid ${agentStats.agent.active ? '#10b981' : '#ef4444'}`, color: agentStats.agent.active ? '#10b981' : '#ef4444', fontSize: '14px', padding: '6px 12px' }}>{agentStats.agent.active ? 'Active' : 'Inactive'}</span>
						</div>
					</div>

					<div className="stats-grid">
						<div className="glass card stat-card"><h3>Requests</h3><p className="value">{agentStats.agent.total_requests || 0}</p></div>
						<div className="glass card stat-card"><h3>Impressions</h3><p className="value">{agentStats.totals.impressions}</p></div>
						<div className="glass card stat-card"><h3>Clicks</h3><p className="value" style={{ color: 'var(--accent-purple)' }}>{agentStats.totals.clicks}</p></div>
						<div className="glass card stat-card"><h3>CTR</h3><p className="value" style={{ color: 'gold' }}>{agentStats.totals.ctr}</p></div>
					</div>

					<div className="glass card">
						<h3 style={{ marginBottom: '20px' }}>7-Day Activity</h3>
						{agentDailyData.length > 0 ? (
							<ResponsiveContainer width="100%" height={250}>
								<LineChart data={agentDailyData}><CartesianGrid strokeDasharray="3 3" stroke="#222" /><XAxis dataKey="date" stroke="#666" /><YAxis stroke="#666" /><Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} /><Line type="monotone" dataKey="impressions" stroke="#666" strokeWidth={1} dot={false} /><Line type="monotone" dataKey="clicks" stroke="var(--accent-blue)" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
							</ResponsiveContainer>
						) : (<div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No activity data yet</div>)}
					</div>
				</>
			)}

			{activeTab === 'intent' && (
				<>
					<div style={{ marginBottom: '30px' }}><h2 style={{ fontSize: '24px', margin: '0 0 8px' }}>Intent Analytics Engine</h2><p style={{ color: 'var(--text-secondary)' }}>How users are interacting with Synaptic AI</p></div>
					<div className="stats-grid">
						{['cold', 'warm', 'hot'].map(intent => {
							const data = intentStats?.intent_distribution?.find(d => d._id === intent);
							const count = data?.count || 0;
							return (
								<div key={intent} className="glass card stat-card" style={{ borderLeft: `4px solid ${INTENT_COLORS[intent]}` }}>
									<h3 style={{ color: INTENT_COLORS[intent] }}>{INTENT_LABELS[intent]}</h3>
									<p className="value">{count}</p>
								</div>
							);
						})}
					</div>
				</>
			)}

			{activeTab === 'demo' && (
				<div className="demo-container">
					<div style={{ marginBottom: '20px' }}><h2 style={{ fontSize: '24px', margin: '0 0 8px' }}>Live API Demo</h2><p style={{ color: 'var(--text-secondary)' }}>Test both `/api/enrich` (full LLM) and `/authorized/send_result` (B2B fast)</p></div>

					<div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
						<button onClick={() => setPrompt("iPhone 15 narxi Toshkentda muddatli tolov sotib olmoqchiman")} style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: '6px', color: '#10b981', cursor: 'pointer', fontSize: '12px' }}>Hot Intent</button>
						<button onClick={() => setPrompt("Noutbuklar haqida malumot ber")} style={{ padding: '6px 14px', background: 'rgba(107,114,128,0.1)', border: '1px solid #6b7280', borderRadius: '6px', color: '#6b7280', cursor: 'pointer', fontSize: '12px' }}>Cold Intent</button>
						<button onClick={() => setPrompt("iPhone va Samsung qaysi biri yaxshi")} style={{ padding: '6px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', borderRadius: '6px', color: '#f59e0b', cursor: 'pointer', fontSize: '12px' }}>Warm Intent</button>
					</div>

					<div className="glass card">
						<textarea placeholder="Enter a prompt..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
						<div style={{ display: 'flex', gap: '10px' }}>
							<button className="btn btn-primary" onClick={handleTestPrompt} disabled={loading}>{loading ? 'Processing...' : <><Send size={16} style={{ marginRight: '8px' }} /> /api/enrich (LLM)</>}</button>
							<button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={handleTestB2B} disabled={loading}>{loading ? 'Processing...' : <><Bot size={16} style={{ marginRight: '8px' }} /> /authorized/send_result (B2B)</>}</button>
						</div>

						{response && (
							<div style={{ marginTop: '25px' }}>
								<div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
									{response.intent && (<span className="tag" style={{ border: `1px solid ${INTENT_COLORS[response.intent.type] || '#666'}`, color: INTENT_COLORS[response.intent.type] || '#666' }}>{response.intent.type} ({(response.intent.confidence * 100).toFixed(0)}%)</span>)}
									{response.campaign_name && (<span className="tag" style={{ border: '1px solid var(--accent-purple)' }}>{response.campaign_name}</span>)}
									{response.enriched && (<span className="tag" style={{ border: '1px solid #10b981', color: '#10b981' }}>MATCHED</span>)}
								</div>
								<div className="response-box">{response.text}</div>
								{response.performance && (<div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>Time: {response.performance.total_ms}ms | Method: {response.performance.intent_method}</div>)}
							</div>
						)}
					</div>
				</div>
			)}

			{activeTab === 'campaigns' && selectedCampaign && campaignDashboard && (
				<>
					<button onClick={() => { setActiveTab('overview'); setSelectedCampaign(null); setCampaignDashboard(null); }} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
					<div className="glass card" style={{ marginBottom: '25px' }}><h2 style={{ margin: '0 0 4px' }}>{campaignDashboard.campaign.name}</h2><p style={{ color: 'var(--text-secondary)', margin: 0 }}>{campaignDashboard.campaign.category} • {campaignDashboard.campaign.source} • Code: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{campaignDashboard.campaign.tracking_code}</code></p></div>
					<div className="stats-grid">
						<div className="glass card stat-card"><h3>Impressions</h3><p className="value">{campaignDashboard.totals.impressions}</p></div>
						<div className="glass card stat-card"><h3>Clicks</h3><p className="value" style={{ color: 'var(--accent-purple)' }}>{campaignDashboard.totals.clicks}</p></div>
						<div className="glass card stat-card"><h3>CTR</h3><p className="value" style={{ color: 'gold' }}>{campaignDashboard.totals.ctr}</p></div>
						<div className="glass card stat-card"><h3>Budget</h3><p className="value">{(campaignDashboard.campaign.budget / 1000).toFixed(0)}K</p></div>
					</div>
					<div className="glass card">
						<h3 style={{ marginBottom: '15px' }}>7-Day Performance</h3>
						<ResponsiveContainer width="100%" height={250}><LineChart data={dailyChartData}><CartesianGrid strokeDasharray="3 3" stroke="#222" /><XAxis dataKey="date" stroke="#666" /><YAxis stroke="#666" /><Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} /><Line type="monotone" dataKey="impressions" stroke="#666" strokeWidth={1} dot={false} /><Line type="monotone" dataKey="clicks" stroke="var(--accent-blue)" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
					</div>
				</>
			)}

			{activeTab === 'campaigns' && !selectedCampaign && (
				<div className="glass card">
					<h2 style={{ fontSize: '20px', margin: '0 0 20px' }}>All Campaigns</h2>
					<table>
						<thead><tr><th>Name</th><th>Category</th><th>Tagline</th><th>CPC</th><th>CPA %</th><th>Budget</th><th></th></tr></thead>
						<tbody>
							{stats.campaigns.map((c, i) => (
								<tr key={i} style={{ cursor: 'pointer' }} onClick={() => { setSelectedCampaign(c); fetchCampaignDashboard(c.id); }}>
									<td style={{ fontWeight: 600 }}>{c.name}</td>
									<td><span className="tag">{c.category}</span></td>
									<td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.tagline || '-'}</td>
									<td>{c.cpc_rate} UZS</td><td>{c.cpa_percentage}%</td>
									<td>{c.budget ? `${(c.budget / 1000).toFixed(0)}K` : '-'}</td>
									<td><button onClick={(e) => { e.stopPropagation(); setSelectedCampaign(c); fetchCampaignDashboard(c.id); }} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '13px' }}>Dashboard <ExternalLink size={12} style={{ marginLeft: '4px' }} /></button></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{showCampaignModal && (
				<div className="modal-overlay">
					<div className="glass card modal-content">
						<h2 style={{ marginBottom: '20px' }}>Create New Campaign</h2>
						<form onSubmit={handleCreateCampaign}>
							<div className="form-group"><label>Name</label><input type="text" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} required /></div>
							<div className="form-group"><label>Category</label><select value={newCampaign.category} onChange={(e) => setNewCampaign({ ...newCampaign, category: e.target.value })}><option value="electronics">Electronics</option><option value="coffee">Coffee</option><option value="coding">Coding</option><option value="travel">Travel</option><option value="fashion">Fashion</option><option value="finance">Finance</option><option value="food">Food</option></select></div>
							<div className="form-group"><label>Brand URL</label><input type="url" value={newCampaign.brand_url} onChange={(e) => setNewCampaign({ ...newCampaign, brand_url: e.target.value })} required /></div>
							<div className="form-group"><label>Link Label</label><input type="text" value={newCampaign.link_text} onChange={(e) => setNewCampaign({ ...newCampaign, link_text: e.target.value })} required /></div>
							<div className="form-group"><label>Tagline (for B2B suggestions)</label><input type="text" value={newCampaign.tagline} onChange={(e) => setNewCampaign({ ...newCampaign, tagline: e.target.value })} placeholder="e.g. Best electronics store with installment plans" /></div>
							<div className="form-group"><label>Keywords (comma-separated)</label><input type="text" value={newCampaign.keywords} onChange={(e) => setNewCampaign({ ...newCampaign, keywords: e.target.value })} /></div>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
								<div className="form-group"><label>CPC (UZS)</label><input type="number" value={newCampaign.cpc_rate} onChange={(e) => setNewCampaign({ ...newCampaign, cpc_rate: parseInt(e.target.value) || 0 })} /></div>
								<div className="form-group"><label>CPA %</label><input type="number" value={newCampaign.cpa_percentage} onChange={(e) => setNewCampaign({ ...newCampaign, cpa_percentage: parseFloat(e.target.value) || 0 })} step="0.5" /></div>
								<div className="form-group"><label>Budget (UZS)</label><input type="number" value={newCampaign.budget} onChange={(e) => setNewCampaign({ ...newCampaign, budget: parseInt(e.target.value) || 0 })} /></div>
							</div>
							<div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
								<button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create</button>
								<button type="button" className="btn" onClick={() => setShowCampaignModal(false)} style={{ background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{showAgentModal && (
				<div className="modal-overlay">
					<div className="glass card modal-content">
						<h2 style={{ marginBottom: '8px' }}>Register AI Agent</h2>
						<p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>Get an API key for your bot to integrate Synaptic recommendations</p>

						{createdApiKey ? (
							<div>
								<div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
									<p style={{ margin: '0 0 8px', fontSize: '14px', color: '#10b981', fontWeight: 600 }}>✅ Agent Registered!</p>
									<p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>Store this key — it will not be shown again:</p>
									<div style={{ display: 'flex', gap: '8px' }}>
										<code style={{ flex: 1, background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', fontSize: '14px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{createdApiKey}</code>
										<button onClick={() => copyToClipboard(createdApiKey)} style={{ padding: '10px 14px', background: 'var(--accent-blue)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
											{copied ? <Check size={16} /> : <Copy size={16} />}
										</button>
									</div>
								</div>
								<div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
									<p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600 }}>Integration Example:</p>
									<code style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', whiteSpace: 'pre-wrap' }}>
{`POST /authorized/send_result
{
  "prompt": "user message",
  "api_key": "${createdApiKey}"
}

// Response:
{ "match": true, "suggestion": "...", "tracking_url": "..." }
{ "match": false }`}
									</code>
								</div>
								<button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setShowAgentModal(false); setCreatedApiKey(null); }}>Done</button>
							</div>
						) : (
							<form onSubmit={handleRegisterAgent}>
								<div className="form-group"><label>Username (bot ID)</label><input type="text" value={newAgent.username} onChange={(e) => setNewAgent({ ...newAgent, username: e.target.value })} placeholder="my-telegram-bot" required /></div>
								<div className="form-group"><label>Owner Email</label><input type="email" value={newAgent.owner_email} onChange={(e) => setNewAgent({ ...newAgent, owner_email: e.target.value })} placeholder="dev@example.com" required /></div>
								<div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
									<button type="submit" className="btn btn-primary" style={{ flex: 1 }}><Key size={16} style={{ marginRight: '8px' }} /> Generate API Key</button>
									<button type="button" className="btn" onClick={() => setShowAgentModal(false)} style={{ background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
								</div>
							</form>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export default App;
