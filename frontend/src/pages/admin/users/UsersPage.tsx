import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useAllUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useActivateUser,
} from '../../../services/entities.service';
import type { User, UserRole } from '../../../types/entities';

const ROLE_LABELS: Record<UserRole, string> = {
  EMPLOYEE: 'עובד',
  TEAM_LEAD: 'ראש צוות',
  ADMIN: 'מנהל',
};

const ALL_ROLES: UserRole[] = ['EMPLOYEE', 'TEAM_LEAD', 'ADMIN'];

interface CreateUserForm {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

interface EditUserForm {
  fullName: string;
  email: string;
  role: UserRole;
}

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({ defaultValues: { role: 'EMPLOYEE' } });
  const createUser = useCreateUser();
  const [serverError, setServerError] = useState<string | null>(null);

  return (
    <form
      onSubmit={handleSubmit((data) => {
        setServerError(null);
        createUser.mutate(data, {
          onSuccess: () => {
            reset();
            onClose();
          },
          onError: (err: unknown) => {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setServerError(msg ?? 'שגיאה ביצירת משתמש');
          },
        });
      })}
      className="mt-3 flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4"
    >
      <input
        {...register('fullName', { required: 'שדה חובה' })}
        placeholder="שם מלא"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}

      <input
        {...register('email', { required: 'שדה חובה' })}
        type="email"
        placeholder="אימייל"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}

      <input
        {...register('password', { required: 'שדה חובה', minLength: { value: 8, message: 'לפחות 8 תווים' } })}
        type="password"
        placeholder="סיסמה (לפחות 8 תווים)"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}

      <select
        {...register('role')}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createUser.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          צור משתמש
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function EditUserForm({ user, onClose }: { user: User; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditUserForm>({
    defaultValues: { fullName: user.fullName, email: user.email, role: user.role },
  });
  const updateUser = useUpdateUser();
  const [serverError, setServerError] = useState<string | null>(null);

  return (
    <form
      onSubmit={handleSubmit((data) => {
        setServerError(null);
        updateUser.mutate(
          { id: user.id, ...data },
          {
            onSuccess: onClose,
            onError: (err: unknown) => {
              const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
              setServerError(msg ?? 'שגיאה בעדכון משתמש');
            },
          },
        );
      })}
      className="flex flex-col gap-2"
    >
      <input
        {...register('fullName', { required: 'שדה חובה' })}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}

      <input
        {...register('email', { required: 'שדה חובה' })}
        type="email"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}

      <select
        {...register('role')}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={updateUser.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          שמור
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function UserRow({ user }: { user: User }) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const deactivateUser = useDeactivateUser();
  const activateUser = useActivateUser();
  const isActive = user.status === 'ACTIVE';

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-3 p-3">
        <div className="flex flex-1 flex-col">
          <span className="font-medium">{user.fullName}</span>
          <span className="text-sm text-gray-500">{user.email}</span>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {ROLE_LABELS[user.role]}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isActive ? 'פעיל' : 'לא פעיל'}
        </span>
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ערוך
        </button>
        <button
          type="button"
          onClick={() => {
            if (isActive) {
              setConfirmDeactivate(true);
            } else {
              activateUser.mutate(user.id);
            }
          }}
          disabled={deactivateUser.isPending || activateUser.isPending}
          className={`rounded-md px-3 py-1.5 text-sm disabled:opacity-50 ${
            isActive
              ? 'border border-red-300 text-red-600 hover:bg-red-50'
              : 'border border-green-300 text-green-700 hover:bg-green-50'
          }`}
        >
          {isActive ? 'השבת' : 'הפעל'}
        </button>
      </div>

      {confirmDeactivate && (
        <div className="border-t border-gray-200 bg-amber-50 px-4 py-3">
          <p className="mb-3 text-sm text-amber-800">האם להשבית את המשתמש? הוא לא יוכל להתחבר למערכת.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                deactivateUser.mutate(user.id, { onSuccess: () => setConfirmDeactivate(false) });
              }}
              disabled={deactivateUser.isPending}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              אישור
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeactivate(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="border-t border-gray-200 px-4 py-3">
          <EditUserForm user={user} onClose={() => setIsEditing(false)} />
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: users, isLoading } = useAllUsers();

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">משתמשים</h1>

      <button
        type="button"
        onClick={() => setShowCreateForm((prev) => !prev)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        + משתמש חדש
      </button>

      {showCreateForm && <CreateUserForm onClose={() => setShowCreateForm(false)} />}

      {isLoading && <p className="mt-4 text-gray-500">טוען...</p>}

      <div className="mt-4 flex flex-col gap-2">
        {users?.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </div>
    </main>
  );
}
