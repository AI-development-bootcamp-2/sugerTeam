import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import {
  useAllClients,
  useProjectsByClient,
  useAllTasksWithProject,
  useCreateTask,
  useUpdateTask,
} from '../../../services/entities.service';
import type { TaskWithProject } from '../../../types/entities';
import { useAuthStore } from '../../../store/authStore';
import { UserRole } from '../../../types/auth';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import EmptyState from '../../../components/EmptyState';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return dateStr.slice(0, 10).split('-').reverse().join('/');
}

interface CreateTaskFormData {
  clientId:    string;
  projectId:   string;
  name:        string;
  description: string;
  startDate:   string;
  endDate:     string;
}

interface EditTaskFormData {
  name:        string;
  description: string;
  startDate:   string;
  endDate:     string;
}

function CreateTaskModal({
  isOpen,
  onClose,
  defaultClientId,
  defaultProjectId,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultClientId: string | undefined;
  defaultProjectId: string | undefined;
}) {
  const { data: clients } = useAllClients();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    defaultValues: { clientId: defaultClientId ?? '', projectId: defaultProjectId ?? '', name: '', description: '', startDate: '', endDate: '' },
  });
  const watchedClientId = useWatch({ control, name: 'clientId' });
  const { data: projects } = useProjectsByClient(watchedClientId || undefined);
  const createTask = useCreateTask();

  useEffect(() => {
    if (isOpen) reset({ clientId: defaultClientId ?? '', projectId: defaultProjectId ?? '', name: '', description: '', startDate: '', endDate: '' });
  }, [isOpen, defaultClientId, defaultProjectId, reset]);

  useEffect(() => {
    if (isOpen && projects && defaultProjectId) setValue('projectId', defaultProjectId);
  }, [projects, isOpen, defaultProjectId, setValue]);

  const handleClose = () => {
    reset({ clientId: defaultClientId ?? '', projectId: defaultProjectId ?? '', name: '', description: '', startDate: '', endDate: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="יצירת משימה">
      <form
        onSubmit={handleSubmit((data) => {
          createTask.mutate(
            { projectId: data.projectId, name: data.name, description: data.description || undefined, startDate: data.startDate || undefined, endDate: data.endDate || undefined },
            { onSuccess: handleClose },
          );
        })}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">לקוח</label>
          <select
            {...register('clientId')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— בחר לקוח —</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">פרויקט *</label>
          <select
            {...register('projectId', { required: 'שדה חובה' })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— בחר פרויקט —</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.projectId && <p className="text-xs text-red-600">{errors.projectId.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">שם משימה *</label>
          <input
            {...register('name', { required: 'שדה חובה' })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium">תאריך התחלה</label>
              <input
                type="date"
                {...register('startDate')}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium">תאריך סיום</label>
              <input
                type="date"
                {...register('endDate', {
                  validate: (val) =>
                    !val || !getValues('startDate') || val >= getValues('startDate') || 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה',
                })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {errors.endDate && <p className="text-xs text-red-600">{errors.endDate.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">תיאור</label>
          <input
            {...register('description')}
            placeholder="תאר בקצרה את המשימה"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={createTask.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            שמור
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditTaskModal({
  task,
  isOpen,
  onClose,
}: {
  task: TaskWithProject;
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<EditTaskFormData>({
    defaultValues: {
      name:        task.name,
      description: task.description ?? '',
      startDate:   task.startDate?.slice(0, 10) ?? '',
      endDate:     task.endDate?.slice(0, 10)   ?? '',
    },
  });
  const updateTask = useUpdateTask();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="עריכת משימה">
      <form
        onSubmit={handleSubmit((data) => {
          updateTask.mutate({ id: task.id, name: data.name, description: data.description || undefined, startDate: data.startDate || null, endDate: data.endDate || null }, { onSuccess: onClose });
        })}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">שם משימה *</label>
          <input
            {...register('name', { required: 'שדה חובה' })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">תיאור</label>
          <input
            {...register('description')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium">תאריך התחלה</label>
              <input
                type="date"
                {...register('startDate')}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-medium">תאריך סיום</label>
              <input
                type="date"
                {...register('endDate', {
                  validate: (val) =>
                    !val || !getValues('startDate') || val >= getValues('startDate') || 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה',
                })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {errors.endDate && <p className="text-xs text-red-600">{errors.endDate.message}</p>}
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
            type="submit"
            disabled={updateTask.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            שמור
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TaskRow({ task }: { task: TaskWithProject }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updateTask = useUpdateTask();
  const isOpen = task.status === 'OPEN';

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
        <td className="overflow-hidden px-4 py-3">
          <div className="truncate text-sm text-gray-500" title={task.description ?? undefined}>
            {task.description ?? '—'}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(task.startDate)}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(task.endDate)}</td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isOpen ? 'פתוח' : 'סגור'}
          </span>
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
              aria-label={isOpen ? 'סגור' : 'פתח'}
            >
              <img src="/delete-logo.png" className="h-4 w-4" alt="" />
            </button>
          </div>
        </td>
      </tr>

      <EditTaskModal task={task} isOpen={editOpen} onClose={() => setEditOpen(false)} />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          updateTask.mutate(
            { id: task.id, isActive: !isOpen },
            { onSuccess: () => setConfirmOpen(false) },
          );
        }}
        title={isOpen ? 'סגירת משימה' : 'פתיחת משימה'}
        message={isOpen ? 'האם אתה בטוח שברצונך לסגור משימה זו?' : 'האם אתה בטוח שברצונך לפתוח משימה זו מחדש?'}
        confirmLabel={isOpen ? 'סגור' : 'פתח'}
        isPending={updateTask.isPending}
      />
    </>
  );
}

export default function TasksPage() {
  const authUser = useAuthStore((s) => s.user);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: clients } = useAllClients();
  const { data: projects } = useProjectsByClient(selectedClientId);
  const { data: tasks, isLoading } = useAllTasksWithProject(selectedProjectId);

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

  if (authUser !== null && authUser.role !== UserRole.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div dir="rtl" className="p-6">
      <h1 className="mb-6 text-2xl font-bold">משימות</h1>

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
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + יצירה
        </button>
      </div>

      {isLoading && <p className="text-gray-500">טוען...</p>}

      {!isLoading && visibleTasks && visibleTasks.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full table-fixed">
            <thead className="bg-[#141E3E]">
              <tr>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">שם לקוח</th>
                <th className="w-[12%] px-4 py-2 text-start text-sm font-semibold text-white">שם פרויקט</th>
                <th className="w-[15%] px-4 py-2 text-start text-sm font-semibold text-white">שם משימה</th>
                <th className="w-[23%] px-4 py-2 text-start text-sm font-semibold text-white">תיאור</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">התחלה</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">סיום</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">סטטוס</th>
                <th className="w-[10%] px-4 py-2 text-start text-sm font-semibold text-white">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && visibleTasks && visibleTasks.length === 0 && <EmptyState />}

      <CreateTaskModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultClientId={selectedClientId}
        defaultProjectId={selectedProjectId}
      />
    </div>
  );
}
