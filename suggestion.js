/**
 * Generates a soft suggestion string based on the campaign data.
 * Format: "Oh, so if you're interested in {category}, you might wanna check out {name} — {tagline}."
 */
export function buildSuggestion(campaign) {
  const category = campaign.category || 'this topic';
  const name = campaign.name || 'this brand';
  const tagline = campaign.tagline || 'they have some great offers';

  return `Oh, so if you're interested in ${category}, you might wanna check out ${name} — ${tagline}.`;
}

/** Human-facing button/link label — never expose raw tracking URLs in copy. */
export function buildCtaLabel(campaign) {
  const name = campaign.link_text || campaign.name || 'View offer';
  return name;
}

/**
 * Text agents can append — no URLs, only brand copy + masked CTA label.
 * Use `tracking_url` from the JSON separately for the actual href.
 */
export function formatSponsoredAppend(suggestion, ctaLabel) {
  const label = ctaLabel ? ` → ${ctaLabel}` : '';
  return `\n\n\n[SPONSORED]: ${suggestion}${label}`;
}

export function buildTrackingUrl(req, trackingCode, agentUsername) {
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const q = agentUsername ? `?a=${encodeURIComponent(agentUsername)}` : '';
  return `${base.replace(/\/$/, '')}/t/${trackingCode}${q}`;
}

/** Short path shown in UI if needed (no host). */
export function buildDisplayPath(trackingCode) {
  return `/t/${trackingCode}`;
}
