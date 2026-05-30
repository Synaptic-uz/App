import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2 } from 'lucide-react';
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

  const TONE_OPTIONS = [
    { id: 'informative', label: t('campaigns.tones.informative') },
    { id: 'promotional', label: t('campaigns.tones.promotional') },
    { id: 'comparative', label: t('campaigns.tones.comparative') },
    { id: 'deal-focused', label: t('campaigns.tones.dealFocused') },
  ];

  // ... rest of the component
  const runAiResearch = useCallback(
    async (silent = false) => {
      const url = form.brand_url?.trim();
      if (!url || !url.startsWith('http')) {
        if (!silent) toast.error(t('campaigns.form.errorInvalidUrl'));
        return;
      }
      if (!silent) toast.info(t('campaigns.form.researching'));
      try {
        const res = await api.researchCampaign(url, form.research_brief);
        applyResearchToForm(res, setForm);
        if (!silent) toast.success(t('campaigns.form.successResearch', { count: res.offerings?.length || 0 }));
      } catch (err: any) {
        console.error(err);
        if (!silent) toast.error(t('campaigns.form.errorResearch'));
      }
    },
    [form.brand_url, form.research_brief, setForm, t]
  );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField label={t("campaigns.name")}>
        <input 
          required 
          value={form.name} 
          onChange={(e) => setForm({ ...form, name: e.target.value })} 
          className={inputClassName} 
        />
      </FormField>
      <AppButton type="submit" disabled={submitting}>
        {submitting ? t("campaigns.form.saving") : t("common.save")}
      </AppButton>
    </form>
  );
}
