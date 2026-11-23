import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '../lib/api';
import { useSession } from '../lib/session';

export function RequireAuth({ children, role }: { children: ReactNode; role?: Role }) {
  const { user } = useSession();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <p className="alert alert-error">You need the {role} role to see this page.</p>;
  return <>{children}</>;
}
