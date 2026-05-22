import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FALLBACK_CATEGORIES, type CategoryOption } from '../../lib/categories';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import MainBalanceBanner from '../components/MainBalanceBanner';
import { uz } from '../../lib/uz';
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
  subcategory: '',
  custom_category: '',
  brand_url: '',
  link_text: '',
  tagline: '',
  description: '',
  keywords: '',
  niche_keywords: '',
  cpc_rate: '',
  cpa_percentage: '',
  budget: '',
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mainBalance, setMainBalance] = useState(0);

  const selectedCategory = categories.find((c) => c.id === form.category);
  const subcategoryOptions = selectedCategory?.subcategories ?? [];

  useEffect(() => {
    loadCampaigns();
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const data = await api.getCampaigns();
      const list = Array.isArray(data) ? data : data.campaigns || [];
      setCampaigns(list);
      setMainBalance(
        typeof data?.main_balance === 'number'
          ? data.main_balance
          : list.reduce((s: number, c: { budget?: number }) => s + (c.budget || 0), 0)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function onCategoryChange(category: string) {
    const cat = categories.find((c) => c.id === category);
    const sub = cat?.subcategories[0]?.id ?? '';
    setForm({ ...form, category, subcategory: sub, custom_category: category === 'other' ? form.custom_category : '' });
  }

  const isOther = form.category === 'other';

  async function handleDelete(camp: { _id: string; name: string }) {
    if (!window.confirm(`${uz.campaigns.deleteConfirm} "${camp.name}"?`)) return;
    setError('');
    try {
      await api.deleteCampaign(camp._id);
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message || uz.campaigns.deleteFailed);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const created = await api.createCampaign({
        name: form.name,
        category: form.category,
        subcategory: form.subcategory,
        custom_category: isOther ? form.custom_category.trim() : '',
        brand_url: form.brand_url,
        link_text: form.link_text || form.name,
        tagline: form.tagline,
        description: form.description,
        keywords: form.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        niche_keywords: form.niche_keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        cpc_rate: Number(form.cpc_rate) || 0,
        cpa_percentage: Number(form.cpa_percentage) || 0,
        budget: Number(form.budget) || 0,
      });
      if (typeof created?.main_balance === 'number') setMainBalance(created.main_balance);
      setForm(emptyForm);
      setDialogOpen(false);
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message || uz.campaigns.createFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="size-full bg-white overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">{uz.campaigns.title}</h1>
            <p className="text-black/60">{uz.campaigns.subtitle}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="px-6 py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {uz.campaigns.newCampaign}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{uz.campaigns.createTitle}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.name} *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder=""
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.category} *</label>
                    <select
                      required
                      value={form.category}
                      onChange={(e) => onCategoryChange(e.target.value)}
                      className="w-full border border-black/20 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="">{uz.common.select}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.subcategory} *</label>
                    <select
                      required
                      value={form.subcategory}
                      onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                      disabled={!form.category}
                      className="w-full border border-black/20 rounded-lg px-3 py-2 bg-white disabled:opacity-50"
                    >
                      <option value="">{uz.common.select}</option>
                      {subcategoryOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {isOther && (
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.customCategory} *</label>
                    <input
                      required
                      value={form.custom_category}
                      onChange={(e) => setForm({ ...form, custom_category: e.target.value })}
                      className="w-full border border-black/20 rounded-lg px-3 py-2"
                      placeholder="University"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.tagline} *</label>
                  <input
                    required
                    value={form.tagline}
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.brandUrl} *</label>
                  <input
                    required
                    type="url"
                    value={form.brand_url}
                    onChange={(e) => setForm({ ...form, brand_url: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder="https://"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.description}</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.keywords} *</label>
                  <input
                    required
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder="universitet, abituriyent, qabul"
                  />
                  <p className="text-xs text-black/50 mt-1">{uz.campaigns.keywordsHint}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.nicheKeywords}</label>
                  <input
                    value={form.niche_keywords}
                    onChange={(e) => setForm({ ...form, niche_keywords: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.cpc}</label>
                    <input
                      type="number"
                      value={form.cpc_rate}
                      onChange={(e) => setForm({ ...form, cpc_rate: e.target.value })}
                      className="w-full border border-black/20 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.cpa}</label>
                    <input
                      type="number"
                      value={form.cpa_percentage}
                      onChange={(e) => setForm({ ...form, cpa_percentage: e.target.value })}
                      className="w-full border border-black/20 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">{uz.campaigns.balance}</label>
                    <input
                      type="number"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      className="w-full border border-black/20 rounded-lg px-3 py-2"
                      placeholder={uz.campaigns.balancePlaceholder}
                    />
                    <p className="text-xs text-black/50 mt-1">{uz.campaigns.balanceHint}</p>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] disabled:opacity-50"
                >
                  {submitting ? uz.campaigns.creating : uz.campaigns.create}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!loading && campaigns.length > 0 && (
          <MainBalanceBanner
            mainBalance={mainBalance}
            campaignCount={campaigns.length}
            className="mb-6"
          />
        )}

        {error && !dialogOpen && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

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
                  <th className="p-4 font-semibold text-black">{uz.campaigns.colName}</th>
                  <th className="p-4 font-semibold text-black">{uz.campaigns.colCategory}</th>
                  <th className="p-4 font-semibold text-black text-right">{uz.campaigns.cpc}</th>
                  <th className="p-4 font-semibold text-black text-right">{uz.campaigns.colBalance}</th>
                  <th className="p-4 font-semibold text-black text-right">{uz.campaigns.colUsed}</th>
                  <th className="p-4 font-semibold text-black text-center">{uz.campaigns.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((camp) => (
                  <tr key={camp._id} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                    <td className="p-4 font-medium text-black">
                      {camp.name}
                      <div className="text-xs text-black/60 font-normal line-clamp-1">{camp.tagline}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-black/10 text-black text-sm rounded-full">
                        {camp.category === 'other' && camp.custom_category
                          ? camp.custom_category
                          : camp.category}
                        {camp.subcategory && camp.category !== 'other' ? ` / ${camp.subcategory}` : ''}
                      </span>
                    </td>
                    <td className="p-4 text-right text-black">{camp.cpc_rate}</td>
                    <td className="p-4 text-right text-black font-medium">
                      {camp.budget > 0 ? `${(camp.budget).toLocaleString()} ${uz.common.uzs}` : uz.common.unlimited}
                    </td>
                    <td className="p-4 text-right text-black/70">{(camp.spent || 0).toLocaleString()} UZS</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 text-black/60 hover:text-[#0000FF] hover:bg-[#0000FF]/10 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(camp)}
                          className="p-2 text-black/60 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Delete ${camp.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-black/60">
                      {uz.campaigns.noCampaigns}
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
