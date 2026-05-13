import { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { DayDto } from '../../../types/timeEntries';
import { DailyReportStatus, WorkLocation } from '../../../types/time-report';
import { useUpsertDayReport } from '../hooks/useTimeEntries';
import { useDropdownData } from '../hooks/useTimeEntries';
import TimeEntryBlock from './TimeEntryBlock';

// ─── Form types (exported so TimeEntryBlock can reference them) ───────────────

const WORK_LOCATIONS = ['OFFICE', 'CLIENT', 'HOME'] as const;

const entrySchema = z.object({
  workLocation: z.enum(WORK_LOCATIONS),
  clientId:     z.string().min(1, 'בחר לקוח'),
  projectId:    z.string().min(1, 'בחר פרויקט'),
  taskId:       z.string().min(1, 'בחר משימה'),
  startTime:    z.string().regex(/^\d{2}:\d{2}$/, 'שדה חובה'),
  endTime:      z.string().regex(/^\d{2}:\d{2}$/, 'שדה חובה'),
  description:  z.string().max(500),
});

const formSchema = z
  .object({
    dayStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'שדה חובה'),
    dayEndTime:   z.string().regex(/^\d{2}:\d{2}$/, 'שדה חובה'),
    entries:      z.array(entrySchema).min(1, 'נדרשת לפחות רשומה אחת'),
  })
  .superRefine((data, ctx) => {
    const dayStart = toMin(data.dayStartTime);
    const dayEnd   = toMin(data.dayEndTime);

    if (dayStart >= dayEnd) {
      ctx.addIssue({ code: 'custom', path: ['dayEndTime'], message: 'שעת סיום חייבת להיות אחרי שעת ההתחלה' });
    }

    for (let i = 0; i < data.entries.length; i++) {
      const e = data.entries[i];
      const eStart = toMin(e.startTime);
      const eEnd   = toMin(e.endTime);

      if (eStart >= eEnd) {
        ctx.addIssue({ code: 'custom', path: ['entries', i, 'endTime'], message: 'שעת סיום חייבת להיות אחרי שעת ההתחלה' });
      }
      if (eStart < dayStart) {
        ctx.addIssue({ code: 'custom', path: ['entries', i, 'startTime'], message: 'לא יכול להיות לפני תחילת יום העבודה' });
      }
      if (eEnd > dayEnd) {
        ctx.addIssue({ code: 'custom', path: ['entries', i, 'endTime'], message: 'לא יכול להיות אחרי סוף יום העבודה' });
      }
    }

    // Only block overlaps between entries that share the same task
    for (let j = 0; j < data.entries.length; j++) {
      for (let k = j + 1; k < data.entries.length; k++) {
        const a = data.entries[j];
        const b = data.entries[k];
        if (!a.taskId || !b.taskId || a.taskId !== b.taskId) continue;
        const overlapStart = Math.max(toMin(a.startTime), toMin(b.startTime));
        const overlapEnd   = Math.min(toMin(a.endTime),   toMin(b.endTime));
        if (overlapStart < overlapEnd) {
          ctx.addIssue({ code: 'custom', path: ['entries', j, 'startTime'], message: 'רשומות לאותה משימה לא יכולות להיות חופפות' });
          ctx.addIssue({ code: 'custom', path: ['entries', k, 'startTime'], message: 'רשומות לאותה משימה לא יכולות להיות חופפות' });
        }
      }
    }
  });

export type DayReportFormValues = z.infer<typeof formSchema>;
export interface InitialTimeEntryDefaults {
  startTime: string;
  endTime: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMin(hhmm: string): number {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function buildDefaultValues(
  existingReport: DayDto | null,
  initialTimeEntry?: InitialTimeEntryDefaults | null,
): DayReportFormValues {
  const initialEntry = initialTimeEntry
    ? blankEntry(initialTimeEntry.startTime, initialTimeEntry.endTime)
    : null;

  if (existingReport?.startTime && existingReport.status === DailyReportStatus.DRAFT) {
    const reportEntries = existingReport.entries.length > 0
      ? existingReport.entries.map((e) => ({
          workLocation: e.workLocation as 'OFFICE' | 'CLIENT' | 'HOME',
          clientId:     e.clientId,
          projectId:    e.projectId,
          taskId:       e.taskId,
          startTime:    e.startTime,
          endTime:      e.endTime,
          description:  e.description ?? '',
        }))
      : [];

    return {
      dayStartTime: initialTimeEntry && toMin(initialTimeEntry.startTime) < toMin(existingReport.startTime)
        ? initialTimeEntry.startTime
        : existingReport.startTime,
      dayEndTime: initialTimeEntry && toMin(initialTimeEntry.endTime) > toMin(existingReport.endTime ?? '17:00')
        ? initialTimeEntry.endTime
        : existingReport.endTime ?? '17:00',
      entries: initialEntry ? [...reportEntries, initialEntry] : reportEntries.length > 0 ? reportEntries : [blankEntry('08:00', '17:00')],
    };
  }

  if (initialTimeEntry) {
    return {
      dayStartTime: initialTimeEntry.startTime,
      dayEndTime:   initialTimeEntry.endTime,
      entries: [initialEntry ?? blankEntry(initialTimeEntry.startTime, initialTimeEntry.endTime)],
    };
  }

  return {
    dayStartTime: '08:00',
    dayEndTime:   '17:00',
    entries: [blankEntry('08:00', '17:00')],
  };
}

function blankEntry(start: string, end: string) {
  return { workLocation: 'OFFICE' as const, clientId: '', projectId: '', taskId: '', startTime: start, endTime: end, description: '' };
}

function getMutationErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 423) return 'חודש זה נעול. לא ניתן לשמור דוחות.';
  if (status === 409) return 'הדוח כבר הוגש. פנה לאחראי לעריכה.';
  if (status === 400) return 'נתוני הדוח אינם תקינים. בדוק שכל השדות מולאו כראוי.';
  if (status === 401) return 'פג תוקף ההתחברות. רענן את הדף והתחבר מחדש.';
  return 'שגיאה בשמירת הדוח. נסה שנית.';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DailyReportDrawerProps {
  date:           string;
  isOpen:         boolean;
  onClose:        () => void;
  existingReport: DayDto | null;
  isMonthLocked:  boolean;
  initialTimeEntry?: InitialTimeEntryDefaults | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyReportDrawer({
  date,
  isOpen,
  onClose,
  existingReport,
  isMonthLocked,
  initialTimeEntry = null,
}: DailyReportDrawerProps) {
  const isReadOnly = isMonthLocked;

  const { data: dropdownData } = useDropdownData();
  const upsert = useUpsertDayReport();

  const pendingStatusRef = useRef<DailyReportStatus>(DailyReportStatus.DRAFT);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const methods = useForm<DayReportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(existingReport, initialTimeEntry),
  });

  const { control, handleSubmit, reset, formState: { isDirty, isSubmitting, errors } } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });

  // Reset form when the drawer opens for a new date
  useEffect(() => {
    if (isOpen) {
      reset(buildDefaultValues(existingReport, initialTimeEntry));
    }
  }, [isOpen, date, initialTimeEntry]); // eslint-disable-line react-hooks/exhaustive-deps

  function guardedClose() {
    if (isDirty && !window.confirm('יש שינויים שלא נשמרו. לצאת בכל זאת?')) return;
    onClose();
  }

  async function onSubmit(values: DayReportFormValues) {
    await upsert.mutateAsync({
      reportDate:  date,
      startTime:   values.dayStartTime,
      endTime:     values.dayEndTime,
      status:      pendingStatusRef.current,
      entries:     values.entries.map((e) => ({
        workLocation: e.workLocation as WorkLocation,
        clientId:     e.clientId,
        projectId:    e.projectId,
        taskId:       e.taskId,
        startTime:    e.startTime,
        endTime:      e.endTime,
        description:  e.description || undefined,
      })),
    });
    onClose();
  }

  function saveDraft() {
    pendingStatusRef.current = DailyReportStatus.DRAFT;
    void handleSubmit(onSubmit)();
  }

  function submitReport() {
    setShowConfirmDialog(true);
  }

  function handleConfirmSubmit() {
    setShowConfirmDialog(false);
    pendingStatusRef.current = DailyReportStatus.SUBMITTED;
    void handleSubmit(onSubmit)();
  }

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        onClick={guardedClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 40,
          transition: 'opacity 0.25s',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* ── Drawer panel ──────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        dir="rtl"
        style={{
          position:   'fixed',
          top:        0,
          left:       0,
          height:     '100vh',
          width:      'min(480px, 100vw)',
          background: '#F2F2F7',
          zIndex:     50,
          display:    'flex',
          flexDirection: 'column',
          transform:  isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          boxShadow:  '4px 0 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* ── Sticky header ──────────────────────────────────────────────── */}
        <div
          style={{
            background:  '#FFFFFF',
            padding:     '0 16px',
            height:      64,
            display:     'flex',
            alignItems:  'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #E5E7EB',
            flexShrink:  0,
          }}
        >
          {/* Back arrow */}
          <button
            type="button"
            onClick={guardedClose}
            aria-label="חזור"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#53575B' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Title */}
          <span style={{ fontSize: 17, fontWeight: 700, color: '#212525' }}>
            דיווח ידני
          </span>

          {/* Action buttons */}
          {!isReadOnly && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={saveDraft}
                disabled={isSubmitting}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1px solid #0C69FF',
                  background: 'transparent',
                  color: '#0C69FF',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  opacity: isSubmitting ? 0.6 : 1,
                }}
              >
                שמור טיוטה
              </button>
              <button
                type="button"
                onClick={submitReport}
                disabled={isSubmitting}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#0C69FF',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  opacity: isSubmitting ? 0.6 : 1,
                }}
              >
                הגש
              </button>
            </div>
          )}
          {isReadOnly && <div style={{ width: 80 }} />}
        </div>

        {/* ── Read-only banner ────────────────────────────────────────────── */}
        {isReadOnly && (
          <div style={{ background: '#FCE3D6', padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#E7000B', textAlign: 'center', flexShrink: 0 }}>
            חודש זה נעול. לא ניתן לערוך דוחות.
          </div>
        )}

        {/* ── Mutation error (TR-016) ─────────────────────────────────────── */}
        {upsert.isError && (
          <div style={{ background: '#FCE3D6', padding: '8px 16px', fontSize: 14, color: '#E7000B', textAlign: 'center', flexShrink: 0 }}>
            {getMutationErrorMessage(upsert.error)}
          </div>
        )}

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Day-level time range */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 16, display: 'flex', gap: 12, flexDirection: 'row-reverse' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4, textAlign: 'right' }}>תחילת יום</label>
              <input
                type="time"
                {...methods.register('dayStartTime')}
                disabled={isReadOnly}
                style={{ width: '100%', height: 40, border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 15, fontFamily: 'inherit', background: '#FAFAFA', boxSizing: 'border-box' }}
              />
              {errors.dayStartTime && (
                <p style={{ fontSize: 13, color: '#E7000B', marginTop: 4 }}>{errors.dayStartTime.message}</p>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4, textAlign: 'right' }}>סוף יום</label>
              <input
                type="time"
                {...methods.register('dayEndTime')}
                disabled={isReadOnly}
                style={{ width: '100%', height: 40, border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 15, fontFamily: 'inherit', background: '#FAFAFA', boxSizing: 'border-box' }}
              />
              {errors.dayEndTime && (
                <p style={{ fontSize: 13, color: '#E7000B', marginTop: 4 }}>{errors.dayEndTime.message}</p>
              )}
            </div>
          </div>

          {/* Entry blocks */}
          <FormProvider {...methods}>
            {fields.map((field, index) => (
              <TimeEntryBlock
                key={field.id}
                index={index}
                onRemove={() => remove(index)}
                dropdownData={dropdownData ?? { clients: [] }}
                isReadOnly={isReadOnly}
                isOnlyEntry={fields.length === 1}
              />
            ))}
          </FormProvider>
        </div>

        {/* ── Sticky footer ───────────────────────────────────────────────── */}
        {!isReadOnly && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #E5E7EB',
              background: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => append(blankEntry('08:00', '17:00'))}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 10,
                border: '1.5px dashed #0C69FF',
                background: 'transparent',
                color: '#0C69FF',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              + הוסף רשומה
            </button>
          </div>
        )}
      </div>

      {/* ── TR-015: Submission confirmation dialog ────────────────────────── */}
      {showConfirmDialog && (
        <>
          <div
            onClick={() => setShowConfirmDialog(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
          />
          <div
            role="dialog"
            aria-modal="true"
            dir="rtl"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              width: 'min(360px, 90vw)',
              zIndex: 70,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#212525', textAlign: 'right' }}>
              הגשת דוח יומי
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: '#53575B', lineHeight: 1.6, textAlign: 'right' }}>
              לאחר ההגשה לא ניתן יהיה לערוך את הדוח ללא אישור מנהל. להמשיך?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start', flexDirection: 'row-reverse' }}>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  border: 'none',
                  background: '#0C69FF',
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                הגש
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  background: 'transparent',
                  color: '#53575B',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                בטל
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
