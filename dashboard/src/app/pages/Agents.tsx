import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../context/AuthContext';
import { Plus, CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';

export default function Agents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      setUsername('');
      await loadAgents();
    } catch (err: any) {
      setError(err.message || 'Failed to register agent');
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

  async function copyApiKey() {
    if (!newApiKey) return;
    await navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="size-full bg-white overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">AI Agents</h1>
            <p className="text-black/60">Manage your registered AI agents and integrations</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <button className="px-6 py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Register Agent
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Register New AI Agent</DialogTitle>
              </DialogHeader>
              {newApiKey ? (
                <div className="space-y-4 mt-4">
                  <p className="text-sm text-black/70">
                    Agent registered successfully. Copy your API key now — it will not be shown again.
                  </p>
                  <div className="bg-black/5 p-4 rounded-lg font-mono text-sm break-all border border-black/10">
                    {newApiKey}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyApiKey}
                      className="flex-1 py-2 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] flex items-center justify-center gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy API Key'}
                    </button>
                    <button
                      onClick={() => handleDialogChange(false)}
                      className="px-4 py-2 border border-black/20 rounded-lg hover:bg-black/5"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Agent Username *</label>
                    <input
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full border border-black/20 rounded-lg px-3 py-2"
                      placeholder="my-telegram-bot"
                    />
                    <p className="text-xs text-black/50 mt-1">Used in tracking URLs and analytics</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Owner Email</label>
                    <input
                      disabled
                      value={user?.email || ''}
                      className="w-full border border-black/20 rounded-lg px-3 py-2 bg-black/5"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] disabled:opacity-50"
                  >
                    {submitting ? 'Registering...' : 'Generate API Key'}
                  </button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl bg-black/5" />
            ))}
          </div>
        ) : (
          <div className="bg-white border-2 border-black/10 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-black/5 border-b-2 border-black/10">
                <tr>
                  <th className="p-4 font-semibold text-black">Agent ID (Username)</th>
                  <th className="p-4 font-semibold text-black">Owner Email</th>
                  <th className="p-4 font-semibold text-black text-center">Status</th>
                  <th className="p-4 font-semibold text-black text-right">Total Requests</th>
                  <th className="p-4 font-semibold text-black text-right">Clicks Generated</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent._id} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                    <td className="p-4 font-medium text-black">
                      {agent.username}
                      <div className="text-xs text-black/60 font-normal">
                        Last seen: {new Date(agent.last_seen || agent.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-black/80">{agent.owner_email}</td>
                    <td className="p-4 text-center">
                      {agent.active ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right text-black">{(agent.total_requests || 0).toLocaleString()}</td>
                    <td className="p-4 text-right text-[#0000FF] font-medium">
                      {(agent.total_clicks || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {agents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-black/60">
                      No agents registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
