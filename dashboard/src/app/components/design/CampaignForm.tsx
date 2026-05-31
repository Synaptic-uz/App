import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, Globe } from 'lucide-react';
import { api } from '../../../lib/api';
import { FALLBACK_CATEGORIES, type CategoryOption } from '../../../lib/categories';
import { applyResearchToForm } from '../../../lib/campaignFormUtils';
import type { CampaignFormState } from '../../../lib/campaignFormDefaults';
import { FormField, inputClassName, selectClassName, textareaClassName, AppButton, Alert } from './index';
import { CampaignOfferingsEditor } from './CampaignOfferingsEditor';
import { CampaignProfilePanel } from './CampaignProfilePanel';
import { offeringsToApi } from '../../../lib/campaignOfferings';
import { toast } from 'sonner';

type Props = {
  form: CampaignFormState;
  setForm: Dispatch<SetStateAction<CampaignFormState>>;
  categories?: CategoryOption[];
  error?: string;
  submitting: boolean;
  mode: 'create' | 'edit';
  onSubmit: (e: React.FormEvent) => void;
};

export function CampaignForm({
  form,
  setForm,
  categories = FALLBACK_CATEGORIES,
  error,
  submitting,
  mode,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [researching, setResearching] = useState(false);

  const TONE_OPTIONS = [
    { id: 'informative', label: t('campaigns.tones.informative') },
    { id: 'promotional', label: t('campaigns.tones.promotional') },
    { id: 'comparative', label: t('campaigns.tones.comparative') },
    { id: 'deal-focused', label: t('campaigns.tones.dealFocused') },
  ];

  const category = categories.find((c) => c.id === form.category);
  const subcategories = category?.subcategories || [];

  const runAiResearch = useCallback(
    async (silent = false) => {
      const url = form.brand_url?.trim();
      if (!url || !url.startsWith('http')) {
        if (!silent) toast.error(t('campaigns.form.errorInvalidUrl'));
        return;
      }
      
      if (!silent) {
        setResearching(true);
        toast.info(t('campaigns.form.researching'));
      }

      try {
        const res = await api.researchCampaign({
          brand_url: url,
          name: form.name,
          category: form.category,
          brief: form.research_brief
        });
        
        setForm((prev) => applyResearchToForm(prev, res, categories));
        
        if (!silent) toast.success(t('campaigns.form.successResearch', { count: res.offerings?.length || 0 }));
      } catch (err: any) {
        console.error(err);
        if (!silent) toast.error(err.message || t('campaigns.form.errorResearch'));
      } finally {
        if (!silent) setResearching(false);
      }
    },
    [form.brand_url, form.name, form.category, form.research_brief, setForm, categories, t]
  );

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-1 gap-6">
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2 text-primary font-bold">
            <Globe className="w-5 h-5" />
            <h3>{t('campaigns.form.brandUrlTitle')}</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <input
                type="url"
                placeholder={t('campaigns.form.brandUrlPlaceholder')}
                className={inputClassName}
                value={form.brand_url}
                onChange={(e) => setForm({ ...form, brand_url: e.target.value })}
              />
            </div>
            <AppButton
              type="button"
              variant="secondary"
              className="gap-2 shrink-0"
              onClick={() => runAiResearch()}
              disabled={researching || !form.brand_url.startsWith('http')}
            >
              {researching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-primary" />
              )}
              {t('campaigns.form.aiFill')}
            </AppButton>
          </div>
          <p className="text-xs text-text-muted">
            {t('campaigns.form.brandUrlHint')}
          </p>
        </section>

        <form onSubmit={onSubmit} className="space-y-6">
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {t('campaigns.form.basicInfo')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('campaigns.name')} required>
              <input
                required
                className={inputClassName}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('campaigns.form.namePlaceholder')}
              />
            </FormField>

            <FormField label={t('campaigns.linkText')}>
              <input
                className={inputClassName}
                value={form.link_text}
                onChange={(e) => setForm({ ...form, link_text: e.target.value })}
                placeholder={t('campaigns.form.linkTextPlaceholder')}
              />
            </FormField>
          </div>

          <FormField label={t('campaigns.tagline')}>
            <input
              className={inputClassName}
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder={t('campaigns.form.taglinePlaceholder')}
            />
          </FormField>

          <FormField label={t('campaigns.description')}>
            <textarea
              className={textareaClassName}
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('campaigns.form.descriptionPlaceholder')}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('campaigns.category')} required>
              <select
                required
                className={selectClassName}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: '' })}
              >
                <option value="">{t('common.select')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(`categories.${c.id}.label`, { defaultValue: c.label })}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('campaigns.subcategory')}>
              <select
                className={selectClassName}
                value={form.subcategory}
                disabled={!form.category || form.category === 'other'}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              >
                <option value="">{t('common.select')}</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(`categories.${form.category}.${s.id}`, { defaultValue: s.label })}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {form.category === 'other' && (
            <FormField label={t('campaigns.customCategory')} required>
              <input
                required
                className={inputClassName}
                value={form.custom_category}
                onChange={(e) => setForm({ ...form, custom_category: e.target.value })}
                placeholder={t('campaigns.form.customCategoryPlaceholder')}
              />
            </FormField>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('campaigns.keywords')} hint={t('campaigns.form.keywordsHint')}>
              <textarea
                className={textareaClassName}
                rows={2}
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              />
            </FormField>
            <FormField label={t('campaigns.nicheKeywords')} hint={t('campaigns.form.nicheKeywordsHint')}>
              <textarea
                className={textareaClassName}
                rows={2}
                value={form.niche_keywords}
                onChange={(e) => setForm({ ...form, niche_keywords: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label={t('campaigns.budget')} hint={t('common.uzs')}>
              <input
                type="number"
                className={inputClassName}
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </FormField>
            <FormField label={t('campaigns.cpcRate')} hint={t('common.uzs')}>
              <input
                type="number"
                className={inputClassName}
                value={form.cpc_rate}
                onChange={(e) => setForm({ ...form, cpc_rate: e.target.value })}
              />
            </FormField>
            <FormField label={t('campaigns.tone')}>
              <select
                className={selectClassName}
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}
              >
                {TONE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <hr className="border-border" />

          <CampaignOfferingsEditor
            offerings={form.offerings}
            onChange={(offerings) => setForm({ ...form, offerings })}
            brandUrl={form.brand_url}
          />

          <hr className="border-border" />

          <CampaignProfilePanel form={form} />

          <div className="flex justify-end pt-4">
            <AppButton type="submit" size="lg" disabled={submitting} className="min-w-[200px]">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('campaigns.form.saving')}
                </>
              ) : (
                mode === 'create' ? t('campaigns.create') : t('common.save')
              )}
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  );
}
