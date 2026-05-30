import { ExternalLink, Sparkles } from 'lucide-react';

type Props = {
  suggestion?: string;
  campaignName?: string;
  categoryLabel?: string;
  trackingUrl: string;
  ctaLabel: string;
};

export function SponsoredCard({
  suggestion,
  campaignName,
  categoryLabel,
  trackingUrl,
  ctaLabel,
}: Props) {
  return (
    <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-primary)]/25 bg-gradient-to-br from-[var(--color-icon-bg)] to-white shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-primary)]/10 bg-[var(--color-primary)]/[0.04]">
        <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          <Sparkles className="w-3 h-3" />
          Reklama
        </span>
        {categoryLabel && (
          <span className="text-[11px] font-medium text-[var(--color-text-muted)] truncate">
            {categoryLabel}
          </span>
        )}
      </div>
      <div className="p-3 space-y-2">
        {campaignName && (
          <p className="text-sm font-semibold text-[var(--color-text)] leading-snug">{campaignName}</p>
        )}
        {suggestion && (
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
            {suggestion}
          </p>
        )}
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full min-h-11 rounded-[var(--radius-md)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-all text-sm font-semibold text-white shadow-[var(--shadow-glow)] active:scale-[0.98]"
        >
          {ctaLabel}
          <ExternalLink className="w-4 h-4 opacity-90" />
        </a>
      </div>
    </div>
  );
}
