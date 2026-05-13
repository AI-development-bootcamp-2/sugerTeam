import type { ReactNode } from 'react';
import type { TimerState } from '../../../types/time-report';
import { formatElapsed } from '../utils/timeUtils';

interface AppHeaderProps {
  onLogout: () => void;
  onAddDay: () => void;
  timerState: TimerState;
  onTimerClick: () => void;
  isTimerLoading?: boolean;
  centerSlot?: ReactNode;
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

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
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

const LONG_RUNNING_THRESHOLD = 8 * 3600; // 28 800 s

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

export default function AppHeader({
  onLogout,
  onAddDay,
  timerState,
  onTimerClick,
  isTimerLoading = false,
  centerSlot,
}: AppHeaderProps) {
  const { isRunning, elapsedSeconds } = timerState;
  const isLongRunning = isRunning && elapsedSeconds >= LONG_RUNNING_THRESHOLD;
  const buttonLabel   = isRunning ? formatElapsed(elapsedSeconds) : 'הפעלת שעון';

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
          position: 'relative',
          maxWidth: 1120,
          margin: '0 auto',
          height: '100%',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <img
          src="/abra-logo-black.png"
          alt="Abra"
          style={{ height: 36, width: 'auto', objectFit: 'contain' }}
        />

        {centerSlot && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto',
            }}
          >
            {centerSlot}
          </div>
        )}

        {/* Action buttons — RTL end (left) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          {/* Timer button */}
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              type="button"
              onClick={onTimerClick}
              disabled={isTimerLoading}
              title={isLongRunning ? 'השעון פועל מעל 8 שעות — שכחת לעצור?' : undefined}
              style={{
                ...pillBase,
                background: isRunning ? '#E7000B' : '#EA7693',
                color: '#FFFFFF',
                opacity: isTimerLoading ? 0.6 : 1,
                cursor: isTimerLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isRunning ? <StopIcon /> : <PlayIcon />}
              {buttonLabel}
            </button>
            {isLongRunning && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#FF9500',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                !
              </span>
            )}
          </span>

          <button
            type="button"
            onClick={onAddDay}
            style={{ ...pillBase, background: '#F09A37', color: '#FFFFFF' }}
          >
            <PlusCircleIcon />
            דיווח ידני
          </button>

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
