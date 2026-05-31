import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { offeringsToApi } from '../../../lib/campaignOfferings';
import type { CampaignFormState } from '../../../lib/campaignFormDefaults';

type Props = {
  form: CampaignFormState;
  open?: boolean;
};

export function CampaignProfilePanel({ form, open = true }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !form.name?.trim() || !form.category) {
      setText('');
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await api.previewCampaignProfile({
          name: form.name,
          category: form.category,
          subcategory: form.subcategory,
          custom_category: form.custom_category,
          tagline: form.tagline,
          description: form.description,
          tone: form.tone,
          keywords: form.keywords,
          niche_keywords: form.niche_keywords,
          offerings: offeringsToApi(form.offerings as any),
        });
        setText(result.profile_text || '');
      } catch {
        setText('');
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [form, open]);

  if (!open) return null;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-white">
        <FileText className="w-4 h-4 text-[var(--color-primary)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-text)]">{t('campaigns.form.profileTitle')}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{t('campaigns.form.profileDesc')}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />}
      </div>
      <div className="p-4 max-h-40 overflow-y-auto">
        {text ? (
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed font-mono whitespace-pre-wrap">
            {text}
          </p>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)]">
            {loading ? t('campaigns.form.profileLoading') : t('campaigns.form.profileEmpty')}
          </p>
        )}
        {text && (
          <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
            {t('campaigns.form.profileChars', { count: text.length })}
          </p>
        )}
      </div>
    </div>
  );
}
