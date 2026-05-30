export const DEMO_VISITED_KEY = 'synaptic_demo_visited';

export function markDemoVisited() {
  try {
    localStorage.setItem(DEMO_VISITED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function isDemoVisited(): boolean {
  try {
    return localStorage.getItem(DEMO_VISITED_KEY) === '1';
  } catch {
    return false;
  }
}

export function isProfileComplete(
  user: { role?: string; display_name?: string; company_name?: string } | null
): boolean {
  if (!user) return false;
  const name = (user.display_name || '').trim();
  if (user.role === 'business') {
    const company = (user.company_name || '').trim();
    return name.length > 0 || company.length > 0;
  }
  return name.length > 0;
}
