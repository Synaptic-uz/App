import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import Layout from './Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RouteFallback from './components/RouteFallback';

const HomeOrDashboard = lazy(() => import('./pages/HomeOrDashboard'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AgentAnalytics = lazy(() => import('./pages/AgentAnalytics'));
const BusinessAnalytics = lazy(() => import('./pages/BusinessAnalytics'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const Agents = lazy(() => import('./pages/Agents'));
const ChatDemo = lazy(() => import('./pages/ChatDemo'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <LazyPage>
            <HomeOrDashboard />
          </LazyPage>
        ),
      },
      {
        path: 'login',
        element: (
          <LazyPage>
            <Login />
          </LazyPage>
        ),
      },
      {
        path: 'register',
        element: (
          <LazyPage>
            <Register />
          </LazyPage>
        ),
      },
      {
        path: 'agent/analytics',
        element: (
          <LazyPage>
            <ProtectedRoute allowedRoles={['agent']}>
              <AgentAnalytics />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: 'agent/:agent_code/analytics',
        element: (
          <LazyPage>
            <ProtectedRoute allowedRoles={['agent']}>
              <AgentAnalytics />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: 'business/analytics',
        element: (
          <LazyPage>
            <ProtectedRoute allowedRoles={['business']}>
              <BusinessAnalytics />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: 'business/campaigns',
        element: (
          <LazyPage>
            <ProtectedRoute allowedRoles={['business']}>
              <Campaigns />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: 'agent/manage',
        element: (
          <LazyPage>
            <ProtectedRoute allowedRoles={['agent']}>
              <Agents />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: 'demo',
        element: (
          <LazyPage>
            <ChatDemo />
          </LazyPage>
        ),
      },
      {
        path: 'profile',
        element: (
          <LazyPage>
            <ProtectedRoute allowedRoles={['business', 'agent']}>
              <Profile />
            </ProtectedRoute>
          </LazyPage>
        ),
      },
      {
        path: '*',
        element: (
          <LazyPage>
            <NotFound />
          </LazyPage>
        ),
      },
    ],
  },
]);
