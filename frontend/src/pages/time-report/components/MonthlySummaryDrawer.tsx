import type { MonthlySummary } from '../../../types/time-report';
import MonthPager from './MonthPager';

interface MonthlySummaryDrawerProps {
  open: boolean;
  onClose: () => void;
  month: number;
  year: number;
  summary: MonthlySummary;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0C69FF" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PieIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

export default function MonthlySummaryDrawer({
  open,
  onClose,
  month,
  year,
  summary,
  onPrevMonth,
  onNextMonth,
}: MonthlySummaryDrawerProps) {
  const reportedHours = Math.floor(summary.reportedMinutes / 60);
  const targetHours = Math.floor(summary.standardMinutes / 60);
  const absenceHours = Math.floor(summary.absenceMinutes / 60);
  const missingHours = Math.max(
    0,
    Math.ceil((summary.standardMinutes - summary.reportedMinutes) / 60),
  );
  const hasShortfall = summary.reportedMinutes < summary.standardMinutes;
  const fillPct = Math.min(summary.completionPct, 100);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,30,62,0.5)',
            zIndex: 100,
          }}
        />
      )}

      {/* Drawer panel — always in DOM for smooth slide animation */}
      <div
        dir="rtl"
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: 'min(540px, 100vw)',
          background: '#F2F2F7',
          overflowY: 'auto',
          padding: '40px 24px',
          zIndex: 101,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* 1. Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#141E3E' }}>סיכום חודשי</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: '#212525',
            }}
          >
            ×
          </button>
        </div>

        {/* 2. MonthPager */}
        <MonthPager month={month} year={year} onPrev={onPrevMonth} onNext={onNextMonth} />

        {/* 3. Hours card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #ECECEC',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Head row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: '#F0F4FA',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClockIcon />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#212525' }}>שעות החודשיות</span>
            <span style={{ fontSize: 18, color: '#53575B' }}>{summary.completionPct}% השלמה</span>
          </div>

          {/* Progress bar — direction:rtl fills from right */}
          <div style={{ height: 8, background: '#ECECEC', borderRadius: 4, direction: 'rtl' }}>
            <div
              style={{
                height: '100%',
                background: '#2F59FF',
                borderRadius: 4,
                width: `${fillPct}%`,
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: '#848891' }}>
              <strong>{reportedHours}</strong> ש׳ דווחו
            </span>
            <span style={{ fontSize: 14, color: '#848891' }}>יעד {targetHours} ש׳</span>
          </div>

          {/* Alert row */}
          {hasShortfall && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: '#FEEBEB',
                borderRadius: 8,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#E7000B',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                !
              </span>
              <span style={{ fontSize: 14, color: '#E7000B' }}>
                חסרות לך <strong>{missingHours} שעות</strong> לפי היעד החודשי
              </span>
            </div>
          )}
        </div>

        {/* 4. Two KPI mini cards */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div
            style={{
              flex: 1,
              background: '#FFFFFF',
              border: '1px solid #ECECEC',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                background: '#FFF6DB',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 16 }}>🕐</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#212525' }}>{absenceHours}</span>
            <span style={{ fontSize: 14, color: '#848891' }}>שעות היעדרויות</span>
          </div>

          <div
            style={{
              flex: 1,
              background: '#FFFFFF',
              border: '1px solid #ECECEC',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                background: '#FCE3D6',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 16 }}>📅</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#212525' }}>
              {summary.daysMissing}
            </span>
            <span style={{ fontSize: 14, color: '#848891' }}>ימים ללא דיווח</span>
          </div>
        </div>

        {/* 5. Project breakdown card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #ECECEC',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <PieIcon />
            <span style={{ fontSize: 20, fontWeight: 700, color: '#212525' }}>
              פילוח לפי פרויקטים
            </span>
          </div>

          {summary.projectBreakdown.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#848891', fontSize: 14, padding: '16px 0' }}>
              אין נתוני פרויקטים
            </p>
          ) : (
            summary.projectBreakdown.map((row, i) => (
              <div
                key={row.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom:
                    i < summary.projectBreakdown.length - 1 ? '1px solid #ECECEC' : 'none',
                }}
              >
                <span style={{ fontSize: 18, color: '#848891' }}>
                  {Math.floor(row.minutes / 60)} ש׳
                </span>
                <span style={{ fontSize: 18, color: '#212525' }}>{row.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
