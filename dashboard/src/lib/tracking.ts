/** Click tracking URL (proxied to backend in Vite dev). */
export function buildTrackingUrl(trackingCode: string, agentUsername = 'demo') {
  const base = (import.meta.env.VITE_TRACKING_URL || '').replace(/\/$/, '');
  const path = `/t/${encodeURIComponent(trackingCode)}?a=${encodeURIComponent(agentUsername)}`;
  if (base) return `${base}${path}`;
  return path;
}
