import { useRef, useState } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DailyReportStatus, WorkLocation } from '../../../types/time-report';
import {
  useUpsertDayReport,
  useDropdownData,
  useMonthlyDays,
} from '../../time-report/hooks/useTimeEntries';
import { useMonthLock } from '../../time-report/hooks/useMonthLock';
import TimeEntryBlock from '../../time-report/components/TimeEntryBlock';
import type { DayReportFormValues } from '../../time-report/components/DailyReportDrawer';

// ─── Schema (identical to DailyReportDrawer) ─────────────────────────────────

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

function toMin(hhmm: string): number {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatHebrewDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  return `יום ${HEBREW_DAYS[d.getDay()]}, ${day}/${month}/${year}`;
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

// ─── Component ────────────────────────────────────────────────────────────────

interface WorkReportTabProps {
  onSwitchToAbsence: () => void;
  onClose?: () => void;
}

export function WorkReportTab({ onSwitchToAbsence, onClose }: WorkReportTabProps) {
  const date = todayIso();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const daysQuery = useMonthlyDays(year, month);
  const lockQuery = useMonthLock(year, month);
  const { data: dropdownData } = useDropdownData();
  const upsert = useUpsertDayReport();

  const existingReport = daysQuery.data?.days.find((d) => d.reportDate === date) ?? null;
  const isMonthLocked = lockQuery.data?.isLocked ?? false;
  const isReadOnly = isMonthLocked || existingReport?.status === DailyReportStatus.SUBMITTED;

  const pendingStatusRef = useRef<DailyReportStatus>(DailyReportStatus.DRAFT);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const methods = useForm<DayReportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dayStartTime: existingReport?.startTime ?? '08:00',
      dayEndTime:   existingReport?.endTime ?? '17:00',
      entries: existingReport?.entries && existingReport.entries.length > 0
        ? existingReport.entries.map((e) => ({
            workLocation: e.workLocation as 'OFFICE' | 'CLIENT' | 'HOME',
            clientId:     e.clientId,
            projectId:    e.projectId,
            taskId:       e.taskId,
            startTime:    e.startTime,
            endTime:      e.endTime,
            description:  e.description ?? '',
          }))
        : [blankEntry('08:00', '17:00')],
    },
  });

  const { control, handleSubmit, formState: { isSubmitting, errors } } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });

  async function onSubmit(values: DayReportFormValues) {
    await upsert.mutateAsync({
      reportDate: date,
      startTime:  values.dayStartTime,
      endTime:    values.dayEndTime,
      status:     pendingStatusRef.current,
      entries:    values.entries.map((e) => ({
        workLocation: e.workLocation as WorkLocation,
        clientId:     e.clientId,
        projectId:    e.projectId,
        taskId:       e.taskId,
        startTime:    e.startTime,
        endTime:      e.endTime,
        description:  e.description || undefined,
      })),
    });
    onClose?.();
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
      {/* Header */}
      <div style={{
        background: '#FFFFFF',
        padding: '0 16px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E5E7EB',
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onSwitchToAbsence}
          aria-label="חזור"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#53575B' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <span style={{ fontSize: 17, fontWeight: 700, color: '#212525' }}>
          דוח יומי — {formatHebrewDate(date)}
        </span>

        {!isReadOnly ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={saveDraft}
              disabled={isSubmitting}
              style={{
                height: 36, padding: '0 14px', borderRadius: 8,
                border: '1px solid #0C69FF', background: 'transparent',
                color: '#0C69FF', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
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
                height: 36, padding: '0 14px', borderRadius: 8,
                border: 'none', background: '#0C69FF',
                color: '#FFFFFF', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              הגש
            </button>
          </div>
        ) : (
          <div style={{ width: 80 }} />
        )}
      </div>

      {/* Read-only / error banners */}
      {isReadOnly && (
        <div style={{ background: '#FCE3D6', padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#E7000B', textAlign: 'center', flexShrink: 0 }}>
          {isMonthLocked ? 'חודש זה נעול. לא ניתן לערוך דוחות.' : 'הדוח הוגש. לעריכה פנה לאחראי צוות.'}
        </div>
      )}
      {upsert.isError && (
        <div style={{ background: '#FCE3D6', padding: '8px 16px', fontSize: 14, color: '#E7000B', textAlign: 'center', flexShrink: 0 }}>
          {getMutationErrorMessage(upsert.error)}
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ padding: '12px 18px 0', flexShrink: 0 }}>
        <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-[#eef0f5] p-[5px]">
          <button
            type="button"
            aria-selected="false"
            onClick={onSwitchToAbsence}
            className="h-[38px] rounded-[10px] bg-transparent text-sm font-semibold text-[#7a8092]"
          >
            דיווח העדרות
          </button>
          <button
            type="button"
            aria-selected="true"
            className="h-[38px] rounded-[10px] border border-[#ececf2] bg-white text-sm font-semibold text-[#1a2233] shadow-[0_1px_1px_rgba(20,30,62,.04),0_2px_8px_rgba(20,30,62,.08)]"
          >
            דיווח עבודה
          </button>
        </div>
      </div>

      {/* Date label */}
      <div className="px-[19px] pt-2 text-[13px] font-medium text-[#555a6b]" style={{ flexShrink: 0 }}>
        {formatHebrewDate(date)}
      </div>

      {/* Scrollable form body */}
      <div dir="rtl" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
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

      {/* Footer */}
      {!isReadOnly && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', background: '#FFFFFF', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => append(blankEntry('08:00', '17:00'))}
            style={{
              width: '100%', height: 44, borderRadius: 10,
              border: '1.5px dashed #0C69FF', background: 'transparent',
              color: '#0C69FF', fontSize: 16, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + הוסף רשומה
          </button>
        </div>
      )}

      {/* Submission confirmation dialog */}
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
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#FFFFFF', borderRadius: 16, padding: 24,
              width: 'min(360px, 90vw)', zIndex: 70,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              display: 'flex', flexDirection: 'column', gap: 16,
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
                style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: '#0C69FF', color: '#FFFFFF', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                הגש
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid #E5E7EB', background: 'transparent', color: '#53575B', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
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
