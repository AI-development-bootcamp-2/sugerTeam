import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';
import { useCreateUser } from '../../../services/users.service';
import { ROLE_LABELS, ALL_ROLES } from './userConstants';

const createUserSchema = z.object({
  fullName: z.string().min(1, 'שדה חובה'),
  email: z.string().email('כתובת דוא״ל לא תקינה'),
  password: z.string().min(8, 'לפחות 8 תווים'),
  role: z.enum(['EMPLOYEE', 'TEAM_LEAD', 'ADMIN']),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

const createUserResolver: Resolver<CreateUserFormData> = async (values) => {
  const result = createUserSchema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  return {
    values: {},
    errors: result.error.issues.reduce<Record<string, { type: string; message: string }>>(
      (acc, issue) => {
        const key = issue.path[0] as string;
        if (!acc[key]) acc[key] = { type: 'validation', message: issue.message };
        return acc;
      },
      {},
    ),
  };
};

interface Props {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function CreateUserModal({ onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: createUserResolver,
    defaultValues: { role: 'EMPLOYEE' },
  });
  const createUser = useCreateUser();
  const [serverError, setServerError] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">משתמש חדש</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => {
            setServerError(null);
            createUser.mutate(data, {
              onSuccess: () => {
                onSuccess('משתמש נוצר בהצלחה');
                onClose();
              },
              onError: (err: unknown) => {
                const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response?.status;
                if (status === 409) {
                  setServerError('כתובת דוא״ל כבר קיימת');
                } else {
                  setServerError('שגיאה ביצירת משתמש, נסו שנית');
                }
              },
            });
          })}
          className="flex flex-col gap-4 px-6 py-5"
          noValidate
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">שם מלא</label>
            <input
              {...register('fullName')}
              placeholder="ישראל ישראלי"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">דוא״ל</label>
            <input
              {...register('email')}
              type="email"
              placeholder="name@abra.co.il"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">סיסמה</label>
            <input
              {...register('password')}
              type="password"
              placeholder="לפחות 8 תווים"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">תפקיד</label>
            <select
              {...register('role')}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={createUser.isPending}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createUser.isPending ? 'יוצר...' : 'צור משתמש'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
