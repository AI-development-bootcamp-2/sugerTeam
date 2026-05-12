import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useUsers, useDeactivateUser, useActivateUser } from '../../../services/users.service';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { ROLE_LABELS } from './userConstants';
import { useAuthStore } from '../../../store/authStore';
import { UserRole as AuthRole } from '../../../types/auth';
import type { User, UserRole } from '../../../types/entities';
import Modal from '../../../components/Modal';

type RoleFilter = UserRole | 'ALL';

const ROLE_TABS: { label: string; value: RoleFilter }[] = [
  { label: 'כולם', value: 'ALL' },
  { label: 'עובד', value: 'EMPLOYEE' },
  { label: 'ראש צוות', value: 'TEAM_LEAD' },
  { label: 'מנהל', value: 'ADMIN' },
];

interface ToastState {
  message: string;
  id: number;
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  );
}

interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
}

function UserRow({ user, onEdit }: UserRowProps) {
  const [confirmAction, setConfirmAction] = useState<'deactivate' | null>(null);
  const deactivateUser = useDeactivateUser();
  const activateUser = useActivateUser();
  const isActive = user.status === 'ACTIVE';

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.fullName}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{ROLE_LABELS[user.role]}</td>
        <td className="px-4 py-3">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isActive ? 'פעיל' : 'לא פעיל'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(user)}
              className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
            >
              ערוך
            </button>
            {isActive ? (
              <button
                type="button"
                onClick={() => setConfirmAction('deactivate')}
                className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                השבת
              </button>
            ) : (
              <button
                type="button"
                onClick={() => activateUser.mutate(user.id)}
                disabled={activateUser.isPending}
                className="rounded-md border border-green-300 px-3 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                הפעל
              </button>
            )}
          </div>
        </td>
      </tr>

      <Modal
        isOpen={confirmAction === 'deactivate'}
        onClose={() => setConfirmAction(null)}
        title="השבתת משתמש"
      >
        <p className="mb-5 text-sm text-gray-600">האם להשבית משתמש זה? הוא לא יוכל להתחבר למערכת.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              deactivateUser.mutate(user.id, { onSuccess: () => setConfirmAction(null) });
            }}
            disabled={deactivateUser.isPending}
            className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
      </Modal>
    </>
  );
}

export default function UsersListPage() {
  const authUser = useAuthStore((s) => s.user);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string) => {
    setToast({ message, id: Date.now() });
  }, []);

  const { data: users, isLoading } = useUsers({
    search: debouncedSearch || undefined,
    role: roleFilter === 'ALL' ? undefined : roleFilter,
  });

  if (authUser !== null && authUser.role !== AuthRole.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="p-6" dir="rtl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">משתמשים</h1>

      <div className="mb-4 flex items-center gap-3">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setRoleFilter(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              roleFilter === tab.value
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="חיפוש לפי שם או דוא״ל..."
          className="ms-auto w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + יצירה
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-500">טוען...</p>
      ) : !users?.length ? (
        <p className="py-8 text-center text-sm text-gray-500">לא נמצאו משתמשים</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-right">
            <thead className="bg-[#141E3E]">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">שם מלא</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">דוא״ל</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">תפקיד</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">סטטוס</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} onEdit={setEditUser} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSuccess={showToast}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={showToast}
        />
      )}

      {toast && <Toast key={toast.id} message={toast.message} />}
    </main>
  );
}
