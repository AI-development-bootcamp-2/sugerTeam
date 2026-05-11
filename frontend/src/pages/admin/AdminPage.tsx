import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import ClientsPage from './clients/ClientsPage';
import ProjectsPage from './projects/ProjectsPage';
import TasksPage from './tasks/TasksPage';

const navItems = [
  { to: 'clients', label: 'לקוחות' },
  { to: 'projects', label: 'פרויקטים' },
  { to: 'tasks', label: 'משימות' },
];

export function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <span className="font-semibold text-gray-700">ניהול</span>
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <Routes>
        <Route index element={<Navigate to="clients" replace />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="tasks" element={<TasksPage />} />
      </Routes>
    </div>
  );
}
