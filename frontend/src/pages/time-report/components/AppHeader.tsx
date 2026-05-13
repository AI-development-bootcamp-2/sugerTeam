interface AppHeaderProps {
  onLogout: () => void;
  onAddDay: () => void;
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

const pillBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 44,
  padding: '0 16px',
  borderRadius: 1000,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  whiteSpace: 'nowrap',
};

export default function AppHeader({ onLogout, onAddDay }: AppHeaderProps) {
  return (
    <header
      data-testid="app-header"
      dir="rtl"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 80,
        background: '#FFFFFF',
        borderBottom: '1px solid #ECECEC',
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          height: '100%',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo — RTL start (right) */}
        <span style={{ fontWeight: 800, fontSize: 28, color: '#141E3E', letterSpacing: -0.5 }}>
          abra
        </span>

        {/* Action buttons — RTL end (left) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* הפעלת שעון — placeholder, no onClick in v1 */}
          <button
            type="button"
            style={{ ...pillBase, background: '#EA7693', color: '#FFFFFF' }}
          >
            <PlayIcon />
            הפעלת שעון
          </button>

          <button
            type="button"
            onClick={onAddDay}
            style={{ ...pillBase, background: '#F09A37', color: '#FFFFFF' }}
          >
            <PlusCircleIcon />
            הוספת יום
          </button>

          {/* יציאה */}
          <button
            type="button"
            onClick={onLogout}
            style={{
              ...pillBase,
              background: 'transparent',
              color: '#212525',
              border: '1px solid #E1E7F3',
            }}
          >
            <LogoutIcon />
            יציאה
          </button>
        </div>
      </div>
    </header>
  );
}
