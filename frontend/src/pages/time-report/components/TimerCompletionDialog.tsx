import { useEffect, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { WorkLocation } from '../../../types/time-report';
import type { StoppedTimerDto } from '../../../types/time-report';
import type { TimeEntryDto, EntryPayload } from '../../../types/timeEntries';
import { useDropdownData } from '../hooks/useTimeEntries';
import { toMin, formatTime } from '../utils/timeUtils';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  workLocation: z.nativeEnum(WorkLocation),
  clientId:     z.string().min(1, 'בחר לקוח'),
  projectId:    z.string().min(1, 'בחר פרויקט'),
  taskId:       z.string().min(1, 'בחר משימה'),
  description:  z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function elapsedLabel(startedAt: string, stoppedAt: string): string {
  const ms = new Date(stoppedAt).getTime() - new Date(startedAt).getTime();
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 15,
  fontFamily: 'inherit',
  background: '#FAFAFA',
  color: '#212525',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
const errorStyle: React.CSSProperties  = { fontSize: 13, color: '#E7000B', marginTop: 4 };

const WORK_LOCATIONS = [
  { value: WorkLocation.OFFICE, label: 'משרד' },
  { value: WorkLocation.CLIENT, label: 'לקוח' },
  { value: WorkLocation.HOME,   label: 'בית'  },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimerCompletionDialogProps {
  stoppedTimer:        StoppedTimerDto;
  existingDayEntries:  TimeEntryDto[];
  onConfirm:           (payload: EntryPayload) => void;
  onOpenFullForm:      () => void;
  onClose:             () => void;
  isSubmitting:        boolean;
  submitError:         string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimerCompletionDialog({
  stoppedTimer,
  existingDayEntries,
  onConfirm,
  onOpenFullForm,
  onClose,
  isSubmitting,
  submitError,
}: TimerCompletionDialogProps) {
  const { data: dropdownData } = useDropdownData();
  const clients = dropdownData?.clients ?? [];

  const startHHMM = formatTime(new Date(stoppedTimer.startedAt));
  const stopHHMM  = formatTime(new Date(stoppedTimer.stoppedAt));
  const dateLabel = new Date(stoppedTimer.stoppedAt).toLocaleDateString('he-IL');

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      workLocation: WorkLocation.OFFICE,
      clientId:    '',
      projectId:   '',
      taskId:      '',
      description: '',
    },
  });

  const watchedClientId  = useWatch({ control, name: 'clientId' });
  const watchedProjectId = useWatch({ control, name: 'projectId' });
  const watchedTaskId    = useWatch({ control, name: 'taskId' });

  const selectedClient   = clients.find((c) => c.id === watchedClientId);
  const availableProjects = selectedClient?.projects ?? [];
  const selectedProject  = availableProjects.find((p) => p.id === watchedProjectId);
  const availableTasks   = selectedProject?.tasks ?? [];

  // T012 — overlap check whenever taskId changes
  const [hasOverlap, setHasOverlap] = useState(false);

  useEffect(() => {
    if (!watchedTaskId) {
      setHasOverlap(false);
      return;
    }
    const newStart = toMin(startHHMM);
    const newEnd   = toMin(stopHHMM);
    const overlap = existingDayEntries
      .filter((e) => e.taskId === watchedTaskId)
      .some((e) => {
        const overlapStart = Math.max(newStart, toMin(e.startTime));
        const overlapEnd   = Math.min(newEnd,   toMin(e.endTime));
        return overlapStart < overlapEnd;
      });
    setHasOverlap(overlap);
  }, [watchedTaskId, startHHMM, stopHHMM, existingDayEntries]);

  function onSubmit(values: FormValues) {
    onConfirm({
      workLocation: values.workLocation,
      clientId:     values.clientId,
      projectId:    values.projectId,
      taskId:       values.taskId,
      startTime:    startHHMM,
      endTime:      stopHHMM,
      description:  values.description || undefined,
    });
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          background: 'rgba(20,30,62,0.55)',
          zIndex:     100,
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{
          position:     'fixed',
          top:          '50%',
          left:         '50%',
          transform:    'translate(-50%, -50%)',
          width:        'min(480px, 95vw)',
          background:   '#FFFFFF',
          borderRadius: 16,
          padding:      32,
          zIndex:       101,
          boxShadow:    '0 8px 48px rgba(0,0,0,0.18)',
          display:      'flex',
          flexDirection: 'column',
          gap:          20,
          maxHeight:    '90vh',
          overflowY:    'auto',
        }}
      >
        {/* 1 — Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#212525' }}>רישום זמן</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#848891', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* 2 — Timer summary strip */}
        <div style={{
          background: '#F2F2F7',
          borderRadius: 10,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#848891' }}>{dateLabel}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#141E3E', fontVariantNumeric: 'tabular-nums' }}>
            {elapsedLabel(stoppedTimer.startedAt, stoppedTimer.stoppedAt)}
          </span>
        </div>

        {/* 3 — Time range (read-only) */}
        <div style={{ display: 'flex', gap: 12, flexDirection: 'row-reverse' }}>
          {[
            { label: 'התחלה', value: startHHMM },
            { label: 'סיום',  value: stopHHMM  },
          ].map(({ label, value }) => (
            <div key={label} style={{ flex: 1 }}>
              <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4, textAlign: 'right' }}>{label}</label>
              <input
                type="time"
                value={value}
                readOnly
                style={{ ...inputStyle, background: '#F3F4F6', color: '#6B7280' }}
              />
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 4 — Work location */}
          <Controller
            control={control}
            name="workLocation"
            render={({ field }) => (
              <div style={{ display: 'flex', gap: 8, flexDirection: 'row-reverse' }}>
                {WORK_LOCATIONS.map(({ value, label }) => {
                  const active = field.value === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      style={{
                        flex: 1, height: 36, borderRadius: 8,
                        border:      active ? 'none' : '1px solid #E5E7EB',
                        background:  active ? '#0C69FF' : '#F9FAFB',
                        color:       active ? '#FFFFFF' : '#53575B',
                        fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          />

          {/* 5 — Client */}
          <div>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <select
                  {...field}
                  style={selectStyle}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    setValue('projectId', '');
                    setValue('taskId', '');
                  }}
                >
                  <option value="">בחר לקוח</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            />
            {errors.clientId && <p style={errorStyle}>{errors.clientId.message}</p>}
          </div>

          {/* 6 — Project */}
          <div>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <select
                  {...field}
                  disabled={!watchedClientId}
                  style={{ ...selectStyle, opacity: watchedClientId ? 1 : 0.5 }}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    setValue('taskId', '');
                  }}
                >
                  <option value="">בחר פרויקט</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            />
            {errors.projectId && <p style={errorStyle}>{errors.projectId.message}</p>}
          </div>

          {/* 7 — Task */}
          <div>
            <Controller
              control={control}
              name="taskId"
              render={({ field }) => (
                <select
                  {...field}
                  disabled={!watchedProjectId}
                  style={{ ...selectStyle, opacity: watchedProjectId ? 1 : 0.5 }}
                >
                  <option value="">בחר משימה</option>
                  {availableTasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            />
            {errors.taskId && <p style={errorStyle}>{errors.taskId.message}</p>}
          </div>

          {/* 8 — Description */}
          <Controller
            control={control}
            name="description"
            render={({ field }) => {
              const len = (field.value ?? '').length;
              return (
                <div style={{ position: 'relative' }}>
                  <textarea
                    {...field}
                    maxLength={500}
                    placeholder="תיאור עבודה (אופציונלי)..."
                    rows={3}
                    style={{
                      width: '100%', border: '1px solid #E5E7EB', borderRadius: 8,
                      padding: '8px 12px', fontSize: 15, fontFamily: 'inherit',
                      background: '#FAFAFA', color: '#212525', resize: 'vertical',
                      boxSizing: 'border-box', direction: 'rtl',
                    }}
                  />
                  <span style={{ position: 'absolute', bottom: 6, left: 10, fontSize: 12, color: '#9CA3AF' }}>
                    {len}/500
                  </span>
                </div>
              );
            }}
          />

          {/* T012 — Overlap warning */}
          {hasOverlap && (
            <div style={{
              background: '#FFF3CD', color: '#B8860B', borderRadius: 8,
              padding: '10px 16px', fontSize: 14, fontWeight: 500,
            }}>
              קיימת חפיפה עם רשומה קיימת לאותה משימה בטווח זמן זה
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div style={{ background: '#FCE3D6', color: '#E7000B', borderRadius: 8, padding: '10px 16px', fontSize: 14 }}>
              {submitError}
            </div>
          )}

          {/* 9 — Action row */}
          <div style={{ display: 'flex', gap: 10, flexDirection: 'row-reverse', paddingTop: 4 }}>
            <button
              type="submit"
              disabled={isSubmitting || hasOverlap}
              style={{
                flex: 1, height: 44, borderRadius: 10, border: 'none',
                background: '#0C69FF', color: '#FFFFFF', fontSize: 15,
                fontWeight: 600, cursor: isSubmitting || hasOverlap ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: isSubmitting || hasOverlap ? 0.6 : 1,
              }}
            >
              {isSubmitting ? 'שומר...' : 'שמור רשומה'}
            </button>

            <button
              type="button"
              onClick={onOpenFullForm}
              style={{
                flex: 1, height: 44, borderRadius: 10,
                border: '1px solid #0C69FF', background: 'transparent',
                color: '#0C69FF', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              פתח טופס מלא
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                height: 44, padding: '0 16px', borderRadius: 10,
                border: 'none', background: 'none', color: '#848891',
                fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              בטל
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
