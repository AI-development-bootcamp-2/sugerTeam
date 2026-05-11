interface KpiStripProps {
  reportedMinutes: number;
  standardMinutes: number;
  completionPct: number;
  isLoading: boolean;
  onOpen: () => void;
}

interface KpiCellProps {
  value: React.ReactNode;
  label: string;
}

function KpiCell({ value, label }: KpiCellProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 24px',
        borderLeft: '1px solid #E1E7F3',
        gap: 4,
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 700, color: '#212525' }}>{value}</span>
      <span style={{ fontSize: 18, fontWeight: 500, color: '#53575B' }}>{label}</span>
    </div>
  );
}

function Placeholder() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 80,
        height: 22,
        background: '#ECECEC',
        borderRadius: 4,
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

function ChevronSummary() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Points left — in RTL this reads as "open" indicator */}
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function KpiStrip({
  reportedMinutes,
  standardMinutes,
  completionPct,
  isLoading,
  onOpen,
}: KpiStripProps) {
  const reportedHours = Math.floor(reportedMinutes / 60);
  const targetHours = Math.floor(standardMinutes / 60);

  return (
    <div
      dir="rtl"
      onClick={isLoading ? undefined : onOpen}
      style={{
        display: 'flex',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        background: '#FFFFFF',
        borderRadius: 12,
        padding: '16px 24px',
        cursor: isLoading ? 'default' : 'pointer',
        pointerEvents: isLoading ? 'none' : 'auto',
        gap: 0,
      }}
    >
      {/* Summary label — RTL start (rightmost) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: 24,
          color: '#0C69FF',
          fontSize: 20,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        סיכום חודשי
        <ChevronSummary />
      </div>

      {/* Data cells — separated by left borders */}
      <KpiCell
        value={isLoading ? <Placeholder /> : `${reportedHours} ש׳`}
        label="דווחו עד כה"
      />
      <KpiCell
        value={isLoading ? <Placeholder /> : `${targetHours} ש׳`}
        label="יעד לחודש"
      />
      <KpiCell
        value={isLoading ? <Placeholder /> : `${completionPct}%`}
        label="השלמה"
      />
    </div>
  );
}
