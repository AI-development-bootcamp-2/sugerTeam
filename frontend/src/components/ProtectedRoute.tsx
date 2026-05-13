import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../services/api';
import type { User, UserRole } from '../types/auth';

interface AuthRefreshResponse {
  accessToken: string;
  user: User;
}

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [bootstrapping, setBootstrapping] = useState(
    () => useAuthStore.getState().accessToken === null
  );

  useEffect(() => {
    const currentToken = useAuthStore.getState().accessToken;
    if (currentToken !== null) {
      return;
    }

    let active = true;

    apiClient
      .post<AuthRefreshResponse>('/api/v1/auth/refresh')
      .then(({ data }) => {
        if (active) {
          setAuth(data.user, data.accessToken);
        }
      })
      .catch(() => {
        // silent — redirect to /login handled in render when accessToken is null
      })
      .finally(() => {
        if (active) {
          setBootstrapping(false);
        }
      });

    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (bootstrapping) {
    return null;
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
