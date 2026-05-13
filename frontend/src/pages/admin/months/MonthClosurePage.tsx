import { useMemo, useState } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';
import Modal from '../../../components/Modal';
import EmptyState from '../../../components/EmptyState';
import { useAuthStore } from '../../../store/authStore';
import { UserRole } from '../../../types/auth';
import {
  useMonths,
  useLockMonth,
  useUnlockMonth,
  useMissingReports,
  type MonthLockRecord,
  type MissingReportsForUser,
} from '../../../services/months.service';

type Action = 'lock' | 'unlock';

interface MonthRow {
  year: number;
  month: number;
  record: MonthLockRecord | null;
}

interface PendingAction {
  action: Action;
  year: number;
  month: number;
}

const MONTHS_TO_PREPOPULATE = 4; // current + 3 prior

function formatMonthYear(year: number, month: number): string {
  return `${String(month).padStart(2, '0')}/${year}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('he-IL', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function buildRows(records: MonthLockRecord[]): MonthRow[] {
  const now = new Date();
  const preset = new Map<string, MonthRow>();

  for (let i = 0; i < MONTHS_TO_PREPOPULATE; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    preset.set(`${year}-${month}`, { year, month, record: null });
  }

  for (const r of records) {
    preset.set(`${r.year}-${r.month}`, { year: r.year, month: r.month, record: r });
  }

  return Array.from(preset.values()).sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });
}

function LockClosedIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function LockOpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

export default function MonthClosurePage() {
  const authUser = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const months = useMonths();
  const lock = useLockMonth();
  const unlock = useUnlockMonth();
  const missing = useMissingReports(
    pending?.year ?? 0,
    pending?.month ?? 0,
    pending?.action === 'lock',
  );

  const rows = useMemo(() => buildRows(months.data ?? []), [months.data]);

  if (authUser !== null && authUser.role !== UserRole.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  const isMutating = lock.isPending || unlock.isPending;
  const isLockAction = pending?.action === 'lock';
  const missingList: MissingReportsForUser[] = missing.data ?? [];
  const hasMissing = isLockAction && missingList.length > 0;
  const checkingMissing = isLockAction && missing.isLoading;
  const confirmDisabled = isMutating || checkingMissing || hasMissing;

  const confirm = (): void => {
    if (!pending) return;
    setError(null);
    const mutation = pending.action === 'lock' ? lock : unlock;
    mutation.mutate(
      { year: pending.year, month: pending.month },
      {
        onSuccess: () => setPending(null),
        onError:   (err) => {
          if (
            pending.action === 'lock' &&
            axios.isAxiosError(err) &&
            err.response?.status === 409
          ) {
            setError('יש עובדים עם דיווחים חסרים, לא ניתן לנעול את החודש');
            void missing.refetch();
            return;
          }
          setError('הפעולה נכשלה, נסה שוב');
        },
      },
    );
  };

  const cancel = (): void => {
    if (isMutating) return;
    setPending(null);
    setError(null);
  };

  return (
    <main className="p-6" dir="rtl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">נעילת חודשים</h1>

      {months.isLoading ? (
        <p className="py-8 text-center text-sm text-gray-500">טוען...</p>
      ) : months.isError ? (
        <p className="py-8 text-center text-sm text-red-600">שגיאה בטעינת הנתונים</p>
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full table-fixed">
            <thead className="bg-[#141E3E]">
              <tr>
                <th className="w-[15%] px-4 py-2 text-start text-sm font-semibold text-white">חודש</th>
                <th className="w-[15%] px-4 py-2 text-start text-sm font-semibold text-white">סטטוס</th>
                <th className="w-[25%] px-4 py-2 text-start text-sm font-semibold text-white">נעול ב</th>
                <th className="w-[35%] px-4 py-2 text-start text-sm font-semibold text-white">נעול על-ידי</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isLocked = row.record?.isLocked === true;
                return (
                  <tr
                    key={`${row.year}-${row.month}`}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatMonthYear(row.year, row.month)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isLocked
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {isLocked ? 'נעול' : 'פתוח'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDateTime(row.record?.lockedAt ?? null)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.record?.lockedByUser?.fullName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isLocked ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPending({ action: 'unlock', year: row.year, month: row.month })
                          }
                          className="rounded-md p-1.5 text-green-700 hover:bg-green-50"
                          aria-label="פתח מחדש"
                          title="פתח מחדש"
                        >
                          <LockOpenIcon />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setPending({ action: 'lock', year: row.year, month: row.month })
                          }
                          className="rounded-md p-1.5 text-red-700 hover:bg-red-50"
                          aria-label="נעל"
                          title="נעל"
                        >
                          <LockClosedIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={pending !== null}
        onClose={cancel}
        title={isLockAction ? 'נעילת חודש' : 'פתיחת חודש'}
      >
        <p className="mb-4 text-sm text-gray-600">
          {isLockAction && pending
            ? `האם לנעול את חודש ${formatMonthYear(pending.year, pending.month)}? לא ניתן לערוך דיווחים לאחר הנעילה.`
            : pending
              ? `האם לפתוח מחדש את חודש ${formatMonthYear(pending.year, pending.month)}?`
              : ''}
        </p>

        {isLockAction && checkingMissing && (
          <p className="mb-4 text-sm text-gray-500">בודק דיווחים חסרים...</p>
        )}

        {isLockAction && !checkingMissing && missing.isError && (
          <p className="mb-4 text-sm text-red-600">לא הצלחנו לבדוק דיווחים חסרים, נסה שוב</p>
        )}

        {hasMissing && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="mb-2 text-sm font-semibold text-red-700">
              לא ניתן לנעול — חסרים דיווחים מאושרים לעובדים הבאים:
            </p>
            <ul className="max-h-48 overflow-y-auto text-sm text-red-700">
              {missingList.map((u) => (
                <li
                  key={u.userId}
                  className="flex items-center justify-between border-b border-red-100 py-1 last:border-b-0"
                >
                  <span>{u.fullName}</span>
                  <span className="font-mono text-xs">
                    {u.missingDays} ימים חסרים
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirm}
            disabled={confirmDisabled}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              isLockAction
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isLockAction ? 'נעל' : 'פתח'}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={isMutating}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ביטול
          </button>
        </div>
      </Modal>
    </main>
  );
}
