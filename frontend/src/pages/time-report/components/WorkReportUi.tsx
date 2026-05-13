/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import type { Control, FieldErrors, FieldValues, Path, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { DropdownDataResponse } from '../../../types/timeEntries';

export const WORK_LOCATION_OPTIONS = [
  { value: 'OFFICE', label: 'משרד' },
  { value: 'CLIENT', label: 'לקוח' },
  { value: 'HOME', label: 'בית' },
] as const;

export const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 54,
  border: '1px solid #ECECF2',
  borderRadius: 14,
  padding: '0 12px',
  fontSize: 15,
  fontWeight: 600,
  fontFamily: 'inherit',
  background: '#FFFFFF',
  color: '#1A2233',
  boxSizing: 'border-box',
  boxShadow: '0 1px 2px rgba(20,30,62,.04), 0 6px 22px rgba(20,30,62,.05)',
};

export const errorStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#E7000B',
  marginTop: 4,
};

export function DayTimeRangeFields<T extends FieldValues>({
  register,
  errors,
  disabled,
}: {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  disabled: boolean;
}) {
  const startError = errors.dayStartTime as { message?: unknown } | undefined;
  const endError = errors.dayEndTime as { message?: unknown } | undefined;

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 16, display: 'flex', gap: 12, flexDirection: 'row-reverse' }}>
      <div style={{ flex: 1 }}>
        <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4, textAlign: 'right' }}>סיום יום</label>
        <input
          type="time"
          {...register('dayEndTime' as Path<T>)}
          disabled={disabled}
          style={{ width: '100%', height: 40, border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 15, fontFamily: 'inherit', background: '#FAFAFA', boxSizing: 'border-box' }}
        />
        {endError && (
          <p style={{ fontSize: 13, color: '#E7000B', marginTop: 4 }}>{String(endError.message)}</p>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <label style={{ fontSize: 13, color: '#6B7280', display: 'block', marginBottom: 4, textAlign: 'right' }}>תחילת יום</label>
        <input
          type="time"
          {...register('dayStartTime' as Path<T>)}
          disabled={disabled}
          style={{ width: '100%', height: 40, border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 15, fontFamily: 'inherit', background: '#FAFAFA', boxSizing: 'border-box' }}
        />
        {startError && (
          <p style={{ fontSize: 13, color: '#E7000B', marginTop: 4 }}>{String(startError.message)}</p>
        )}
      </div>
    </div>
  );
}

interface WorkReportFrameProps {
  open?: boolean;
  children: ReactNode;
  title?: string;
  onClose: () => void;
  onBackdropClick?: () => void;
  actions?: ReactNode;
  footer?: ReactNode;
  mutationError?: ReactNode;
  readOnlyBanner?: ReactNode;
  zIndex?: number;
  mode?: 'drawer' | 'modal';
}

export function WorkReportFrame({
  open = true,
  children,
  title = 'דיווח ידני',
  onClose,
  onBackdropClick,
  actions,
  footer,
  mutationError,
  readOnlyBanner,
  zIndex = 50,
  mode = 'drawer',
}: WorkReportFrameProps) {
  const isModal = mode === 'modal';
  return (
    <>
      <div
        onClick={onBackdropClick ?? onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20,30,62,0.5)',
          zIndex,
          transition: 'opacity 0.25s',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        dir="rtl"
        style={{
          position: 'fixed',
          top: isModal ? '50%' : 0,
          left: isModal ? '50%' : 0,
          height: isModal ? 'min(760px, 94vh)' : '100vh',
          width: 'min(390px, 100vw)',
          background: '#F2F2F7',
          borderRadius: isModal ? 34 : 0,
          zIndex: zIndex + 1,
          display: 'flex',
          flexDirection: 'column',
          transform: isModal
            ? 'translate(-50%, -50%)'
            : open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease, opacity 0.25s ease',
          boxShadow: '0 30px 80px rgba(20,30,62,.18), 0 6px 18px rgba(20,30,62,.08)',
          overflow: 'hidden',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          style={{
            display: 'grid',
            gridTemplateColumns: '96px 1fr 96px',
            alignItems: 'center',
            gap: 8,
            padding: '18px 18px 14px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8 }}>{actions}</div>
          <h1 style={{ margin: 0, textAlign: 'center', fontSize: 18, fontWeight: 800, color: '#1A2233' }}>
            {title}
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="חזור"
            style={{
              justifySelf: 'end',
              width: 30,
              height: 30,
              borderRadius: 999,
              background: '#FFFFFF',
              border: '1px solid #ECECF2',
              cursor: 'pointer',
              padding: 0,
              color: '#1A2233',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 2L7 5 3.5 8" />
            </svg>
          </button>
        </header>
        {readOnlyBanner}
        {mutationError}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </div>
        {footer}
      </div>
    </>
  );
}

export function WorkLocationSegment({
  control,
  name,
  disabled = false,
}: {
  control: Control<FieldValues>;
  name: Path<FieldValues>;
  disabled?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div style={{ display: 'flex', gap: 4, flexDirection: 'row-reverse', borderRadius: 14, background: '#EEF0F5', padding: 5 }}>
          {WORK_LOCATION_OPTIONS.map(({ value, label }) => {
            const active = field.value === value;
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() => field.onChange(value)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  border: active ? '1px solid #ECECF2' : 'none',
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#1A2233' : '#7A8092',
                  boxShadow: active ? '0 1px 1px rgba(20,30,62,.04), 0 2px 8px rgba(20,30,62,.08)' : 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: disabled ? 'default' : 'pointer',
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
  );
}

interface EntryFieldsProps<T extends FieldValues> {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  errors: FieldErrors<T>;
  dropdownData: DropdownDataResponse;
  prefix?: string;
  disabled?: boolean;
  showTimes?: boolean;
  readOnlyTimes?: boolean;
  showDuration?: boolean;
  startTime?: string;
  endTime?: string;
}

function fieldName<T extends FieldValues>(prefix: string | undefined, name: string): Path<T> {
  return (prefix ? `${prefix}.${name}` : name) as Path<T>;
}

function getError<T extends FieldValues>(errors: FieldErrors<T>, prefix: string | undefined, name: string) {
  if (!prefix) return errors[name as keyof typeof errors];
  const parts = prefix.split('.');
  let current: unknown = errors;
  for (const part of parts) {
    current = typeof current === 'object' && current !== null
      ? (current as Record<string, unknown>)[part]
      : undefined;
  }
  return typeof current === 'object' && current !== null
    ? (current as Record<string, { message?: unknown }>)[name]
    : undefined;
}

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

export function WorkEntryFields<T extends FieldValues>({
  control,
  setValue,
  errors,
  dropdownData,
  prefix,
  disabled = false,
  showTimes = true,
  readOnlyTimes = false,
  showDuration = true,
  startTime,
  endTime,
}: EntryFieldsProps<T>) {
  const watchedClientId = String(useWatch({ control, name: fieldName<T>(prefix, 'clientId') }) ?? '');
  const watchedProjectId = String(useWatch({ control, name: fieldName<T>(prefix, 'projectId') }) ?? '');
  const watchedStart = String(useWatch({ control, name: fieldName<T>(prefix, 'startTime') }) ?? startTime ?? '');
  const watchedEnd = String(useWatch({ control, name: fieldName<T>(prefix, 'endTime') }) ?? endTime ?? '');

  const selectedClient = dropdownData.clients.find((c) => c.id === watchedClientId);
  const availableProjects = selectedClient?.projects ?? [];
  const selectedProject = availableProjects.find((p) => p.id === watchedProjectId);
  const availableTasks = selectedProject?.tasks ?? [];

  return (
    <>
      <WorkLocationSegment control={control as unknown as Control<FieldValues>} name={fieldName<FieldValues>(prefix, 'workLocation')} disabled={disabled} />
      <Controller
        control={control}
            name={fieldName<T>(prefix, 'clientId')}
        render={({ field }) => (
          <select
            {...field}
            disabled={disabled}
            style={{ ...fieldStyle, cursor: 'pointer' }}
            onChange={(e) => {
              field.onChange(e.target.value);
              setValue(fieldName<T>(prefix, 'projectId'), '' as never);
              setValue(fieldName<T>(prefix, 'taskId'), '' as never);
            }}
          >
            <option value="">בחר לקוח</option>
            {dropdownData.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      />
      {getError(errors, prefix, 'clientId') && <p style={errorStyle}>{String(getError(errors, prefix, 'clientId')?.message)}</p>}
      <Controller
        control={control}
            name={fieldName<T>(prefix, 'projectId')}
        render={({ field }) => (
          <select
            {...field}
            disabled={disabled || !watchedClientId}
            style={{ ...fieldStyle, cursor: 'pointer', opacity: watchedClientId && !disabled ? 1 : 0.55 }}
            onChange={(e) => {
              field.onChange(e.target.value);
              setValue(fieldName<T>(prefix, 'taskId'), '' as never);
            }}
          >
            <option value="">בחר פרויקט</option>
            {availableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      />
      {getError(errors, prefix, 'projectId') && <p style={errorStyle}>{String(getError(errors, prefix, 'projectId')?.message)}</p>}
      <Controller
        control={control}
            name={fieldName<T>(prefix, 'taskId')}
        render={({ field }) => (
          <select
            {...field}
            disabled={disabled || !watchedProjectId}
            style={{ ...fieldStyle, cursor: 'pointer', opacity: watchedProjectId && !disabled ? 1 : 0.55 }}
          >
            <option value="">בחר משימה</option>
            {availableTasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      />
      {getError(errors, prefix, 'taskId') && <p style={errorStyle}>{String(getError(errors, prefix, 'taskId')?.message)}</p>}
      {showTimes && (
        <div style={{ display: 'grid', gridTemplateColumns: showDuration ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12, alignItems: 'start' }}>
          {showDuration && (
            <div>
              <label style={{ fontSize: 13, color: '#7A8092', display: 'block', marginBottom: 6, textAlign: 'center' }}>משך</label>
              <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F9FC', color: '#6B7280' }}>
                {formatDuration(watchedStart, watchedEnd)}
              </div>
            </div>
          )}
          <div>
            <label style={{ fontSize: 13, color: '#7A8092', display: 'block', marginBottom: 6, textAlign: 'center' }}>התחלה</label>
            <Controller
              control={control}
              name={fieldName<T>(prefix, 'startTime')}
              render={({ field }) => <input type="time" {...field} readOnly={readOnlyTimes} disabled={disabled} style={fieldStyle} />}
            />
            {getError(errors, prefix, 'startTime') && <p style={errorStyle}>{String(getError(errors, prefix, 'startTime')?.message)}</p>}
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#7A8092', display: 'block', marginBottom: 6, textAlign: 'center' }}>סיום</label>
            <Controller
              control={control}
              name={fieldName<T>(prefix, 'endTime')}
              render={({ field }) => <input type="time" {...field} readOnly={readOnlyTimes} disabled={disabled} style={fieldStyle} />}
            />
            {getError(errors, prefix, 'endTime') && <p style={errorStyle}>{String(getError(errors, prefix, 'endTime')?.message)}</p>}
          </div>
        </div>
      )}
      <Controller
        control={control}
        name={fieldName<T>(prefix, 'description')}
        render={({ field }) => {
          const len = (field.value ?? '').length;
          return (
            <div style={{ position: 'relative' }}>
              <textarea
                {...field}
                disabled={disabled}
                maxLength={500}
                placeholder="תיאור עבודה..."
                rows={4}
                style={{
                  ...fieldStyle,
                  height: 92,
                  padding: '14px 12px',
                  resize: 'vertical',
                  direction: 'rtl',
                }}
              />
              <span style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 12, color: '#9CA3AF' }}>
                {len}/500
              </span>
            </div>
          );
        }}
      />
    </>
  );
}

export function WorkEntryBlock({
  prefix,
  dropdownData,
  disabled,
  onRemove,
  showRemove,
}: {
  prefix: string;
  dropdownData: DropdownDataResponse;
  disabled: boolean;
  onRemove: () => void;
  showRemove: boolean;
}) {
  const { control, setValue, formState: { errors } } = useFormContext<FieldValues>();
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        position: 'relative',
        boxShadow: '0 1px 2px rgba(20,30,62,.04), 0 6px 22px rgba(20,30,62,.05)',
      }}
    >
      {showRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="מחק רשומה"
          style={{ position: 'absolute', top: 12, left: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#848891', padding: 4 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      )}
      <WorkEntryFields
        control={control}
        setValue={setValue}
        errors={errors}
        dropdownData={dropdownData}
        prefix={prefix}
        disabled={disabled}
      />
    </div>
  );
}
