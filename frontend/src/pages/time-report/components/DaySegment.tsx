import type { TimeReportEntryDto } from '../../../types/time-report';

interface DaySegmentProps {
  entry: TimeReportEntryDto;
  isLocked: boolean;
  isLast: boolean;
}

function PencilIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')} ש׳`;
}

export default function DaySegment({ entry, isLocked, isLast }: DaySegmentProps) {
  return (
    <div
      style={{
        padding: '16px 16px',
        borderBottom: isLast ? 'none' : '1px solid #ECECEC',
      }}
    >
      {/* ── Segment header row: edit (RTL start/right) | time range (RTL end/left) ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        {/* RTL start (right): Edit link — hidden when locked */}
        {!isLocked && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#0C69FF',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            <PencilIcon />
            עריכה
          </span>
        )}

        {/* RTL end (left): time range */}
        <span style={{ color: '#0C69FF', fontSize: 20, fontWeight: 700 }}>
          {entry.startTime}–{entry.endTime}
        </span>
      </div>

      {/* ── Project/task row: task name (RTL start/right) | duration (RTL end/left) ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 20, color: '#212525' }}>{entry.taskName}</span>
        <span style={{ fontSize: 20, color: '#848891' }}>
          {formatDuration(entry.durationMinutes)}
        </span>
      </div>
    </div>
  );
}
