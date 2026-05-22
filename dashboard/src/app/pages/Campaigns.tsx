import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FALLBACK_CATEGORIES, type CategoryOption } from '../../lib/categories';
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
  subcategory: '',
  custom_category: '',
  brand_url: '',
  link_text: '',
  tagline: '',
  description: '',
  keywords: '',
  niche_keywords: '',
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

  const selectedCategory = categories.find((c) => c.id === form.category);
  const subcategoryOptions = selectedCategory?.subcategories ?? [];

  function getCategoryLabel(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    return cat?.label || catId;
  }

  function getSubcategoryLabel(catId: string, subId: string) {
    const cat = categories.find((c) => c.id === catId);
    const sub = cat?.subcategories?.find((s) => s.id === subId);
    return sub?.label || subId;
  }

  useEffect(() => {
    loadCampaigns();
    api.getCategories().then(setCategories).catch(() => {});
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

  function onCategoryChange(category: string) {
    const cat = categories.find((c) => c.id === category);
    const sub = cat?.subcategories[0]?.id ?? '';
    setForm({ ...form, category, subcategory: sub, custom_category: category === 'other' ? form.custom_category : '' });
  }

  const isOther = form.category === 'other';

  async function handleDelete(camp: { _id: string; name: string }) {
    if (!window.confirm(`Delete campaign "${camp.name}"?`)) return;
    setError('');
    try {
      await api.deleteCampaign(camp._id);
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to delete campaign');
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
            <p className="text-black/60">Create campaigns and set keywords users might type in chat.</p>
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
                    placeholder=""
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Category *</label>
                    <select
                      required
                      value={form.category}
                      onChange={(e) => onCategoryChange(e.target.value)}
                      className="w-full border border-black/20 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="">Select…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Subcategory *</label>
                    <select
                      required
                      value={form.subcategory}
                      onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                      disabled={!form.category}
                      className="w-full border border-black/20 rounded-lg px-3 py-2 bg-white disabled:opacity-50"
                    >
                      <option value="">Select…</option>
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
                    <label className="block text-sm font-medium text-black mb-1">Your category name *</label>
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
                  <label className="block text-sm font-medium text-black mb-1">Tagline *</label>
                  <input
                    required
                    value={form.tagline}
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder=""
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
                    placeholder="https://"
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
                  <label className="block text-sm font-medium text-black mb-1">Keywords *</label>
                  <input
                    required
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder="universitet, abituriyent, qabul"
                  />
                  <p className="text-xs text-black/50 mt-1">Comma-separated words users might say in chat.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Niche keywords (optional)</label>
                  <input
                    value={form.niche_keywords}
                    onChange={(e) => setForm({ ...form, niche_keywords: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Budget (UZS) *</label>
                  <input
                    required
                    type="number"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="w-full border border-black/20 rounded-lg px-3 py-2"
                    placeholder="Enter total budget (UZS)"
                  />
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
                  <th className="p-4 font-semibold text-black">Name</th>
                  <th className="p-4 font-semibold text-black">Category</th>
                  <th className="p-4 font-semibold text-black text-right">Budget</th>
                  <th className="p-4 font-semibold text-black text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((camp) => {
                  const catLabel = camp.category === 'other' && camp.custom_category
                    ? camp.custom_category
                    : getCategoryLabel(camp.category);
                  const subLabel = camp.subcategory && camp.category !== 'other'
                    ? getSubcategoryLabel(camp.category, camp.subcategory)
                    : '';
                  return (
                    <tr key={camp._id} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                      <td className="p-4 font-medium text-black">
                        {camp.name}
                        <div className="text-xs text-black/60 font-normal line-clamp-1 mb-1">{camp.tagline}</div>
                        {camp.keywords && camp.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {camp.keywords.slice(0, 4).map((kw: string) => (
                              <span key={kw} className="text-[10px] bg-blue-50 text-[#0000FF] px-1.5 py-0.5 rounded border border-blue-100 font-normal">
                                {kw}
                              </span>
                            ))}
                            {camp.keywords.length > 4 && (
                              <span className="text-[10px] text-black/40 px-1 py-0.5 font-normal">
                                +{camp.keywords.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-black/10 text-black text-sm rounded-full">
                          {catLabel}
                          {subLabel ? ` / ${subLabel}` : ''}
                        </span>
                      </td>
                      <td className="p-4 text-right text-black">{(camp.budget / 1000).toLocaleString()}K UZS</td>
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
                  );
                })}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-black/60">
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
