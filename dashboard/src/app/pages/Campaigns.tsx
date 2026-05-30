import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { FALLBACK_CATEGORIES, type CategoryOption } from '../../lib/categories';
import { Plus, Edit2, Trash2, RefreshCw, Pause, Play, Copy } from 'lucide-react';
import { buildTrackingUrl } from '../../lib/tracking';
import { isCampaignActive } from '../../lib/campaignFormUtils';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  PageShell,
  PageHeader,
  BackLink,
  AppButton,
  Alert,
  Badge,
  DataTableShell,
  MobileCardList,
  DataCard,
  IconButton,
} from '../components/design';
import { CampaignForm } from '../components/design/CampaignForm';
import { emptyCampaignForm, type CampaignFormState } from '../../lib/campaignFormDefaults';
import { WalletPanel } from '../components/design/WalletPanel';
import { offeringsFromApi, offeringsToApi } from '../../lib/campaignOfferings';

function campaignToForm(camp: any): CampaignFormState {
  return {
    name: String(camp.name ?? ''),
    category: String(camp.category ?? ''),
    subcategory: String(camp.subcategory ?? ''),
    custom_category: String(camp.custom_category ?? ''),
    brand_url: String(camp.brand_url ?? ''),
    link_text: String(camp.link_text ?? ''),
    tagline: String(camp.tagline ?? ''),
    description: String(camp.description ?? ''),
    keywords: Array.isArray(camp.keywords) ? (camp.keywords as string[]).join(', ') : '',
    niche_keywords: Array.isArray(camp.niche_keywords) ? (camp.niche_keywords as string[]).join(', ') : '',
    budget: camp.budget != null ? String(camp.budget) : '',
    cpc_rate: camp.cpc_rate != null ? String(camp.cpc_rate) : '2500',
    tone: String(camp.tone ?? 'informative'),
    research_brief: '',
    offerings: offeringsFromApi(camp.offerings),
  };
}

export default function Campaigns() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignFormState>(emptyCampaignForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('campaigns.errorLoad');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function copyTrackingLink(trackingCode: string) {
    const url = buildTrackingUrl(trackingCode);
    const full =
      url.startsWith('http') || url.startsWith('/')
        ? url.startsWith('/')
          ? `${window.location.origin}${url}`
          : url
        : url;
    await navigator.clipboard.writeText(full);
    toast.success(t('campaigns.successCopyLink'));
  }

  async function handleRefreshEmbedding(id: string) {
    setRefreshingId(id);
    try {
      await api.refreshCampaignEmbedding(id);
      toast.success(t('campaigns.successRefreshEmbedding'));
    } catch (err: any) {
      toast.error(err.message || t('campaigns.errorRefreshEmbedding'));
    } finally {
      setRefreshingId(null);
    }
  }

  const isOther = form.category === 'other';

  async function handleDelete(camp: { _id: string; name: string }) {
    if (!window.confirm(t('campaigns.confirmDelete', { name: camp.name }))) return;
    setError('');
    try {
      await api.deleteCampaign(camp._id);
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message || t('campaigns.errorDelete'));
    }
  }

  function buildPayload() {
    return {
      name: form.name,
      category: form.category,
      subcategory: form.subcategory,
      custom_category: isOther ? form.custom_category.trim() : '',
      brand_url: form.brand_url,
      link_text: form.link_text || form.name,
      tagline: form.tagline,
      description: form.description,
      tone: form.tone,
      budget: Number(form.budget) || 0,
      cpc_rate: Number(form.cpc_rate) || 2500,
      keywords: form.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      niche_keywords: form.niche_keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      offerings: offeringsToApi(form.offerings as any),
    };
  }

  function validateForm(): string | null {
    const hasKeywords = form.keywords.split(',').some((k) => k.trim());
    const hasOfferings = form.offerings.some((o) => o.name.trim());
    if (!hasKeywords && !hasOfferings) {
      return t('campaigns.errorValidation');
    }
    return null;
  }

  async function handleTogglePause(camp: { _id: string; name: string; active?: number | boolean }) {
    const nextActive = !isCampaignActive(camp);
    setStatusUpdatingId(camp._id);
    try {
      await api.setCampaignStatus(camp._id, nextActive);
      toast.success(nextActive ? t('campaigns.successResume') : t('campaigns.successPause'));
      await loadCampaigns();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('campaigns.errorStatusUpdate');
      toast.error(msg);
    } finally {
      setStatusUpdatingId(null);
    }
  }

  function openEdit(camp: Record<string, unknown>) {
    setEditingId(String(camp._id));
    setForm(campaignToForm(camp));
    setError('');
    setEditDialogOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.createCampaign(buildPayload());
      setForm(emptyCampaignForm);
      setDialogOpen(false);
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message || t('campaigns.errorCreate'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.updateCampaign(editingId, buildPayload());
      setForm(emptyCampaignForm);
      setEditingId(null);
      setEditDialogOpen(false);
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message || t('campaigns.errorUpdate'));
    } finally {
      setSubmitting(false);
    }
  }

  function renderActions(camp: { _id: string; name: string; tracking_code?: string; active?: number | boolean }) {
    const active = isCampaignActive(camp);
    return (
      <>
        {camp.tracking_code && (
          <IconButton
            label={t('campaigns.copyTrackingLink')}
            onClick={() => copyTrackingLink(camp.tracking_code!)}
          >
            <Copy className="w-4 h-4" />
          </IconButton>
        )}
        <IconButton
          label={active ? t('campaigns.pause') : t('campaigns.resume')}
          onClick={() => handleTogglePause(camp)}
          disabled={statusUpdatingId === camp._id}
        >
          {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </IconButton>
        <IconButton
          label={t('campaigns.refreshEmbedding')}
          onClick={() => handleRefreshEmbedding(camp._id)}
          disabled={refreshingId === camp._id}
        >
          <RefreshCw className={`w-4 h-4 ${refreshingId === camp._id ? 'animate-spin' : ''}`} />
        </IconButton>
        <IconButton label={t('campaigns.editNamed', { name: camp.name })} onClick={() => openEdit(camp)}>
          <Edit2 className="w-4 h-4" />
        </IconButton>
        <IconButton
          label={t('campaigns.deleteNamed', { name: camp.name })}
          className="hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
          onClick={() => handleDelete(camp)}
        >
          <Trash2 className="w-4 h-4" />
        </IconButton>
      </>
    );
  }

  return (
    <PageShell className="animate-fadeIn">
      <BackLink />

      <WalletPanel onUpdated={loadCampaigns} />

      <PageHeader
        title={t('campaigns.title')}
        description={t('campaigns.headerDesc')}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <AppButton className="gap-2">
                <Plus className="w-5 h-5" />
                {t('campaigns.create')}
              </AppButton>
            </DialogTrigger>
            <DialogContent className="synaptic-scroll max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-xl)]" data-scrollable="true">
              <DialogHeader>
                <DialogTitle>{t('campaigns.create')}</DialogTitle>
              </DialogHeader>
              <CampaignForm
                form={form}
                setForm={setForm}
                categories={categories}
                error={error}
                submitting={submitting}
                mode="create"
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingId(null);
            setError('');
          }
        }}
      >
        <DialogContent className="synaptic-scroll max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-xl)]" data-scrollable="true">
          <DialogHeader>
            <DialogTitle>{t('campaigns.edit')}</DialogTitle>
          </DialogHeader>
          <CampaignForm
            form={form}
            setForm={setForm}
            categories={categories}
            error={error}
            submitting={submitting}
            mode="edit"
            onSubmit={handleUpdate}
          />
        </DialogContent>
      </Dialog>

      {error && !dialogOpen && !editDialogOpen && <Alert className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)]" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="synaptic-card text-center max-w-lg mx-auto">
          <p className="text-lg font-semibold text-[var(--color-text)] mb-2">{t('campaigns.firstCampaign')}</p>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
            Brend sayti va mahsulotlarni kiriting — AI kalit so‘zlar, shior va auditoriyani avtomatik
            to‘ldiradi.
          </p>
          <AppButton onClick={() => setDialogOpen(true)} className="gap-2 min-h-12 px-8">
            <Plus className="w-5 h-5" />
            {t('campaigns.create')}
          </AppButton>
        </div>
      ) : (
        <>
          <MobileCardList>
            {campaigns.map((camp) => {
              const catLabel =
                camp.category === 'other' && camp.custom_category
                  ? camp.custom_category
                  : getCategoryLabel(camp.category);
              const subLabel =
                camp.subcategory && camp.category !== 'other'
                  ? getSubcategoryLabel(camp.category, camp.subcategory)
                  : '';
              return (
                <DataCard
                  key={camp._id}
                  title={camp.name}
                  subtitle={camp.tagline}
                  meta={
                    camp.tracking_code
                      ? `${(camp.budget / 1000).toLocaleString()} ${t('common.thousandUzs')} · /t/${camp.tracking_code}`
                      : `${(camp.budget / 1000).toLocaleString()} ${t('common.thousandUzs')}`
                  }
                  badges={
                    <>
                      {isCampaignActive(camp) ? (
                        <Badge variant="success">{t('campaigns.active')}</Badge>
                      ) : (
                        <Badge variant="danger">{t('campaigns.paused')}</Badge>
                      )}
                      {Array.isArray(camp.offerings) && camp.offerings.length > 0 && (
                        <Badge variant="neutral">
                          {t('campaigns.taMahsulot', { count: camp.offerings.length })}
                        </Badge>
                      )}
                      <Badge variant="neutral">
                        {catLabel}
                        {subLabel ? ` / ${subLabel}` : ''}
                      </Badge>
                      {camp.keywords?.slice(0, 3).map((kw: string) => (
                        <Badge key={kw} variant="primary">
                          {kw}
                        </Badge>
                      ))}
                    </>
                  }
                  actions={renderActions(camp)}
                />
              );
            })}
          </MobileCardList>

          <DataTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)]">{t('campaigns.name')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)] text-center">{t('common.status')}</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)]">Kategoriya</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)] text-right">Byudjet</th>
                  <th className="p-4 font-semibold text-[var(--color-text-muted)] text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((camp) => {
                  const catLabel =
                    camp.category === 'other' && camp.custom_category
                      ? camp.custom_category
                      : getCategoryLabel(camp.category);
                  const subLabel =
                    camp.subcategory && camp.category !== 'other'
                      ? getSubcategoryLabel(camp.category, camp.subcategory)
                      : '';
                  return (
                    <tr
                      key={camp._id}
                      className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)]/80 transition-colors"
                    >
                      <td className="p-4">
                        <p className="font-semibold text-[var(--color-text)]">{camp.name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1 mt-0.5">
                          {camp.tagline}
                        </p>
                        {camp.keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {camp.keywords.slice(0, 4).map((kw: string) => (
                              <Badge key={kw} variant="primary">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isCampaignActive(camp) ? (
                          <Badge variant="success">{t('campaigns.active')}</Badge>
                        ) : (
                          <Badge variant="danger">{t('campaigns.paused')}</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="neutral">
                          {catLabel}
                          {subLabel ? ` / ${subLabel}` : ''}
                        </Badge>
                      </td>
                      <td className="p-4 text-right tabular-nums text-[var(--color-text)]">
                        {(camp.budget / 1000).toLocaleString('uz-UZ')} ming so‘m
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">{renderActions(camp)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTableShell>
        </>
      )}
    </PageShell>
  );
}
