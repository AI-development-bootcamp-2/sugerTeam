import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types/auth';

export function AdminIndexRedirect() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === UserRole.TEAM_LEAD) {
    return <Navigate to="/admin/task-assignments" replace />;
  }
  return <Navigate to="/admin/users" replace />;
}
