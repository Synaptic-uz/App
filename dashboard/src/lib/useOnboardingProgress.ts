import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { api } from './api';
import { useAuth } from '../app/context/AuthContext';
import { isDemoVisited, isProfileComplete } from './onboardingProgress';

export type OnboardingSnapshot = {
  loading: boolean;
  campaignCount: number;
  agentCount: number;
  profileComplete: boolean;
  demoVisited: boolean;
};

const initial: OnboardingSnapshot = {
  loading: true,
  campaignCount: 0,
  agentCount: 0,
  profileComplete: false,
  demoVisited: false,
};

/** Fresh counts + profile flags — refetch when returning to Boshqaruv (/) */
export function useOnboardingProgress() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const [snapshot, setSnapshot] = useState<OnboardingSnapshot>(initial);

  const refresh = useCallback(async () => {
    if (!user?.role) {
      setSnapshot({ ...initial, loading: false });
      return;
    }

    setSnapshot((prev) => ({ ...prev, loading: true }));

    try {
      const me = await api.me();
      updateUser(me.user);

      let campaignCount = 0;
      let agentCount = 0;

      if (user.role === 'business') {
        const camps = await api.getCampaigns();
        campaignCount = Array.isArray(camps) ? camps.length : 0;
      } else if (user.role === 'agent') {
        const agents = await api.getAgents();
        agentCount = Array.isArray(agents) ? agents.length : 0;
      }

      setSnapshot({
        loading: false,
        campaignCount,
        agentCount,
        profileComplete: isProfileComplete(me.user),
        demoVisited: isDemoVisited(),
      });
    } catch {
      setSnapshot({
        loading: false,
        campaignCount: 0,
        agentCount: 0,
        profileComplete: isProfileComplete(user),
        demoVisited: isDemoVisited(),
      });
    }
  }, [user?.role, user?.id, updateUser]);

  // Har safar Boshqaruv sahifasiga kirganda yangilash
  useEffect(() => {
    if (location.pathname === '/') {
      refresh();
    }
  }, [location.pathname, location.key, refresh]);

  // Profil maydonlari kontekstda o‘zgarganda (saqlashdan keyin)
  useEffect(() => {
    if (location.pathname !== '/') return;
    setSnapshot((prev) => ({
      ...prev,
      profileComplete: isProfileComplete(user),
      demoVisited: isDemoVisited(),
    }));
  }, [user?.display_name, user?.company_name, user?.phone, location.pathname]);

  return { ...snapshot, refresh };
}
