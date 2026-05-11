import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types/auth';

const ROLE_LABELS: Record<UserRole, string> = {
  EMPLOYEE: 'עובד',
  TEAM_LEAD: 'ראש צוות',
  ADMIN: 'מנהל',
};

function AbraLogoMark() {
  return (
    <svg viewBox="0 0 78 54" style={{ width: 64, height: 44, flexShrink: 0 }} aria-hidden="true">
      <rect x="2" y="33" width="19" height="19" rx="6" transform="rotate(45 11.5 42.5)" fill="#F09A37" />
      <circle cx="22.5" cy="27.5" r="9.5" fill="#F09A37" />
      <rect x="28.5" y="3.5" width="19" height="19" transform="rotate(45 38 13)" fill="#F09A37" />
      <rect x="42" y="18" width="19" height="19" rx="4" fill="#EA7693" />
      <rect x="59" y="33" width="19" height="19" rx="6" transform="rotate(-45 68.5 42.5)" fill="#F09A37" />
    </svg>
  );
}

interface NavItemDef {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItemDef[] = [
  {
    to: '/admin/clients',
    label: 'ניהול לקוחות/פרויקטים',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/admin/users',
    label: 'ניהול משתמשים',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
];

function NavItem({ item }: { item: NavItemDef }) {
  return (
    <NavLink
      to={item.to}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 10,
        fontSize: 15,
        fontWeight: 600,
        color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
        background: isActive ? '#1F2A4F' : 'transparent',
        textDecoration: 'none',
        transition: 'background .15s ease, color .15s ease',
        boxShadow: isActive ? '-4px 0 0 0 #F09A37' : 'none',
      })}
    >
      {item.icon}
      <span>{item.label}</span>
    </NavLink>
  );
}

export function AdminPage() {
  const user = useAuthStore((state) => state.user);

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
    : '??';

  return (
    <div
      dir="rtl"
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        minHeight: '100vh',
        fontFamily: '"Assistant", -apple-system, "Segoe UI", system-ui, sans-serif',
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          background: '#141E3E',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px 20px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            direction: 'ltr',
            paddingBottom: 28,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 12,
          }}
        >
          <AbraLogoMark />
          <span
            style={{
              fontWeight: 800,
              fontSize: 38,
              color: '#fff',
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            abra
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* User card */}
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 8px 4px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F09A37, #EA7693)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#fff',
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', lineHeight: 1.2 }}>
                {user.fullName}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                {ROLE_LABELS[user.role]}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <main style={{ background: '#F2F2F7', minHeight: '100vh', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
