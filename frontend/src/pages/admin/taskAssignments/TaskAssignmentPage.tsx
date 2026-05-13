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

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(task.assignments.map((a) => a.user.id));
    }
  }, [isOpen, task.assignments]);

  const toggle = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ניהול שיוכים — ${task.name}`}>
      <div className="flex flex-col gap-4">
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {employees?.map((emp) => (
            <label
              key={emp.id}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(emp.id)}
                onChange={() => toggle(emp.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm">{emp.fullName}</span>
            </label>
          ))}
          {employees?.length === 0 && (
            <p className="text-sm text-gray-400">אין עובדים זמינים</p>
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

function AssignmentRow({ task }: { task: TaskWithAssignments }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const removeAll = useRemoveTaskAssignments();

  const assignedNames =
    task.assignments.length > 0
      ? task.assignments.map((a) => a.user.fullName).join(', ')
      : '—';

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-3 text-sm text-gray-500">{task.project.client.name}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{task.project.name}</td>
        <td className="px-4 py-3 text-sm font-medium">{task.name}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{assignedNames}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="ערוך"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 0 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              aria-label="הסר שיוכים"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
              </svg>
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
    return search ? byClient.filter((t) => t.name.includes(search)) : byClient;
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
          <table className="w-full">
            <thead className="bg-[#141E3E]">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">לקוח</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">פרויקט</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">שם משימה</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">עובדים משויכים</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-white">פעולות</th>
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
