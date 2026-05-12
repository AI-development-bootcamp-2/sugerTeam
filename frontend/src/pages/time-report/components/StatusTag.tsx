import type { CSSProperties } from 'react';
import type { DayStatus } from '../../../types/time-report';

interface StatusTagProps {
  status: DayStatus;
  reportedMinutes?: number;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function ArrowUp() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 1 L11 9 L1 9 Z" />
    </svg>
  );
}

function ArrowDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 11 L11 3 L1 3 Z" />
    </svg>
  );
}

const base: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 12px',
  borderRadius: 1000,
  height: 28,
  fontSize: 16,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

export default function StatusTag({ status, reportedMinutes = 0 }: StatusTagProps) {
  switch (status) {
    case 'open':
      return (
        <span style={{ ...base, background: '#E3F9CA', color: '#2E7D14' }}>
          <ArrowUp />
          {formatMinutes(reportedMinutes)} ש׳
        </span>
      );
    case 'filled':
      return (
        <span style={{ ...base, background: '#E3F9CA', color: '#2E7D14' }}>
          <ArrowUp />
          {formatMinutes(reportedMinutes)} ש׳
        </span>
      );
    case 'missing':
      return (
        <span style={{ ...base, background: '#FCE3D6', color: '#E7000B' }}>
          <ArrowDown />
          חסר
        </span>
      );
    case 'weekend':
      return (
        <span style={{ ...base, background: '#DEEAFF', color: '#0C69FF' }}>
          סוף שבוע
        </span>
      );
    case 'holiday':
      return (
        <span style={{ ...base, background: '#DEEAFF', color: '#0C69FF' }}>
          חג
        </span>
      );
    case 'vacation':
      return (
        <span style={{ ...base, background: '#FFE5D0', color: '#C2630E' }}>
          חופשה
        </span>
      );
    case 'irregular':
      return (
        <span style={{ ...base, background: '#FFF3CD', color: '#B8860B' }}>
          חריג
        </span>
      );
  }
}
