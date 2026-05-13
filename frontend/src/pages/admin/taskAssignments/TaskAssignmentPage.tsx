import { useEffect, useMemo, useState } from 'react';
import {
  useAllClients,
  useProjectsByClient,
  useTasksWithAssignments,
  useSyncTaskAssignments,
  useRemoveTaskAssignments,
  useActiveUsers,
} from '../../../services/entities.service';
import type { TaskWithAssignments } from '../../../types/entities';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import EmptyState from '../../../components/EmptyState';

function EditAssignmentModal({
  task,
  isOpen,
  onClose,
}: {
  task: TaskWithAssignments;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: employees } = useActiveUsers();
  const syncAssignments = useSyncTaskAssignments();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(task.assignments.map((a) => a.user.id));
      setSearchQuery('');
    }
  }, [isOpen, task.assignments]);

  const selectedEmployees = employees?.filter((e) => selectedIds.includes(e.id)) ?? [];
  const availableResults = employees?.filter(
    (e) => !selectedIds.includes(e.id) && e.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  ) ?? [];

  const addUser = (id: string) => {
    setSelectedIds((prev) => [...prev, id]);
    setSearchQuery('');
  };
  const removeUser = (id: string) => setSelectedIds((prev) => prev.filter((x) => x !== id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ניהול שיוכים — ${task.name}`}>
      <div className="flex flex-col gap-4">
        <div className="flex min-h-8 flex-wrap gap-2">
          {selectedEmployees.map((emp) => (
            <span
              key={emp.id}
              className="flex items-center gap-1 rounded-full bg-[#ECECEC] px-3 py-1 text-sm text-gray-700"
            >
              {emp.fullName}
              <button
                type="button"
                onClick={() => removeUser(emp.id)}
                className="leading-none text-gray-500 hover:text-gray-800"
              >
                ×
              </button>
            </span>
          ))}
          {selectedEmployees.length === 0 && (
            <p className="text-sm text-gray-400">לא נבחרו עובדים</p>
          )}
        </div>

        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש עובד..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-md">
              {availableResults.length > 0 ? (
                availableResults.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => addUser(emp.id)}
                    className="w-full px-3 py-2 text-right text-sm hover:bg-gray-50"
                  >
                    {emp.fullName}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-gray-400">אין תוצאות</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={() => {
              syncAssignments.mutate(
                { taskId: task.id, userIds: selectedIds },
                { onSuccess: onClose },
              );
            }}
            disabled={syncAssignments.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            שמור
          </button>
        </div>
      </div>
    </Modal>
  );
}

const MAX_VISIBLE = 4;

function AssignedUsersPills({
  assignments,
}: {
  assignments: TaskWithAssignments['assignments'];
}) {
  if (assignments.length === 0) return <span className="text-gray-400">—</span>;

  const visible = assignments.slice(0, MAX_VISIBLE);
  const hidden = assignments.slice(MAX_VISIBLE);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((a) => (
        <span key={a.id} className="rounded-md bg-[#ECECEC] px-2.5 py-0.5 text-xs text-gray-700">
          {a.user.fullName}
        </span>
      ))}
      {hidden.length > 0 && (
        <div className="relative">
          <span className="group/overflow cursor-default rounded-full bg-[#F0F4FA] px-2.5 py-0.5 text-xs text-gray-600">
            +{hidden.length}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 group-hover/overflow:block">
              <div className="whitespace-nowrap rounded-lg bg-[#3E3E3E] px-3 py-2 text-xs text-white">
                {hidden.map((a) => a.user.fullName).join(', ')}
              </div>
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#3E3E3E]" />
            </div>
          </span>
        </div>
      )}
    </div>
  );
}

function AssignmentRow({ task }: { task: TaskWithAssignments }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const removeAll = useRemoveTaskAssignments();

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="overflow-hidden px-4 py-3">
          <div className="truncate text-sm text-gray-500">{task.project.client.name}</div>
        </td>
        <td className="overflow-hidden px-4 py-3">
          <div className="truncate text-sm text-gray-500">{task.project.name}</div>
        </td>
        <td className="overflow-hidden px-4 py-3">
          <div className="truncate text-sm font-medium">{task.name}</div>
        </td>
        <td className="px-4 py-3">
          <AssignedUsersPills assignments={task.assignments} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-md p-1.5 hover:bg-gray-100"
              aria-label="ערוך"
            >
              <img src="/edit-logo.png" className="h-4 w-4" alt="" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-md p-1.5 hover:bg-red-50"
              aria-label="הסר שיוכים"
            >
              <img src="/delete-logo.png" className="h-4 w-4" alt="" />
            </button>
          </div>
        </td>
      </tr>

      <EditAssignmentModal task={task} isOpen={editOpen} onClose={() => setEditOpen(false)} />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          removeAll.mutate(task.id, { onSuccess: () => setConfirmOpen(false) });
        }}
        title="הסרת כל השיוכים"
        message="האם אתה בטוח שברצונך להסיר את כל העובדים המשויכים למשימה זו?"
        confirmLabel="הסר"
        isPending={removeAll.isPending}
      />
    </>
  );
}

export default function TaskAssignmentPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');

  const { data: clients } = useAllClients();
  const { data: projects } = useProjectsByClient(selectedClientId);
  const { data: tasks, isLoading } = useTasksWithAssignments(selectedProjectId);

  const visibleTasks = useMemo(() => {
    if (!tasks) return undefined;
    const byClient = selectedProjectId
      ? tasks
      : selectedClientId
        ? tasks.filter((t) => t.project.client.id === selectedClientId)
        : tasks;
    return search ? byClient.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) : byClient;
  }, [tasks, selectedClientId, selectedProjectId, search]);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId || undefined);
    setSelectedProjectId(undefined);
  };

  return (
    <div dir="rtl" className="p-6">
      <h1 className="mb-6 text-2xl font-bold">שיוך עובד למשימה</h1>

      <div className="mb-4 flex items-center gap-3">
        <select
          value={selectedClientId ?? ''}
          onChange={(e) => handleClientChange(e.target.value)}
          className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— כל הלקוחות —</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={selectedProjectId ?? ''}
          onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
          disabled={!selectedClientId}
          className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">— כל הפרויקטים —</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש משימה..."
          className="ms-auto w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading && <p className="text-gray-500">טוען...</p>}

      {!isLoading && visibleTasks && visibleTasks.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full table-fixed">
            <thead className="bg-[#141E3E]">
              <tr>
                <th className="w-[13%] px-4 py-2 text-start text-sm font-semibold text-white">שם לקוח</th>
                <th className="w-[17%] px-4 py-2 text-start text-sm font-semibold text-white">שם פרויקט</th>
                <th className="w-[25%] px-4 py-2 text-start text-sm font-semibold text-white">שם משימה</th>
                <th className="w-[35%] px-4 py-2 text-start text-sm font-semibold text-white">שמות העובדים המשויכים</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => (
                <AssignmentRow key={task.id} task={task} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && visibleTasks && visibleTasks.length === 0 && <EmptyState />}
    </div>
  );
}
