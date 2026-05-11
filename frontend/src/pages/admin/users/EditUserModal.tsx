import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';
import { useUpdateUser, useDeactivateUser, useActivateUser } from '../../../services/users.service';
import { ROLE_LABELS, ALL_ROLES } from './userConstants';
import type { User, UserRole } from '../../../types/entities';

const editUserSchema = z.object({
  fullName: z.string().min(1, 'שדה חובה'),
  email: z.string().email('כתובת דוא״ל לא תקינה'),
  role: z.enum(['EMPLOYEE', 'TEAM_LEAD', 'ADMIN']),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

const editUserResolver: Resolver<EditUserFormData> = async (values) => {
  const result = editUserSchema.safeParse(values);
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
  user: User;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function EditUserModal({ user, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditUserFormData>({
    resolver: editUserResolver,
    defaultValues: { fullName: user.fullName, email: user.email, role: user.role },
  });
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();
  const activateUser = useActivateUser();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'activate' | null>(null);
  const isActive = user.status === 'ACTIVE';

  const handleStatusToggle = () => {
    setConfirmAction(isActive ? 'deactivate' : 'activate');
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'deactivate') {
      deactivateUser.mutate(user.id, {
        onSuccess: () => {
          onSuccess('המשתמש הושבת');
          onClose();
        },
      });
    } else {
      activateUser.mutate(user.id, {
        onSuccess: () => {
          onSuccess('המשתמש הופעל');
          onClose();
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Slide-over panel from the left (RTL start = right, end = left) */}
      <div className="relative mr-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">עריכת משתמש</h2>
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

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="edit-user-form"
            onSubmit={handleSubmit((data) => {
              setServerError(null);
              updateUser.mutate(
                { id: user.id, ...data },
                {
                  onSuccess: () => {
                    onSuccess('פרטי המשתמש עודכנו');
                    onClose();
                  },
                  onError: (err: unknown) => {
                    const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response?.status;
                    if (status === 409) {
                      setServerError('כתובת דוא״ל כבר קיימת');
                    } else {
                      setServerError('שגיאה בעדכון, נסו שנית');
                    }
                  },
                },
              );
            })}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">שם מלא</label>
              <input
                {...register('fullName')}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">דוא״ל</label>
              <input
                {...register('email')}
                type="email"
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
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
          </form>

          {/* Status section */}
          <div className="mt-6 border-t border-gray-100 pt-6">
            <p className="mb-3 text-sm font-medium text-gray-700">סטטוס משתמש</p>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <span className="text-sm text-gray-600">
                {isActive ? 'המשתמש פעיל במערכת' : 'המשתמש מושבת'}
              </span>
              <button
                type="button"
                onClick={handleStatusToggle}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive
                    ? 'border border-red-300 text-red-600 hover:bg-red-50'
                    : 'border border-green-300 text-green-700 hover:bg-green-50'
                }`}
              >
                {isActive ? 'השבת' : 'הפעל'}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex gap-2">
            <button
              type="submit"
              form="edit-user-form"
              disabled={updateUser.isPending}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateUser.isPending ? 'שומר...' : 'שמור שינויים'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>

      {/* Confirm dialog for deactivate/activate */}
      {confirmAction && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-900">
              {confirmAction === 'deactivate' ? 'השבתת משתמש' : 'הפעלת משתמש'}
            </h3>
            <p className="mb-5 text-sm text-gray-600">
              {confirmAction === 'deactivate'
                ? 'האם להשבית משתמש זה? הוא לא יוכל להתחבר למערכת.'
                : 'האם להפעיל מחדש את המשתמש?'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={deactivateUser.isPending || activateUser.isPending}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50 ${
                  confirmAction === 'deactivate' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                אישור
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
