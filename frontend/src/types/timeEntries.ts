// API shapes for /api/v1/time-entries — keep in sync with the backend schema.
// All dates are ISO strings (YYYY-MM-DD), all times are HH:MM strings.

import type { WorkLocation, DailyReportStatus, CalendarDayType } from './time-report';

// ─── GET /time-entries?year=&month= ──────────────────────────────────────────

export interface TimeEntryDto {
  id: string;
  workLocation: WorkLocation;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  taskId: string;
  taskName: string;
  startTime: string;        // HH:MM
  endTime: string;          // HH:MM
  durationMinutes: number;
  description: string | null;
}

export interface DayDto {
  reportDate: string;               // YYYY-MM-DD
  dayType: CalendarDayType;
  isWorkingDay: boolean;
  dailyReportId: string | null;
  status: DailyReportStatus | null;
  startTime: string | null;         // HH:MM
  endTime: string | null;           // HH:MM
  entries: TimeEntryDto[];
}

export interface MonthlyDaysResponse {
  days: DayDto[];
}

// ─── GET /time-entries/dropdown-data ─────────────────────────────────────────

export interface TaskOption {
  id: string;
  name: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  tasks: TaskOption[];
}

export interface ClientOption {
  id: string;
  name: string;
  projects: ProjectOption[];
}

export interface DropdownDataResponse {
  clients: ClientOption[];
}

// ─── GET /time-entries/monthly-summary ───────────────────────────────────────

export interface MonthlySummaryResponse {
  totalReportedMinutes: number;
  expectedWorkingMinutes: number;
  submittedDays: number;
  draftDays: number;
  missingDays: number;
  absenceDays: number;
}

// ─── POST / PUT /time-entries payload ────────────────────────────────────────

export interface EntryPayload {
  workLocation: WorkLocation;
  clientId: string;
  projectId: string;
  taskId: string;
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  description?: string;
}

export interface DayReportPayload {
  reportDate: string;  // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  status: DailyReportStatus;
  entries: EntryPayload[];
}
