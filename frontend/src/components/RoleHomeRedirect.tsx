import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types/auth';

export function RoleHomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === UserRole.ADMIN || user?.role === UserRole.TEAM_LEAD) {
    return <Navigate to="/select" replace />;
  }
  return <Navigate to="/time-report" replace />;
}
