import { useFormContext, useWatch, Controller } from 'react-hook-form';
import type { DropdownDataResponse } from '../../../types/timeEntries';
import type { DayReportFormValues } from './DailyReportDrawer';

interface TimeEntryBlockProps {
  index: number;
  onRemove: () => void;
  dropdownData: DropdownDataResponse;
  isReadOnly: boolean;
  isOnlyEntry: boolean;
}

const WORK_LOCATIONS = [
  { value: 'OFFICE', label: 'משרד' },
  { value: 'CLIENT', label: 'לקוח' },
  { value: 'HOME',   label: 'בית'  },
] as const;

function toMinutes(hhmm: string): number {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function formatDuration(startTime: string, endTime: string): string {
  const diff = toMinutes(endTime) - toMinutes(startTime);
  if (diff <= 0) return '—';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}:${String(m).padStart(2, '0')} ש׳`;
}

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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#E7000B',
  marginTop: 4,
};

export default function TimeEntryBlock({
  index,
  onRemove,
  dropdownData,
  isReadOnly,
  isOnlyEntry,
}: TimeEntryBlockProps) {
  const { control, setValue, formState: { errors } } = useFormContext<DayReportFormValues>();

  const watchedClientId  = useWatch({ control, name: `entries.${index}.clientId` });
  const watchedProjectId = useWatch({ control, name: `entries.${index}.projectId` });
  const watchedStart     = useWatch({ control, name: `entries.${index}.startTime` });
  const watchedEnd       = useWatch({ control, name: `entries.${index}.endTime` });

  const entryErrors = errors.entries?.[index];

  // Cascading filter helpers
  const selectedClient  = dropdownData.clients.find((c) => c.id === watchedClientId);
  const availableProjects = selectedClient?.projects ?? [];
  const selectedProject = availableProjects.find((p) => p.id === watchedProjectId);
  const availableTasks  = selectedProject?.tasks ?? [];

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
      }}
    >
      {/* ── Delete button ─────────────────────────────────────────────────── */}
      {!isReadOnly && !isOnlyEntry && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="מחק רשומה"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#848891',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      )}

      {/* ── Work location segmented control ───────────────────────────────── */}
      <Controller
        control={control}
        name={`entries.${index}.workLocation`}
        render={({ field }) => (
          <div style={{ display: 'flex', gap: 8, flexDirection: 'row-reverse' }}>
            {WORK_LOCATIONS.map(({ value, label }) => {
              const active = field.value === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => field.onChange(value)}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 8,
                    border: active ? 'none' : '1px solid #E5E7EB',
                    background: active ? '#0C69FF' : '#F9FAFB',
                    color: active ? '#FFFFFF' : '#53575B',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: isReadOnly ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      />

      {/* ── Client → Project → Task cascading dropdowns ───────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Client */}
        <div>
          <Controller
            control={control}
            name={`entries.${index}.clientId`}
            render={({ field }) => (
              <select
                {...field}
                disabled={isReadOnly}
                style={selectStyle}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setValue(`entries.${index}.projectId`, '');
                  setValue(`entries.${index}.taskId`, '');
                }}
              >
                <option value="">בחר לקוח</option>
                {dropdownData.clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          />
          {entryErrors?.clientId && (
            <p style={errorStyle}>{entryErrors.clientId.message}</p>
          )}
        </div>

        {/* Project */}
        <div>
          <Controller
            control={control}
            name={`entries.${index}.projectId`}
            render={({ field }) => (
              <select
                {...field}
                disabled={isReadOnly || !watchedClientId}
                style={{ ...selectStyle, opacity: (!watchedClientId || isReadOnly) ? 0.5 : 1 }}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setValue(`entries.${index}.taskId`, '');
                }}
              >
                <option value="">בחר פרויקט</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          />
          {entryErrors?.projectId && (
            <p style={errorStyle}>{entryErrors.projectId.message}</p>
          )}
        </div>

        {/* Task */}
        <div>
          <Controller
            control={control}
            name={`entries.${index}.taskId`}
            render={({ field }) => (
              <select
                {...field}
                disabled={isReadOnly || !watchedProjectId}
                style={{ ...selectStyle, opacity: (!watchedProjectId || isReadOnly) ? 0.5 : 1 }}
              >
                <option value="">בחר משימה</option>
                {availableTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          />
          {entryErrors?.taskId && (
            <p style={errorStyle}>{entryErrors.taskId.message}</p>
          )}
        </div>
      </div>

      {/* ── Time range + duration ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexDirection: 'row-reverse', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4, textAlign: 'right' }}>התחלה</label>
          <Controller
            control={control}
            name={`entries.${index}.startTime`}
            render={({ field }) => (
              <input type="time" {...field} disabled={isReadOnly} style={inputStyle} />
            )}
          />
          {entryErrors?.startTime && (
            <p style={errorStyle}>{entryErrors.startTime.message}</p>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4, textAlign: 'right' }}>סיום</label>
          <Controller
            control={control}
            name={`entries.${index}.endTime`}
            render={({ field }) => (
              <input type="time" {...field} disabled={isReadOnly} style={inputStyle} />
            )}
          />
          {entryErrors?.endTime && (
            <p style={errorStyle}>{entryErrors.endTime.message}</p>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4, textAlign: 'right' }}>משך</label>
          <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6', color: '#6B7280', fontWeight: 600 }}>
            {formatDuration(watchedStart ?? '', watchedEnd ?? '')}
          </div>
        </div>
      </div>

      {/* ── Description ───────────────────────────────────────────────────── */}
      <div>
        <Controller
          control={control}
          name={`entries.${index}.description`}
          render={({ field }) => {
            const len = (field.value ?? '').length;
            return (
              <div style={{ position: 'relative' }}>
                <textarea
                  {...field}
                  disabled={isReadOnly}
                  maxLength={500}
                  placeholder="תיאור עבודה..."
                  rows={3}
                  style={{
                    width: '100%',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 15,
                    fontFamily: 'inherit',
                    background: '#FAFAFA',
                    color: '#212525',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    direction: 'rtl',
                  }}
                />
                <span style={{ position: 'absolute', bottom: 6, left: 10, fontSize: 12, color: '#9CA3AF' }}>
                  {len}/500
                </span>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
