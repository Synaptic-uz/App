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
	PieChart as PieChartIcon,
	Target,
	TrendingUp,
	DollarSign,
	Users,
	Eye,
	MousePointer,
	ShoppingCart,
	Brain,
} from 'lucide-react';

const API_BASE = 'http://localhost:3006/api';

const INTENT_COLORS = {
	cold: '#6b7280',
	warm: '#f59e0b',
	hot: '#10b981',
};

const INTENT_LABELS = {
	cold: "Cold (Qiziqish)",
	warm: "Warm (Taqqoslash)",
	hot: "Hot (Sotib olish)",
};

function App() {
	const [activeTab, setActiveTab] = useState('overview');
	const [stats, setStats] = useState({
		campaigns: [],
		overview: { totalImpressions: 0, totalClicks: 0, totalConversions: 0, ctr: '0%', conversion_rate: '0%' },
		intent_breakdown: [],
	});
	const [intentStats, setIntentStats] = useState(null);
	const [prompt, setPrompt] = useState('');
	const [response, setResponse] = useState(null);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [selectedCampaign, setSelectedCampaign] = useState(null);
	const [campaignDashboard, setCampaignDashboard] = useState(null);
	const [newCampaign, setNewCampaign] = useState({
		name: '',
		category: 'electronics',
		brand_url: '',
		link_text: '',
		description: '',
		keywords: '',
		cpc_rate: 0,
		cpa_percentage: 0,
		tone: 'informative',
		budget: 0,
	});

	useEffect(() => {
		fetchStats();
		fetchIntentStats();
		const interval = setInterval(() => {
			fetchStats();
			fetchIntentStats();
		}, 5000);
		return () => clearInterval(interval);
	}, []);

	const fetchStats = async () => {
		try {
			const res = await fetch(`${API_BASE}/analytics`);
			const data = await res.json();
			setStats(data);
		} catch (e) {
			console.error('Failed to fetch stats');
		}
	};

	const fetchIntentStats = async () => {
		try {
			const res = await fetch(`${API_BASE}/intent-stats`);
			const data = await res.json();
			setIntentStats(data);
		} catch (e) {
			console.error('Failed to fetch intent stats');
		}
	};

	const fetchCampaignDashboard = async (campaignId) => {
		try {
			const res = await fetch(`${API_BASE}/dashboard/${campaignId}`);
			const data = await res.json();
			setCampaignDashboard(data);
		} catch (e) {
			console.error('Failed to fetch campaign dashboard');
		}
	};

	const handleTestPrompt = async () => {
		setLoading(true);
		try {
			const res = await fetch(`${API_BASE}/enrich`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt }),
			});
			const data = await res.json();
			setResponse(data);
		} catch (e) {
			setResponse({ text: 'Error generating response' });
		}
		setLoading(false);
	};

	const handleCreateCampaign = async (e) => {
		e.preventDefault();
		try {
			const res = await fetch(`${API_BASE}/campaigns`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...newCampaign,
					keywords: newCampaign.keywords.split(',').map(k => k.trim()).filter(Boolean),
				}),
			});
			if (res.ok) {
				setShowModal(false);
				setNewCampaign({
					name: '', category: 'electronics', brand_url: '', link_text: '',
					description: '', keywords: '', cpc_rate: 0, cpa_percentage: 0,
					tone: 'informative', budget: 0,
				});
				fetchStats();
			}
		} catch (e) {
			console.error('Failed to create campaign');
		}
	};

	const intentPieData = intentStats?.intent_distribution?.map(d => ({
		name: INTENT_LABELS[d._id] || d._id,
		value: d.count,
		enriched: d.enriched_count,
	})) || [];

	const categoryData = intentStats?.top_categories?.map(c => ({
		name: c._id,
		matches: c.count,
		avgScore: (c.avg_score * 100).toFixed(1),
	})) || [];

	const dailyChartData = campaignDashboard?.daily_stats?.map(d => ({
		date: d.date,
		impressions: d.impressions,
		clicks: d.clicks,
		conversions: d.conversions,
	})) || [];

	return (
		<div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
			<header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					<h1 style={{ fontSize: '36px', margin: 0 }}>
						Synaptic <span className="gradient-text">AI(SI)</span>
					</h1>
					<p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
						Intent-Based Conversational Commerce Platform
					</p>
				</div>
				<button className="btn btn-primary" onClick={() => setShowModal(true)}>
					<Plus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> New Campaign
				</button>
			</header>

			<div style={{ display: 'flex', gap: '8px', marginBottom: '30px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
				{[
					{ id: 'overview', label: 'Overview', icon: Layout },
					{ id: 'intent', label: 'Intent Analytics', icon: Brain },
					{ id: 'demo', label: 'Live Demo', icon: Zap },
					{ id: 'campaigns', label: 'Campaigns', icon: Target },
				].map(tab => (
					<button
						key={tab.id}
						onClick={() => { setActiveTab(tab.id); setSelectedCampaign(null); setCampaignDashboard(null); }}
						style={{
							padding: '10px 20px',
							background: activeTab === tab.id ? 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))' : 'transparent',
							border: 'none',
							borderRadius: '8px',
							color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
							cursor: 'pointer',
							fontWeight: 600,
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							transition: 'all 0.2s',
						}}
					>
						<tab.icon size={16} /> {tab.label}
					</button>
				))}
			</div>

			{activeTab === 'overview' && (
				<>
					<div className="stats-grid">
						<div className="glass card stat-card">
							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<Eye size={24} color="var(--accent-blue)" />
								<div>
									<h3>Impressions</h3>
									<p className="value">{stats.overview.totalImpressions}</p>
								</div>
							</div>
						</div>
						<div className="glass card stat-card">
							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<MousePointer size={24} color="var(--accent-purple)" />
								<div>
									<h3>Clicks</h3>
									<p className="value" style={{ color: 'var(--accent-purple)' }}>{stats.overview.totalClicks}</p>
								</div>
							</div>
						</div>
						<div className="glass card stat-card">
							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<ShoppingCart size={24} color="var(--accent-green, #10b981)" />
								<div>
									<h3>Conversions</h3>
									<p className="value" style={{ color: '#10b981' }}>{stats.overview.totalConversions}</p>
								</div>
							</div>
						</div>
						<div className="glass card stat-card">
							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<TrendingUp size={24} color="gold" />
								<div>
									<h3>CTR</h3>
									<p className="value" style={{ color: 'gold' }}>{stats.overview.ctr}</p>
								</div>
							</div>
						</div>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
						<div className="glass card">
							<h2 style={{ fontSize: '20px', margin: '0 0 20px' }}>Intent Distribution</h2>
							{intentPieData.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}>
									<PieChart>
										<Pie
											data={intentPieData}
											cx="50%"
											cy="50%"
											outerRadius={80}
											dataKey="value"
											label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
										>
											{intentPieData.map((entry, i) => (
												<Cell key={i} fill={Object.values(INTENT_COLORS)[i % 3]} />
											))}
										</Pie>
										<Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
									</PieChart>
								</ResponsiveContainer>
							) : (
								<div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
									No intent data yet. Try the Live Demo!
								</div>
							)}
						</div>

						<div className="glass card">
							<h2 style={{ fontSize: '20px', margin: '0 0 20px' }}>Top Categories</h2>
							{categoryData.length > 0 ? (
								<ResponsiveContainer width="100%" height={250}>
									<BarChart data={categoryData}>
										<CartesianGrid strokeDasharray="3 3" stroke="#222" />
										<XAxis dataKey="name" stroke="#666" />
										<YAxis stroke="#666" />
										<Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
										<Bar dataKey="matches" fill="var(--accent-blue)" />
									</BarChart>
								</ResponsiveContainer>
							) : (
								<div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
									No category data yet
								</div>
							)}
						</div>
					</div>

					<div className="glass card">
						<h2 style={{ fontSize: '20px', margin: '0 0 20px' }}>Campaign Performance</h2>
						<table>
							<thead>
								<tr>
									<th>Campaign</th>
									<th>Category</th>
									<th>Impressions</th>
									<th>Clicks</th>
									<th>Conversions</th>
									<th>CTR</th>
									<th>CVR</th>
									<th>Budget</th>
									<th>Spent</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{stats.campaigns.map((c, i) => (
									<tr key={i}>
										<td style={{ fontWeight: 600 }}>{c.name}</td>
										<td><span className="tag">{c.category}</span></td>
										<td>{c.impressions}</td>
										<td>{c.clicks}</td>
										<td style={{ color: '#10b981' }}>{c.conversions}</td>
										<td>{c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : 0}%</td>
										<td>{c.clicks > 0 ? ((c.conversions / c.clicks) * 100).toFixed(1) : 0}%</td>
										<td>{c.budget ? `${(c.budget / 1000).toFixed(0)}K` : '-'}</td>
										<td>{c.spent ? `${(c.spent / 1000).toFixed(1)}K` : '0'}</td>
										<td>
											<button
												onClick={() => { setSelectedCampaign(c); fetchCampaignDashboard(c.id); setActiveTab('campaigns'); }}
												style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}
											>
												<ExternalLink size={16} />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}

			{activeTab === 'intent' && (
				<>
					<div style={{ marginBottom: '30px' }}>
						<h2 style={{ fontSize: '24px', margin: '0 0 8px' }}>Intent Analytics Engine</h2>
						<p style={{ color: 'var(--text-secondary)' }}>How users are interacting with Synaptic AI</p>
					</div>

					<div className="stats-grid">
						{stats.intent_breakdown?.map(d => (
							<div key={d._id} className="glass card stat-card" style={{ borderLeft: `4px solid ${INTENT_COLORS[d._id] || '#666'}` }}>
								<h3 style={{ color: INTENT_COLORS[d._id] || '#666' }}>{INTENT_LABELS[d._id] || d._id}</h3>
								<p className="value">{d.count}</p>
								<p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
									{d.conversions} conversions
								</p>
							</div>
						))}
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
						<div className="glass card">
							<h3 style={{ marginBottom: '20px' }}>Intent by Hour</h3>
							{intentStats?.hourly_pattern?.length > 0 ? (
								<ResponsiveContainer width="100%" height={300}>
									<BarChart data={intentStats.hourly_pattern.map(h => ({
										hour: `${h._id.hour}:00`,
										intent: h._id.intent,
										count: h.count,
									}))}>
										<CartesianGrid strokeDasharray="3 3" stroke="#222" />
										<XAxis dataKey="hour" stroke="#666" />
										<YAxis stroke="#666" />
										<Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
										<Bar dataKey="count" fill="var(--accent-blue)" />
									</BarChart>
								</ResponsiveContainer>
							) : (
								<div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
									No hourly data yet
								</div>
							)}
						</div>

						<div className="glass card">
							<h3 style={{ marginBottom: '20px' }}>Intent Funnel</h3>
							<div style={{ padding: '20px 0' }}>
								{['cold', 'warm', 'hot'].map((intent, i) => {
									const data = stats.intent_breakdown?.find(d => d._id === intent);
									const count = data?.count || 0;
									const total = stats.intent_breakdown?.reduce((s, d) => s + d.count, 0) || 1;
									const percentage = ((count / total) * 100).toFixed(1);
									return (
										<div key={intent} style={{ marginBottom: '20px' }}>
											<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
												<span style={{ color: INTENT_COLORS[intent], fontWeight: 600 }}>
													{INTENT_LABELS[intent]}
												</span>
												<span style={{ color: 'var(--text-secondary)' }}>{count} ({percentage}%)</span>
											</div>
											<div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
												<div style={{
													height: '100%',
													width: `${percentage}%`,
													background: INTENT_COLORS[intent],
													borderRadius: '4px',
													transition: 'width 0.5s ease',
												}} />
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</>
			)}

			{activeTab === 'demo' && (
				<div className="demo-container">
					<div style={{ marginBottom: '20px' }}>
						<h2 style={{ fontSize: '24px', margin: '0 0 8px' }}>Live API Demo</h2>
						<p style={{ color: 'var(--text-secondary)' }}>Test intent classification and contextual enrichment</p>
					</div>

					<div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
						{[
							{ label: "Cold: Noutbuklar haqida ma'lumot ber", prompt: "Noutbuklar haqida ma'lumot ber, qanday turlari bor?" },
							{ label: "Warm: iPhone 15 vs 14 qaysi biri yaxshi?", prompt: "iPhone 15 va iPhone 14 Pro orasida qaysi biri yaxshi? Narxi qancha?" },
							{ label: "Hot: Toshkentda eng arzon iPhone 15 Pro Max", prompt: "Toshkentda hozir qayerda eng arzon iPhone 15 Pro Max bor, muddatli to'lovga bo'lsa ham mayli" },
						].map((example, i) => (
							<button
								key={i}
								onClick={() => setPrompt(example.prompt)}
								style={{
									padding: '8px 16px',
									background: 'rgba(255,255,255,0.05)',
									border: '1px solid var(--border-color)',
									borderRadius: '8px',
									color: 'var(--text-secondary)',
									cursor: 'pointer',
									fontSize: '13px',
									whiteSpace: 'nowrap',
								}}
							>
								{example.label}
							</button>
						))}
					</div>

					<div className="glass card">
						<textarea
							placeholder="Enter a prompt in Uzbek, Russian, or English..."
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							rows={3}
						/>
						<button className="btn btn-primary" onClick={handleTestPrompt} disabled={loading}>
							{loading ? 'Analyzing Intent...' : (
								<>
									<Send size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Enrich Response
								</>
							)}
						</button>

						{response && (
							<div style={{ marginTop: '30px' }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
										<Zap size={16} color={response.intent?.type === 'hot' ? '#10b981' : response.intent?.type === 'warm' ? '#f59e0b' : '#6b7280'} />
										<span style={{ fontWeight: 600, fontSize: '14px' }}>
											AI Response {response.enriched && <span style={{ color: '#10b981' }}>• AD ENRICHED</span>}
										</span>
									</div>
									<div style={{ display: 'flex', gap: '8px' }}>
										{response.intent && (
											<span className="tag" style={{
												border: `1px solid ${INTENT_COLORS[response.intent.type]}`,
												color: INTENT_COLORS[response.intent.type],
											}}>
												Intent: {INTENT_LABELS[response.intent.type]} ({(response.intent.confidence * 100).toFixed(0)}%)
											</span>
										)}
										{response.campaign_name && (
											<span className="tag" style={{ border: '1px solid var(--accent-purple)' }}>
												Match: {response.campaign_name}
											</span>
										)}
										{response.similarity_score && (
											<span className="tag">Score: {response.similarity_score}</span>
										)}
									</div>
								</div>

								{response.intent?.signals && response.intent.signals.length > 0 && (
									<div style={{ marginBottom: '15px', fontSize: '12px', color: 'var(--text-secondary)' }}>
										<strong>Detected signals:</strong> {response.intent.signals.join(', ')}
									</div>
								)}

								<div className="response-box">{response.text}</div>

								{response.usage && (
									<div style={{ marginTop: '15px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
										<span>Total Tokens: {response.usage.total_tokens}</span>
										<span>Intent: {response.usage.intent_classification?.total_tokens || 0}</span>
										<span>Generation: {response.usage.generation?.total_tokens || 0}</span>
										<span>Session: {response.session_id}</span>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{activeTab === 'campaigns' && selectedCampaign && campaignDashboard && (
				<div>
					<button
						onClick={() => { setActiveTab('overview'); setSelectedCampaign(null); setCampaignDashboard(null); }}
						style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
					>
						← Back to Overview
					</button>

					<div className="glass card" style={{ marginBottom: '30px' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
							<div>
								<h2 style={{ margin: '0 0 8px' }}>{campaignDashboard.campaign.name}</h2>
								<p style={{ color: 'var(--text-secondary)', margin: 0 }}>
									{campaignDashboard.campaign.category} • Source: {campaignDashboard.campaign.source}
								</p>
							</div>
							<div style={{ textAlign: 'right' }}>
								<p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Tracking Code</p>
								<code style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
									{campaignDashboard.campaign.tracking_code}
								</code>
							</div>
						</div>
					</div>

					<div className="stats-grid">
						<div className="glass card stat-card">
							<h3>Impressions</h3>
							<p className="value">{campaignDashboard.totals.impressions}</p>
						</div>
						<div className="glass card stat-card">
							<h3>Clicks</h3>
							<p className="value" style={{ color: 'var(--accent-purple)' }}>{campaignDashboard.totals.clicks}</p>
						</div>
						<div className="glass card stat-card">
							<h3>CTR</h3>
							<p className="value" style={{ color: 'gold' }}>{campaignDashboard.totals.ctr}</p>
						</div>
						<div className="glass card stat-card">
							<h3>Conversion Rate</h3>
							<p className="value" style={{ color: '#10b981' }}>{campaignDashboard.totals.conversion_rate}</p>
						</div>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
						<div className="glass card">
							<h3 style={{ marginBottom: '20px' }}>7-Day Performance</h3>
							<ResponsiveContainer width="100%" height={250}>
								<LineChart data={dailyChartData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#222" />
									<XAxis dataKey="date" stroke="#666" />
									<YAxis stroke="#666" />
									<Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
									<Line type="monotone" dataKey="impressions" stroke="#666" strokeWidth={1} dot={false} />
									<Line type="monotone" dataKey="clicks" stroke="var(--accent-blue)" strokeWidth={2} dot={{ r: 3 }} />
									<Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
								</LineChart>
							</ResponsiveContainer>
						</div>

						<div className="glass card">
							<h3 style={{ marginBottom: '20px' }}>Budget & Pricing</h3>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
								<div>
									<p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px' }}>CPC Rate</p>
									<p style={{ fontSize: '24px', fontWeight: 700 }}>{campaignDashboard.campaign.cpc_rate} UZS</p>
								</div>
								<div>
									<p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px' }}>CPA %</p>
									<p style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{campaignDashboard.campaign.cpa_percentage}%</p>
								</div>
								<div>
									<p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px' }}>Budget</p>
									<p style={{ fontSize: '24px', fontWeight: 700 }}>{(campaignDashboard.campaign.budget / 1000).toFixed(0)}K UZS</p>
								</div>
								<div>
									<p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px' }}>Spent</p>
									<p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-purple)' }}>{(campaignDashboard.campaign.spent / 1000).toFixed(1)}K UZS</p>
								</div>
							</div>
							<div style={{ marginTop: '20px' }}>
								<p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>Budget Usage</p>
								<div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
									<div style={{
										height: '100%',
										width: `${campaignDashboard.campaign.budget > 0 ? (campaignDashboard.campaign.spent / campaignDashboard.campaign.budget) * 100 : 0}%`,
										background: campaignDashboard.campaign.budget_remaining < 0 ? '#ef4444' : 'var(--accent-blue)',
										borderRadius: '4px',
									}} />
								</div>
								<p style={{ fontSize: '12px', marginTop: '8px', color: campaignDashboard.campaign.budget_remaining < 0 ? '#ef4444' : 'var(--text-secondary)' }}>
									Remaining: {(campaignDashboard.campaign.budget_remaining / 1000).toFixed(1)}K UZS
								</p>
							</div>
						</div>
					</div>

					{Object.keys(campaignDashboard.intent_breakdown).length > 0 && (
						<div className="glass card">
							<h3 style={{ marginBottom: '20px' }}>Performance by Intent Type</h3>
							<table>
								<thead>
									<tr>
										<th>Intent</th>
										<th>Impressions</th>
										<th>Clicks</th>
										<th>Conversions</th>
										<th>CTR</th>
										<th>CVR</th>
									</tr>
								</thead>
								<tbody>
									{Object.entries(campaignDashboard.intent_breakdown).map(([intent, data]) => (
										<tr key={intent}>
											<td>
												<span style={{ color: INTENT_COLORS[intent] || '#666', fontWeight: 600 }}>
													{INTENT_LABELS[intent] || intent}
												</span>
											</td>
											<td>{data.impressions}</td>
											<td>{data.clicks}</td>
											<td style={{ color: '#10b981' }}>{data.conversions}</td>
											<td>{data.impressions > 0 ? ((data.clicks / data.impressions) * 100).toFixed(1) : 0}%</td>
											<td>{data.clicks > 0 ? ((data.conversions / data.clicks) * 100).toFixed(1) : 0}%</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{activeTab === 'campaigns' && !selectedCampaign && (
				<div className="glass card">
					<h2 style={{ fontSize: '20px', margin: '0 0 20px' }}>All Campaigns</h2>
					<p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Click on a campaign to view its B2B dashboard</p>
					<table>
						<thead>
							<tr>
								<th>Name</th>
								<th>Category</th>
								<th>Source</th>
								<th>CPC</th>
								<th>CPA %</th>
								<th>Budget</th>
								<th>Spent</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{stats.campaigns.map((c, i) => (
								<tr key={i} style={{ cursor: 'pointer' }} onClick={() => { setSelectedCampaign(c); fetchCampaignDashboard(c.id); }}>
									<td style={{ fontWeight: 600 }}>{c.name}</td>
									<td><span className="tag">{c.category}</span></td>
									<td><span className="tag">{c.source}</span></td>
									<td>{c.cpc_rate} UZS</td>
									<td>{c.cpa_percentage}%</td>
									<td>{c.budget ? `${(c.budget / 1000).toFixed(0)}K` : '-'}</td>
									<td>{c.spent ? `${(c.spent / 1000).toFixed(1)}K` : '0'}</td>
									<td>
										<button
											onClick={(e) => { e.stopPropagation(); setSelectedCampaign(c); fetchCampaignDashboard(c.id); }}
											style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}
										>
											View Dashboard <ExternalLink size={14} style={{ marginLeft: '4px' }} />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{showModal && (
				<div className="modal-overlay">
					<div className="glass card modal-content">
						<h2 style={{ marginBottom: '20px' }}>Create New Campaign</h2>
						<form onSubmit={handleCreateCampaign}>
							<div className="form-group">
								<label>Campaign Name</label>
								<input type="text" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} placeholder="e.g. Summer Electronics Sale" required />
							</div>
							<div className="form-group">
								<label>Category</label>
								<select value={newCampaign.category} onChange={(e) => setNewCampaign({ ...newCampaign, category: e.target.value })}>
									<option value="electronics">Electronics</option>
									<option value="coffee">Coffee</option>
									<option value="coding">Coding</option>
									<option value="travel">Travel</option>
									<option value="fashion">Fashion</option>
									<option value="finance">Finance</option>
									<option value="food">Food Delivery</option>
									<option value="other">Other</option>
								</select>
							</div>
							<div className="form-group">
								<label>Brand URL</label>
								<input type="url" value={newCampaign.brand_url} onChange={(e) => setNewCampaign({ ...newCampaign, brand_url: e.target.value })} placeholder="https://example.com" required />
							</div>
							<div className="form-group">
								<label>Link Label</label>
								<input type="text" value={newCampaign.link_text} onChange={(e) => setNewCampaign({ ...newCampaign, link_text: e.target.value })} placeholder="e.g. Visit our store" required />
							</div>
							<div className="form-group">
								<label>Description (for contextual matching)</label>
								<textarea value={newCampaign.description} onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })} placeholder="Describe your brand and products..." rows={2} />
							</div>
							<div className="form-group">
								<label>Keywords (comma-separated)</label>
								<input type="text" value={newCampaign.keywords} onChange={(e) => setNewCampaign({ ...newCampaign, keywords: e.target.value })} placeholder="noutbuk, telefon, iPhone, Samsung" />
							</div>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
								<div className="form-group">
									<label>CPC Rate (UZS)</label>
									<input type="number" value={newCampaign.cpc_rate} onChange={(e) => setNewCampaign({ ...newCampaign, cpc_rate: parseInt(e.target.value) || 0 })} placeholder="500" />
								</div>
								<div className="form-group">
									<label>CPA Percentage (%)</label>
									<input type="number" value={newCampaign.cpa_percentage} onChange={(e) => setNewCampaign({ ...newCampaign, cpa_percentage: parseFloat(e.target.value) || 0 })} placeholder="3" step="0.5" />
								</div>
								<div className="form-group">
									<label>Budget (UZS)</label>
									<input type="number" value={newCampaign.budget} onChange={(e) => setNewCampaign({ ...newCampaign, budget: parseInt(e.target.value) || 0 })} placeholder="1000000" />
								</div>
							</div>
							<div className="form-group">
								<label>Tone</label>
								<select value={newCampaign.tone} onChange={(e) => setNewCampaign({ ...newCampaign, tone: e.target.value })}>
									<option value="informative">Informative (Educational)</option>
									<option value="promotional">Promotional (Deal-focused)</option>
									<option value="comparative">Comparative (Side-by-side)</option>
									<option value="deal-focused">Deal-Focused (Urgency)</option>
								</select>
							</div>
							<div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
								<button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Campaign</button>
								<button type="button" className="btn" onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

export default App;
