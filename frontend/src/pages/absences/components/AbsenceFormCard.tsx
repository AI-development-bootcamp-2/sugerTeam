import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import axios from 'axios';
import { z } from 'zod';
import { AbsenceType } from '../../../types/time-report';
import {
  useAbsences,
  useCreateAbsence,
  useUploadDocument,
} from '../../../services/absences.service';
import { useAuthStore } from '../../../store/authStore';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const absenceFormSchema = z.object({
  startDate: z.string().regex(ISO_DATE_RE, 'תאריך התחלה חובה'),
  absenceType: z.nativeEnum(AbsenceType),
});
type AbsenceFormData = z.infer<typeof absenceFormSchema>;

const multiDayFormSchema = z
  .object({
    startDate: z.string().regex(ISO_DATE_RE, 'תאריך התחלה חובה'),
    endDate: z.string().regex(ISO_DATE_RE, 'תאריך סיום חובה'),
    absenceType: z.nativeEnum(AbsenceType),
    isPartial: z.boolean(),
    partialDurationHours: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
  })
  .refine((d) => d.startDate <= d.endDate, {
    path: ['endDate'],
    message: 'תאריך סיום חייב להיות אחרי תאריך ההתחלה',
  });
type MultiDayFormData = z.infer<typeof multiDayFormSchema>;

const ABSENCE_TYPE_OPTIONS: { value: AbsenceType; label: string; emoji: string }[] = [
  { value: AbsenceType.VACATION,         label: 'חופשה',  emoji: '🏖️' },
  { value: AbsenceType.SICK_LEAVE,       label: 'מחלה',   emoji: '🤒' },
  { value: AbsenceType.MILITARY_RESERVE, label: 'מילואים', emoji: '🪖' },
  { value: AbsenceType.OTHER,            label: 'אחר',    emoji: '📝' },
];

const HEBREW_WEEKDAYS = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת'];

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatHebrewDate(iso: string): string {
  if (!ISO_DATE_RE.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = HEBREW_WEEKDAYS[date.getUTCDay()];
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const yy = String(y).slice(-2);
  return `${weekday} ${dd}/${mm}/${yy}`;
}

function countAbsenceDays(start: string, end: string): number {
  if (!ISO_DATE_RE.test(start) || !ISO_DATE_RE.test(end) || start > end) return 0;
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const cursor = new Date(Date.UTC(sy, sm - 1, sd));
  const endDate = new Date(Date.UTC(ey, em - 1, ed));
  let count = 0;
  while (cursor.getTime() <= endDate.getTime()) {
    const dow = cursor.getUTCDay();
    if (dow !== 5 && dow !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function requiresDocument(type: AbsenceType): boolean {
  return type === AbsenceType.SICK_LEAVE || type === AbsenceType.MILITARY_RESERVE;
}

const absenceFormResolver: Resolver<AbsenceFormData> = async (values) => {
  const result = absenceFormSchema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };
  return {
    values: {},
    errors: result.error.issues.reduce<Record<string, { type: string; message: string }>>(
      (acc, issue) => {
        const key = String(issue.path[0]);
        if (!acc[key]) acc[key] = { type: 'validation', message: issue.message };
        return acc;
      },
      {},
    ),
  };
};

const multiDayFormResolver: Resolver<MultiDayFormData> = async (values) => {
  const result = multiDayFormSchema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };
  return {
    values: {},
    errors: result.error.issues.reduce<Record<string, { type: string; message: string }>>(
      (acc, issue) => {
        const key = String(issue.path[0]);
        if (!acc[key]) acc[key] = { type: 'validation', message: issue.message };
        return acc;
      },
      {},
    ),
  };
};

interface AbsenceFormCardProps {
  onClose?: () => void;
  flush?: boolean;
}

export function AbsenceFormCard({ onClose, flush = false }: AbsenceFormCardProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const today = todayIso();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AbsenceFormData>({
    resolver: absenceFormResolver,
    defaultValues: { startDate: today, absenceType: AbsenceType.SICK_LEAVE },
  });

  const startDate = watch('startDate');
  const absenceType = watch('absenceType');

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const createAbsence = useCreateAbsence();
  const uploadDocument = useUploadDocument();

  const monthCursor = useMemo(() => {
    const [y, m] = startDate.split('-').map(Number);
    return { year: y, month: m };
  }, [startDate]);
  const absencesQuery = useAbsences(userId, monthCursor.year, monthCursor.month);
  const monthTotal = absencesQuery.data?.length ?? 0;

  const currentOption =
    ABSENCE_TYPE_OPTIONS.find((o) => o.value === absenceType) ?? ABSENCE_TYPE_OPTIONS[0];

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFileError('הקובץ גדול מדי (מקסימום 10MB)');
      e.target.value = '';
      return;
    }
    setFileError(null);
    setPendingFile(file);
  };

  const submitSingleDay = handleSubmit(async (data) => {
    setServerError(null);
    setSuccessMessage(null);
    try {
      const record = await createAbsence.mutateAsync({
        absenceType: data.absenceType,
        startDate: data.startDate,
        endDate: data.startDate,
        isPartial: false,
        partialDurationHours: null,
      });
      if (pendingFile) {
        await uploadDocument.mutateAsync({ absenceId: record.id, file: pendingFile });
      }
      setSuccessMessage('ההיעדרות נשמרה');
      setPendingFile(null);
      reset({ startDate: today, absenceType: AbsenceType.SICK_LEAVE });
    } catch (err: unknown) {
      handleAxiosError(err, setServerError);
    }
  });

  return (
    <div
      className={
        flush
          ? 'relative flex h-full w-full flex-col overflow-hidden bg-[#f2f2f7]'
          : 'relative flex h-[760px] w-full max-w-[390px] flex-col overflow-hidden rounded-[34px] bg-[#f2f2f7] shadow-[0_30px_80px_rgba(20,30,62,.18),0_6px_18px_rgba(20,30,62,.08)]'
      }
    >
      <header className="flex items-center justify-between px-5 pt-[18px] pb-[14px]">
        <h1 className="text-[18px] font-bold tracking-tight text-[#1a2233]">דיווח ידני</h1>
        <button
          type="button"
          aria-label="סגירה"
          onClick={onClose}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#ececf2] bg-white text-[#1a2233]"
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-3 w-3">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </header>

      <form onSubmit={submitSingleDay} noValidate className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col gap-[14px] overflow-y-auto px-[18px] pb-[18px] pt-[6px]">
          <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-[#eef0f5] p-[5px]">
            <button
              type="button"
              aria-selected="true"
              className="h-[38px] rounded-[10px] border border-[#ececf2] bg-white text-sm font-semibold text-[#1a2233] shadow-[0_1px_1px_rgba(20,30,62,.04),0_2px_8px_rgba(20,30,62,.08)]"
            >
              דיווח העדרות
            </button>
            <button
              type="button"
              aria-selected="false"
              className="h-[38px] rounded-[10px] bg-transparent text-sm font-semibold text-[#7a8092]"
              onClick={() => {
                window.location.href = '/time-report';
              }}
            >
              דיווח עבודה
            </button>
          </div>

          <div className="px-1 text-[13px] font-medium text-[#555a6b]">
            {formatHebrewDate(startDate)}
          </div>

          <TypeField
            currentOption={currentOption}
            register={register('absenceType')}
          />

          <label className="flex h-[54px] cursor-pointer items-center gap-[10px] rounded-[14px] border border-[#ececf2] bg-white px-[14px] shadow-[0_1px_2px_rgba(20,30,62,.04),0_6px_22px_rgba(20,30,62,.05)]">
            <span className="text-[13px] font-medium text-[#555a6b]">תאריך</span>
            <input
              type="date"
              {...register('startDate')}
              className="flex-1 bg-transparent text-end text-[15px] font-semibold text-[#1a2233] outline-none"
            />
          </label>
          {errors.startDate && (
            <p className="px-1 text-xs text-red-600">{errors.startDate.message}</p>
          )}

          <div className="px-1 text-end text-[13px] font-medium text-[#555a6b]">
            צירוף קבצים רלוונטים{requiresDocument(absenceType) ? ' (חובה)' : ''}
          </div>

          <UploadCard
            fileName={pendingFile?.name}
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.heic"
            onChange={onPickFile}
            className="hidden"
          />
          {fileError && <p className="px-1 text-xs text-red-600">{fileError}</p>}

          <div className="flex items-center gap-[10px] px-[2px] pt-1.5">
            <button type="button" aria-label="הקודם" disabled className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ececf2] bg-white text-[#555a6b] disabled:opacity-50">
              <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5"><path d="M6.5 2L3 5l3.5 3" /></svg>
            </button>
            <span className="h-px flex-1 bg-[#ececf2]" />
            <span className="font-semibold tabular-nums text-[13px] text-[#8a8f9c]" dir="ltr">
              {monthTotal > 0 ? `1/${monthTotal}` : '1/1'}
            </span>
            <span className="h-px flex-1 bg-[#ececf2]" />
            <button type="button" aria-label="הבא" disabled className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ececf2] bg-white text-[#555a6b] disabled:opacity-50">
              <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5"><path d="M3.5 2L7 5 3.5 8" /></svg>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPanelOpen(true)}
            className="flex h-[52px] items-center gap-[10px] rounded-[14px] border border-[#ececf2] bg-white px-[14px] shadow-[0_1px_2px_rgba(20,30,62,.04),0_6px_22px_rgba(20,30,62,.05)]"
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center text-[#8a8f9c]">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <path d="M8 2L4 6l4 4" />
              </svg>
            </span>
            <span className="flex-1 text-center text-sm font-semibold text-[#1a2233]">
              לדווח על העדרות יותר מיום אחד
            </span>
          </button>

          {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}
          {successMessage && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p>}
        </div>

        <div className="bg-gradient-to-b from-transparent to-[#f2f2f7] px-[18px] pb-[22px] pt-[14px]">
          <button
            type="submit"
            disabled={createAbsence.isPending || uploadDocument.isPending}
            className="h-[54px] w-full rounded-[14px] bg-[#141e3e] text-[17px] font-bold text-white shadow-[0_8px_20px_rgba(20,30,62,.18)] transition-colors hover:bg-[#1d2952] disabled:opacity-60"
          >
            {createAbsence.isPending || uploadDocument.isPending ? 'שומר...' : 'שמירה'}
          </button>
        </div>
      </form>

      <MultiDayPanel
        isOpen={isPanelOpen}
        today={today}
        onClose={() => setIsPanelOpen(false)}
        onSaved={(msg) => {
          setSuccessMessage(msg);
          setIsPanelOpen(false);
        }}
      />
    </div>
  );
}

interface TypeFieldProps {
  currentOption: { label: string; emoji: string };
  register: ReturnType<ReturnType<typeof useForm>['register']>;
}

function TypeField({ currentOption, register }: TypeFieldProps) {
  return (
    <label className="relative flex h-[54px] cursor-pointer items-center gap-[10px] rounded-[14px] border border-[#ececf2] bg-white px-[14px] shadow-[0_1px_2px_rgba(20,30,62,.04),0_6px_22px_rgba(20,30,62,.05)]">
      <span className="flex h-[22px] w-[22px] items-center justify-center text-[#b4b9c4]">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M3 5l4 4 4-4" />
        </svg>
      </span>
      <span className="flex flex-1 items-center justify-end gap-2 text-[15px] font-semibold text-[#1a2233]">
        {currentOption.label}
        <span aria-hidden="true" className="text-lg leading-none">{currentOption.emoji}</span>
      </span>
      <select
        {...register}
        aria-label="סוג ההעדרות"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {ABSENCE_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.emoji} {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface UploadCardProps {
  fileName?: string;
  onClick: () => void;
}

function UploadCard({ fileName, onClick }: UploadCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center gap-[10px] rounded-[14px] border-[1.5px] border-dashed border-[#2f6bff] bg-[#eef3ff] px-[18px] py-[22px] transition-colors hover:bg-[#e3ecff]"
    >
      <span className="flex h-[46px] w-[54px] items-center justify-center">
        <svg viewBox="0 0 56 48" fill="none" className="h-full w-full">
          <path d="M3 10c0-2.2 1.8-4 4-4h13.5c1.2 0 2.4.5 3.2 1.5l2.6 3.1c.8.9 1.9 1.4 3.1 1.4H49c2.2 0 4 1.8 4 4v25c0 2.2-1.8 4-4 4H7c-2.2 0-4-1.8-4-4V10z" fill="#2f6bff" />
          <path d="M3 18c0-2.2 1.8-4 4-4h42c2.2 0 4 1.8 4 4v22c0 2.2-1.8 4-4 4H7c-2.2 0-4-1.8-4-4V18z" fill="#4d83ff" />
          <circle cx="28" cy="29" r="10" fill="#ffffff" />
          <path d="M28 34V24" stroke="#2f6bff" strokeWidth="2" strokeLinecap="round" />
          <path d="M23.5 27.5L28 23l4.5 4.5" stroke="#2f6bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[15px] font-bold text-[#2f6bff] underline decoration-[1.2px] underline-offset-[3px]">
        {fileName ?? 'לחץ כאן להעלאת הקובץ'}
      </span>
      <span className="text-xs font-medium tracking-wide text-[#2153c8]/85">
        סוגי הקבצים הנתמכים: JPG / PNG / PDF
      </span>
    </button>
  );
}

function handleAxiosError(err: unknown, setError: (msg: string) => void): void {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const apiError = (err.response?.data as { error?: unknown } | undefined)?.error;
    if (status === 423) setError('החודש נעול, לא ניתן לבצע שינויים');
    else if (status === 422 && typeof apiError === 'string') setError(apiError);
    else if (status === 413) setError('הקובץ גדול מדי (מקסימום 10MB)');
    else setError('שגיאה בשמירת ההיעדרות, נסו שנית');
  } else {
    setError('שגיאה בשמירת ההיעדרות, נסו שנית');
  }
}

interface MultiDayPanelProps {
  isOpen: boolean;
  today: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

function MultiDayPanel({ isOpen, today, onClose, onSaved }: MultiDayPanelProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<MultiDayFormData>({
    resolver: multiDayFormResolver,
    defaultValues: {
      startDate: today,
      endDate: today,
      absenceType: AbsenceType.SICK_LEAVE,
      isPartial: false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        startDate: today,
        endDate: today,
        absenceType: AbsenceType.SICK_LEAVE,
        isPartial: false,
      });
    }
  }, [isOpen, reset, today]);

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const absenceType = watch('absenceType');
  const isPartial = watch('isPartial');

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const createAbsence = useCreateAbsence();
  const uploadDocument = useUploadDocument();

  const currentOption =
    ABSENCE_TYPE_OPTIONS.find((o) => o.value === absenceType) ?? ABSENCE_TYPE_OPTIONS[0];
  const dayCount = countAbsenceDays(startDate, endDate);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFileError('הקובץ גדול מדי (מקסימום 10MB)');
      e.target.value = '';
      return;
    }
    setFileError(null);
    setPendingFile(file);
  };

  const submit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      const record = await createAbsence.mutateAsync({
        absenceType: data.absenceType,
        startDate: data.startDate,
        endDate: data.endDate,
        isPartial: data.isPartial,
        partialDurationHours: data.isPartial ? data.partialDurationHours ?? null : null,
      });
      if (pendingFile) {
        await uploadDocument.mutateAsync({ absenceId: record.id, file: pendingFile });
      }
      setPendingFile(null);
      onSaved('ההיעדרות נשמרה');
    } catch (err: unknown) {
      handleAxiosError(err, setServerError);
    }
  });

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="דיווח על מספר ימים"
        className={`absolute inset-0 flex flex-col bg-[#f2f2f7] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between px-5 pt-[18px] pb-[14px]">
          <h2 className="text-[18px] font-bold tracking-tight text-[#1a2233]">דיווח על מספר ימים</h2>
          <button
            type="button"
            aria-label="סגירה"
            onClick={onClose}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#ececf2] bg-white text-[#1a2233]"
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-3 w-3">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={submit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-[14px] overflow-y-auto px-[18px] pb-[18px] pt-[6px]">
            <TypeField currentOption={currentOption} register={register('absenceType')} />

            <label className="flex h-[54px] cursor-pointer items-center gap-[10px] rounded-[14px] border border-[#ececf2] bg-white px-[14px] shadow-[0_1px_2px_rgba(20,30,62,.04),0_6px_22px_rgba(20,30,62,.05)]">
              <span className="text-[13px] font-medium text-[#555a6b]">תאריך התחלה</span>
              <input
                type="date"
                {...register('startDate')}
                className="flex-1 bg-transparent text-end text-[15px] font-semibold text-[#1a2233] outline-none"
              />
            </label>
            {errors.startDate && (
              <p className="px-1 text-xs text-red-600">{errors.startDate.message}</p>
            )}

            <label className="flex h-[54px] cursor-pointer items-center gap-[10px] rounded-[14px] border border-[#ececf2] bg-white px-[14px] shadow-[0_1px_2px_rgba(20,30,62,.04),0_6px_22px_rgba(20,30,62,.05)]">
              <span className="text-[13px] font-medium text-[#555a6b]">תאריך סיום</span>
              <input
                type="date"
                {...register('endDate')}
                className="flex-1 bg-transparent text-end text-[15px] font-semibold text-[#1a2233] outline-none"
              />
            </label>
            {errors.endDate && (
              <p className="px-1 text-xs text-red-600">{errors.endDate.message}</p>
            )}

            <div className="flex items-center justify-between rounded-[14px] bg-white px-[14px] py-3 text-[13px] text-[#555a6b] shadow-[0_1px_2px_rgba(20,30,62,.04),0_6px_22px_rgba(20,30,62,.05)]">
              <span>סה״כ ימי היעדרות</span>
              <span className="font-semibold text-[#1a2233]">{dayCount} ימים</span>
            </div>

            <label className="flex h-[52px] cursor-pointer items-center gap-3 rounded-[14px] border border-[#ececf2] bg-white px-[14px] shadow-[0_1px_2px_rgba(20,30,62,.04),0_6px_22px_rgba(20,30,62,.05)]">
              <input type="checkbox" {...register('isPartial')} className="h-4 w-4 accent-[#2f6bff]" />
              <span className="flex-1 text-sm font-semibold text-[#1a2233]">היעדרות חלקית</span>
            </label>

            {isPartial && (
              <>
                <label className="flex h-[54px] cursor-pointer items-center gap-[10px] rounded-[14px] border border-[#ececf2] bg-white px-[14px] shadow-[0_1px_2px_rgba(20,30,62,.04),0_6px_22px_rgba(20,30,62,.05)]">
                  <span className="text-[13px] font-medium text-[#555a6b]">שעות היעדרות</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    {...register('partialDurationHours')}
                    className="flex-1 bg-transparent text-end text-[15px] font-semibold text-[#1a2233] outline-none"
                  />
                </label>
                <p className="rounded-lg bg-[#eef3ff] px-3 py-2 text-xs text-[#2153c8]">
                  יש להגיש גם דיווח שעות לשארית היום
                </p>
              </>
            )}

            <div className="px-1 text-end text-[13px] font-medium text-[#555a6b]">
              צירוף קבצים רלוונטים{requiresDocument(absenceType) ? ' (חובה)' : ''}
            </div>
            <UploadCard fileName={pendingFile?.name} onClick={() => fileInputRef.current?.click()} />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.heic"
              onChange={onPickFile}
              className="hidden"
            />
            {fileError && <p className="px-1 text-xs text-red-600">{fileError}</p>}

            {serverError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
            )}
          </div>

          <div className="bg-gradient-to-b from-transparent to-[#f2f2f7] px-[18px] pb-[22px] pt-[14px]">
            <button
              type="submit"
              disabled={createAbsence.isPending || uploadDocument.isPending}
              className="h-[54px] w-full rounded-[14px] bg-[#141e3e] text-[17px] font-bold text-white shadow-[0_8px_20px_rgba(20,30,62,.18)] transition-colors hover:bg-[#1d2952] disabled:opacity-60"
            >
              {createAbsence.isPending || uploadDocument.isPending ? 'שומר...' : 'שמירה'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
