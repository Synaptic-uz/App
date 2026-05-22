import { displayCategory } from './categories.js';

/** Campaign must have display fields and a valid destination before we show an ad. */
export function isCampaignServeReady(campaign) {
  if (!campaign) return false;
  if (!String(campaign.name || '').trim()) return false;
  if (!String(campaign.category || '').trim()) return false;
  if (!String(campaign.tracking_code || '').trim()) return false;
  const url = String(campaign.brand_url || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return false;
  return true;
}

/**
 * Soft suggestion: human category label + brand name + tagline.
 */
export function buildSuggestion(campaign) {
  const category = displayCategory(campaign) || 'this topic';
  const name = campaign.name || 'this brand';
  const tagline = campaign.tagline || 'they have some great offers';

  return `Oh, if you're interested in ${category}, you might wanna check out ${name} — ${tagline}.`;
}

export function buildCtaLabel(campaign) {
  return campaign.link_text || campaign.name || 'View offer';
}

export function formatSponsoredAppend(suggestion, ctaLabel) {
  const label = ctaLabel ? ` → ${ctaLabel}` : '';
  return `\n\n\n[SPONSORED]: ${suggestion}${label}`;
}

export function buildTrackingUrl(req, trackingCode, agentUsername) {
  if (!trackingCode) return null;
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const q = agentUsername ? `?a=${encodeURIComponent(agentUsername)}` : '';
  return `${base.replace(/\/$/, '')}/t/${trackingCode}${q}`;
}

export function buildDisplayPath(trackingCode) {
  return trackingCode ? `/t/${trackingCode}` : null;
}
