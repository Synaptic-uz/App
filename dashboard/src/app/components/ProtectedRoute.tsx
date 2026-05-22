import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { uz } from '../../lib/uz';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: ('business' | 'agent')[];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-black/60">
        {uz.common.loading}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
