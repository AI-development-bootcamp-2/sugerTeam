import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './types/auth';
import { useAuthStore } from './store/authStore';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { LoginPage } from './pages/login/LoginPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AbsencesPage } from './pages/absences/AbsencesPage';
import { AdminPage } from './pages/admin/AdminPage';
import ClientsPage from './pages/admin/clients/ClientsPage';
import UsersListPage from './pages/admin/users/UsersListPage';
import { SelectViewPage } from './pages/select-view/SelectViewPage';
import TimeReportPage from './pages/time-report/TimeReportPage';

// Post-login landing: admins/team-leads pick a view; employees go straight to time reporting.
function RoleHomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === UserRole.ADMIN || user?.role === UserRole.TEAM_LEAD) {
    return <Navigate to="/select" replace />;
  }
  return <Navigate to="/time-report" replace />;
}

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
      { path: '/dashboard', element: <RoleHomeRedirect /> },
      { path: '/time-report', element: <TimeReportPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/absences', element: <AbsencesPage /> },
      { path: '/dashboard/home', element: <DashboardPage /> },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.TEAM_LEAD]} />,
    children: [
      { path: '/select', element: <SelectViewPage /> },
      {
        path: '/admin',
        element: <AdminPage />,
        children: [
          { index: true, element: <Navigate to="/admin/clients" replace /> },
          { path: 'users', element: <UsersListPage /> },
          { path: 'clients', element: <ClientsPage /> },
        ],
      },
    ],
  },
]);

export default router;
