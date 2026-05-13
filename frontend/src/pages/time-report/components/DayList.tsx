import { useState } from 'react';
import type { DayEntry } from '../../../types/time-report';
import DayCard from './DayCard';

interface DayListProps {
  dayEntries: DayEntry[];
  isLocked: boolean;
  onOpenReport?: (date: string) => void;
  onEditAbsence?: (date: string) => void;
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DayList({ dayEntries, isLocked, onOpenReport, onEditAbsence }: DayListProps) {
  // T009 — single-expand: null = all collapsed; a date string = that card is open.
  // Initialised to today so the current day's card opens by default.
  const [expandedDate, setExpandedDate] = useState<string | null>(todayStr);

  function toggleExpanded(date: string) {
    setExpandedDate((current) => (current === date ? null : date));
  }

  if (dayEntries.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {dayEntries.map((entry) => (
        <DayCard
          key={entry.date}
          dayEntry={entry}
          isExpanded={expandedDate === entry.date}
          onToggle={() => toggleExpanded(entry.date)}
          isLocked={isLocked}
          onOpenReport={onOpenReport ? () => onOpenReport(entry.date) : undefined}
          onEditAbsence={onEditAbsence ? () => onEditAbsence(entry.date) : undefined}
        />
      ))}
    </div>
  );
}
