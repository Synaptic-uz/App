import { Plus, Trash2, Package, Wrench } from 'lucide-react';
import type { CampaignOffering } from '../../../lib/campaignOfferings';
import { newOffering } from '../../../lib/campaignOfferings';
import { useTranslation } from 'react-i18next';
import { FormField, inputClassName, selectClassName, textareaClassName, AppButton } from './index';
import { cn } from '../ui/utils';

type Props = {
  offerings: CampaignOffering[];
  onChange: (offerings: CampaignOffering[]) => void;
  brandUrl?: string;
  disabled?: boolean;
};

export function CampaignOfferingsEditor({ offerings, onChange, brandUrl, disabled }: Props) {
  const { t } = useTranslation();

  function update(id: string, patch: Partial<CampaignOffering>) {
    onChange(offerings.map((o) => (o.clientId === id ? { ...o, ...patch } : o)));
  }

  function remove(id: string) {
    onChange(offerings.filter((o) => o.clientId !== id));
  }

  function add(type: 'product' | 'service') {
    onChange([
      ...offerings,
      newOffering({
        type,
        url: brandUrl || '',
      }),
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">{t('offerings.title')}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            {t('offerings.desc')}
          </p>
        </div>
        <div className="flex gap-2">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            disabled={disabled}
            onClick={() => add('product')}
          >
            <Package className="w-4 h-4" />
            {t('offerings.product')}
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            disabled={disabled}
            onClick={() => add('service')}
          >
            <Wrench className="w-4 h-4" />
            {t('offerings.service')}
          </AppButton>
        </div>
      </div>

      {offerings.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
          {t('offerings.empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {offerings.map((o, index) => (
            <div
              key={o.clientId}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide',
                    o.type === 'service' ? 'text-[var(--color-accent)]' : 'text-[var(--color-primary)]'
                  )}
                >
                  {o.type === 'service' ? t('offerings.service') : t('offerings.product')} #{index + 1}
                </span>
                <button
                  type="button"
                  aria-label={t('common.delete')}
                  disabled={disabled}
                  onClick={() => remove(o.clientId)}
                  className="p-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label={t('offerings.name')}>
                  <input
                    required
                    value={o.name}
                    disabled={disabled}
                    onChange={(e) => update(o.clientId, { name: e.target.value })}
                    className={inputClassName}
                    placeholder={t('offerings.namePlaceholder')}
                  />
                </FormField>
                <FormField label={t('offerings.type')}>
                  <select
                    value={o.type}
                    disabled={disabled}
                    onChange={(e) =>
                      update(o.clientId, { type: e.target.value as 'product' | 'service' })
                    }
                    className={selectClassName}
                  >
                    <option value="product">{t('offerings.product')}</option>
                    <option value="service">{t('offerings.service')}</option>
                  </select>
                </FormField>
              </div>

              <FormField label={t('offerings.description')}>
                <textarea
                  value={o.description}
                  disabled={disabled}
                  onChange={(e) => update(o.clientId, { description: e.target.value })}
                  className={textareaClassName}
                  rows={2}
                  placeholder={t('offerings.descriptionPlaceholder')}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label={t('offerings.link')} hint={t('offerings.linkHint')}>
                  <input
                    type="url"
                    value={o.url}
                    disabled={disabled}
                    onChange={(e) => update(o.clientId, { url: e.target.value })}
                    className={inputClassName}
                    placeholder={brandUrl || t('offerings.linkPlaceholder')}
                  />
                </FormField>
                <FormField label={t('offerings.price')}>
                  <input
                    value={o.price_hint}
                    disabled={disabled}
                    onChange={(e) => update(o.clientId, { price_hint: e.target.value })}
                    className={inputClassName}
                    placeholder={t('offerings.pricePlaceholder')}
                  />
                </FormField>
              </div>

              <FormField label={t('offerings.keywords')} hint={t('offerings.keywordsHint')}>
                <input
                  value={o.keywords}
                  disabled={disabled}
                  onChange={(e) => update(o.clientId, { keywords: e.target.value })}
                  className={inputClassName}
                  placeholder={t('offerings.keywordsPlaceholder')}
                />
              </FormField>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
