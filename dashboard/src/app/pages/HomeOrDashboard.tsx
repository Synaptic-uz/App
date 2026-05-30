import { lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import RouteFallback from '../components/RouteFallback';

const Dashboard = lazy(() => import('./Dashboard'));
const Home = lazy(() => import('./Home'));

export default function HomeOrDashboard() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <RouteFallback />;

  return (
    <Suspense fallback={<RouteFallback />}>
      {isAuthenticated ? <Dashboard /> : <Home />}
    </Suspense>
  );
}
