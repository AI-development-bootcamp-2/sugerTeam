import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './types/auth';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { LoginPage } from './pages/login/LoginPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AbsencesPage } from './pages/absences/AbsencesPage';
import { AdminPage } from './pages/admin/AdminPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/absences', element: <AbsencesPage /> },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.TEAM_LEAD]} />,
    children: [{ path: '/admin/*', element: <AdminPage /> }],
  },
]);

export default router;
