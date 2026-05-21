import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';

const emptyForm = {
  name: '',
  category: '',
  brand_url: '',
  link_text: '',
  tagline: '',
  description: '',
  keywords: '',
  cpc_rate: '',
  cpa_percentage: '',
  budget: '',
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const camps = await api.getCampaigns();
      setCampaigns(Array.isArray(camps) ? camps : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.createCampaign({
        name: form.name,
        category: form.category,
        brand_url: form.brand_url,
        link_text: form.link_text || form.name,
        tagline: form.tagline,
        description: form.description,
        keywords: form.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        cpc_rate: Number(form.cpc_rate) || 0,
        cpa_percentage: Number(form.cpa_percentage) || 0,
        budget: Number(form.budget) || 0,
      });
      setForm(emptyForm);
      setDialogOpen(false);
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="size-full bg-white overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Campaigns</h1>
            <p className="text-black/60">Manage your advertising campaigns</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="px-6 py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors flex items-center gap-2">
                <Plus className="w-5 h-5" />
                New Campaign
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Campaign Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder="Uzum Market"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Category *</label>
                  <input
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder="electronics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Brand URL *</label>
                  <input
                    required
                    type="url"
                    value={form.brand_url}
                    onChange={(e) => setForm({ ...form, brand_url: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder="https://uzum.market"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Tagline</label>
                  <input
                    value={form.tagline}
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder="Installment plans with free delivery"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Keywords (comma-separated)</label>
                  <input
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder="iPhone, telefon, noutbuk"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">CPC (UZS)</label>
                    <input
                      type="number"
                      value={form.cpc_rate}
                      onChange={(e) => setForm({ ...form, cpc_rate: e.target.value })}
                      className="w-full border border-black/20 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">CPA %</label>
                    <input
                      type="number"
                      value={form.cpa_percentage}
                      onChange={(e) => setForm({ ...form, cpa_percentage: e.target.value })}
                      className="w-full border border-black/20 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Budget</label>
                    <input
                      type="number"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      className="w-full border border-black/20 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Campaign'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl bg-black/5" />
            ))}
          </div>
        ) : (
          <div className="bg-white border-2 border-black/10 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-black/5 border-b-2 border-black/10">
                <tr>
                  <th className="p-4 font-semibold text-black">Name</th>
                  <th className="p-4 font-semibold text-black">Category</th>
                  <th className="p-4 font-semibold text-black text-right">CPC (UZS)</th>
                  <th className="p-4 font-semibold text-black text-right">Budget</th>
                  <th className="p-4 font-semibold text-black text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((camp) => (
                  <tr key={camp._id} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                    <td className="p-4 font-medium text-black">
                      {camp.name}
                      <div className="text-xs text-black/60 font-normal">{camp.tracking_code}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-black/10 text-black text-sm rounded-full">
                        {camp.category}
                      </span>
                    </td>
                    <td className="p-4 text-right text-black">{camp.cpc_rate}</td>
                    <td className="p-4 text-right text-black">{(camp.budget / 1000).toLocaleString()}K</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 text-black/60 hover:text-[#0000FF] hover:bg-[#0000FF]/10 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-black/60 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-black/60">
                      No campaigns found. Create one to get started!
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
