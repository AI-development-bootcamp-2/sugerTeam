import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/auth';

const ROLE_LABELS: Record<UserRole, string> = {
  EMPLOYEE: 'עובד',
  TEAM_LEAD: 'ראש צוות',
  ADMIN: 'מנהל',
};


interface NavItemDef {
  to: string;
  label: string;
  adminOnly?: boolean;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItemDef[] = [
  {
    to: '/admin/users',
    label: 'ניהול משתמשים',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
  {
    to: '/admin/clients',
    label: 'ניהול לקוחות',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/admin/projects',
    label: 'ניהול פרויקטים',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/admin/tasks',
    label: 'ניהול משימות',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    to: '/admin/months',
    label: 'נעילת חודשים',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

function NavItem({ item }: { item: NavItemDef }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-[10px] px-4 py-3.5 text-[15px] font-semibold no-underline transition-[background,color] duration-150 ${
          isActive
            ? 'bg-[#1F2A4F] text-white shadow-[-4px_0_0_0_#F09A37]'
            : 'text-white/75 hover:text-white'
        }`
      }
    >
      {item.icon}
      <span>{item.label}</span>
    </NavLink>
  );
}

export function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === UserRole.ADMIN;

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
    : '??';

  return (
    <div dir="rtl" className="grid min-h-screen grid-cols-[280px_1fr] font-sans">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen flex-col overflow-y-auto bg-[#141E3E] px-5 py-7 text-white">
        {/* Brand */}
        <div dir="ltr" className="mb-3 flex justify-center border-b border-white/[0.06] pb-7">
          <img src="/abra-logo.png" alt="Abra" className="h-7 w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        <div className="flex-1" />

        {/* User card */}
        {user && (
          <div className="flex items-center gap-3 border-t border-white/[0.08] px-2 pb-1 pt-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F09A37] to-[#EA7693] text-sm font-bold text-white">
              {initials}
            </div>
            <div>
              <div className="text-[15px] font-bold leading-tight text-white">
                {user.fullName}
              </div>
              <div className="text-[13px] leading-snug text-white/60">
                {ROLE_LABELS[user.role]}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="min-h-screen overflow-y-auto bg-[#F2F2F7]">
        <Outlet />
      </main>
    </div>
  );
}
