import type { DayEntry, MonthlySummary } from '../../../types/time-report';
import { AbsenceType } from '../../../types/time-report';

interface KpiStripProps {
  monthlySummary: MonthlySummary;
  dayEntries: DayEntry[];
  isLoading: boolean;
  onOpen: () => void;
}

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

function Placeholder() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 60,
        height: 28,
        background: '#ECECEC',
        borderRadius: 4,
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

function KpiCard({ title, value, subtitle, icon, iconBg, iconColor }: KpiCardProps) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: '#FFFFFF',
        border: '1px solid #E1E7F3',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#53575B',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
        <span
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: iconBg,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: '#212525', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA0A6' }}>{subtitle}</div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MedicalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M12 11v6" />
      <path d="M9 14h6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return String(hours);
  return hours.toFixed(1);
}

export default function KpiStrip({
  monthlySummary,
  dayEntries,
  isLoading,
  onOpen,
}: KpiStripProps) {
  let vacationDays = 0;
  let sickDays = 0;
  const projectIds = new Set<string>();
  for (const day of dayEntries) {
    if (day.absenceType === AbsenceType.VACATION) vacationDays++;
    if (day.absenceType === AbsenceType.SICK_LEAVE) sickDays++;
    for (const entry of day.entries) {
      if (entry.projectId) projectIds.add(entry.projectId);
    }
  }

  const reportedLabel = formatHours(monthlySummary.reportedMinutes);
  const targetLabel = String(Math.round(monthlySummary.standardMinutes / 60));

  return (
    <div
      dir="rtl"
      onClick={isLoading ? undefined : onOpen}
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 12,
        cursor: isLoading ? 'default' : 'pointer',
        pointerEvents: isLoading ? 'none' : 'auto',
      }}
    >
      <KpiCard
        title="שעות חודשיות"
        value={isLoading ? <Placeholder /> : reportedLabel}
        subtitle={isLoading ? '' : `מתוך ${targetLabel}`}
        icon={<ClockIcon />}
        iconBg="#E8F1FF"
        iconColor="#0C69FF"
      />
      <KpiCard
        title="ימי חופשה"
        value={isLoading ? <Placeholder /> : vacationDays}
        subtitle="נוצלו החודש"
        icon={<SunIcon />}
        iconBg="#FFF4E0"
        iconColor="#F2A100"
      />
      <KpiCard
        title="ימי מחלה"
        value={isLoading ? <Placeholder /> : sickDays}
        subtitle="נוצלו החודש"
        icon={<MedicalIcon />}
        iconBg="#FFEAEC"
        iconColor="#E84F5F"
      />
      <KpiCard
        title="דיווחים חסרים"
        value={isLoading ? <Placeholder /> : monthlySummary.daysMissing}
        subtitle="דיווחים שצריך לתת מענה"
        icon={<AlertCircleIcon />}
        iconBg="#FFEBED"
        iconColor="#E84F5F"
      />
      <KpiCard
        title="פרויקטים מדווחים"
        value={isLoading ? <Placeholder /> : projectIds.size}
        subtitle="פרויקטים מדווחים החודש"
        icon={<BriefcaseIcon />}
        iconBg="#E9F8EF"
        iconColor="#1FA565"
      />
    </div>
  );
}
