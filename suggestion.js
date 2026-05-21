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
