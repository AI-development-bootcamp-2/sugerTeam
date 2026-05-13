import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Modal from '../../../components/Modal';
import EmptyState from '../../../components/EmptyState';
import { useAuthStore } from '../../../store/authStore';
import { UserRole } from '../../../types/auth';
import {
  useMonths,
  useLockMonth,
  useUnlockMonth,
  type MonthLockRecord,
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

export default function MonthClosurePage() {
  const authUser = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const months = useMonths();
  const lock = useLockMonth();
  const unlock = useUnlockMonth();

  const rows = useMemo(() => buildRows(months.data ?? []), [months.data]);

  if (authUser !== null && authUser.role !== UserRole.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  const isMutating = lock.isPending || unlock.isPending;

  const confirm = (): void => {
    if (!pending) return;
    setError(null);
    const mutation = pending.action === 'lock' ? lock : unlock;
    mutation.mutate(
      { year: pending.year, month: pending.month },
      {
        onSuccess: () => setPending(null),
        onError:   () => setError('הפעולה נכשלה, נסה שוב'),
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
          <table className="w-full text-right">
            <thead className="bg-[#141E3E]">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">חודש</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">סטטוס</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">נעול ב</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">נעול על-ידי</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">פעולות</th>
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
                          className="rounded-md border border-green-300 px-3 py-1 text-xs text-green-700 hover:bg-green-50"
                        >
                          פתח מחדש
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setPending({ action: 'lock', year: row.year, month: row.month })
                          }
                          className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                        >
                          נעל
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
        title={pending?.action === 'lock' ? 'נעילת חודש' : 'פתיחת חודש'}
      >
        <p className="mb-5 text-sm text-gray-600">
          {pending?.action === 'lock'
            ? `האם לנעול את חודש ${formatMonthYear(pending.year, pending.month)}? לא ניתן לערוך דיווחים לאחר הנעילה.`
            : pending
              ? `האם לפתוח מחדש את חודש ${formatMonthYear(pending.year, pending.month)}?`
              : ''}
        </p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirm}
            disabled={isMutating}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50 ${
              pending?.action === 'lock'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {pending?.action === 'lock' ? 'נעל' : 'פתח'}
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
