import type { ReactNode } from 'react';
import type { DayEntry } from '../../../types/time-report';
import StatusTag from './StatusTag';
import DaySegment from './DaySegment';

interface DayCardProps {
  dayEntry: DayEntry;
  isExpanded: boolean;
  onToggle: () => void;
  isLocked: boolean;
  // Future injection point: inline report/absence form replaces the הוספת דיווח placeholder.
  actionSlot?: ReactNode;
}

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatDate(dateStr: string, dayOfWeek: number): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year.slice(2)}, ${HEBREW_DAYS[dayOfWeek]}`;
}

function BriefcaseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0C69FF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#848891"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.25s ease',
        flexShrink: 0,
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function DayCard({ dayEntry, isExpanded, onToggle, isLocked, actionSlot }: DayCardProps) {
  // T023: today's card is always interactive so an empty-day placeholder renders.
  const isInteractive = dayEntry.entries.length > 0 || dayEntry.isToday;
  const showBody = isExpanded && (dayEntry.entries.length > 0 || dayEntry.isToday);

  return (
    <div>
      {/* ── Header (T018) ─────────────────────────────────────────────────── */}
      <div
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? onToggle : undefined}
        onKeyDown={
          isInteractive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') onToggle();
              }
            : undefined
        }
        style={{
          height: 72,
          background: '#FFFFFF',
          border: '1px solid #ECECEC',
          borderRadius: showBody ? '12px 12px 0 0' : 12,
          display: 'flex',
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 16px',
          cursor: isInteractive ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        {/* Right group — RTL start (briefcase + date) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: '#F0F4FA',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BriefcaseIcon />
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#212525' }}>
            {formatDate(dayEntry.date, dayEntry.dayOfWeek)}
          </span>
        </div>

        {/* Left group — RTL end (StatusTag + chevron) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {dayEntry.displayStatus && (
            <StatusTag
              status={dayEntry.displayStatus}
              reportedMinutes={dayEntry.reportedMinutes}
            />
          )}
          {isInteractive && <ChevronIcon expanded={isExpanded} />}
        </div>
      </div>

      {/* ── Body (T020) — max-height slide animation ──────────────────────── */}
      <div
        style={{
          maxHeight: showBody ? 800 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
          background: '#FFFFFF',
          border: showBody ? '1px solid #ECECEC' : 'none',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
        }}
      >
        {/* ── T023: empty state ──────────────────────────────────────────── */}
        {dayEntry.entries.length === 0 && (
          <p
            style={{
              margin: 0,
              padding: '24px 16px',
              fontSize: 16,
              color: '#848891',
              textAlign: 'center',
            }}
          >
            לא נמצאו דיווחים ליום זה
          </p>
        )}

        {/* ── T022: segment list ──────────────────────────────────────────── */}
        {dayEntry.entries.map((entry, i) => (
          <DaySegment
            key={entry.id}
            entry={entry}
            isLocked={isLocked}
            isLast={i === dayEntry.entries.length - 1}
          />
        ))}

        {/* ── T022: add-report placeholder — hidden when locked ────────────── */}
        {!isLocked && (
          <div
            style={{
              textAlign: 'center',
              padding: '18px 0',
              color: '#0C69FF',
              fontSize: 20,
              borderTop: '1px solid #ECECEC',
              cursor: 'pointer',
            }}
          >
            הוספת דיווח +
          </div>
        )}
        {actionSlot}
      </div>
    </div>
  );
}
