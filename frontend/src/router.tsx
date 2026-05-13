import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleHomeRedirect } from './components/RoleHomeRedirect';
import { UserRole } from './types/auth';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { LoginPage } from './pages/login/LoginPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AbsencesPage } from './pages/absences/AbsencesPage';
import { AdminPage } from './pages/admin/AdminPage';
import ClientsPage from './pages/admin/clients/ClientsPage';
import UsersListPage from './pages/admin/users/UsersListPage';
import ProjectsPage from './pages/admin/projects/ProjectsPage';
import TasksPage from './pages/admin/tasks/TasksPage';
import MonthClosurePage from './pages/admin/months/MonthClosurePage';
import TaskAssignmentPage from './pages/admin/taskAssignments/TaskAssignmentPage';
import { SelectViewPage } from './pages/select-view/SelectViewPage';
import TimeReportPage from './pages/time-report/TimeReportPage';

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
          { index: true, element: <Navigate to="/admin/users" replace /> },
          { path: 'users', element: <UsersListPage /> },
          { path: 'clients', element: <ClientsPage /> },
          { path: 'projects', element: <ProjectsPage /> },
          { path: 'tasks', element: <TasksPage /> },
          { path: 'task-assignments', element: <TaskAssignmentPage /> },
          { path: 'months', element: <MonthClosurePage /> },
        ],
      },
    ],
  },
]);

export default router;
