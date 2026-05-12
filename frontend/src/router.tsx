import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from './types/auth';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { LoginPage } from './pages/login/LoginPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AbsencesPage } from './pages/absences/AbsencesPage';
import { AdminPage } from './pages/admin/AdminPage';
import ClientsPage from './pages/admin/clients/ClientsPage';
import UsersListPage from './pages/admin/users/UsersListPage';

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
    children: [
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
