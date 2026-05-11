import { useState } from 'react';
import type { DayEntry } from '../../../types/time-report';

// ─── T009 — Expanded card state ───────────────────────────────────────────────
// expandedDate: the single card that is currently open (null = all collapsed).
// Initialized to today so the current day opens by default if present in the list.

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface DayListProps {
  dayEntries: DayEntry[];
  isLocked: boolean;
}

export default function DayList({ dayEntries, isLocked }: DayListProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(todayStr);

  function toggleExpanded(date: string) {
    setExpandedDate((current) => (current === date ? null : date));
  }

  // Phase 4 (T019) will render DayCard components here.
  void dayEntries;
  void isLocked;
  void expandedDate;
  void toggleExpanded;

  return null;
}
