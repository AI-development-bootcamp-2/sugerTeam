import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  useAllClients,
  useProjectsByClient,
  useTasksByProject,
  useCreateTask,
  useUpdateTask,
} from '../../../services/entities.service';
import type { Task } from '../../../types/entities';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';

interface CreateTaskFormData {
  clientId: string;
  projectId: string;
  name: string;
}

interface EditTaskFormData {
  name: string;
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
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    defaultValues: { clientId: defaultClientId ?? '', projectId: defaultProjectId ?? '', name: '' },
  });
  const watchedClientId = useWatch({ control, name: 'clientId' });
  const { data: projects } = useProjectsByClient(watchedClientId || undefined);
  const createTask = useCreateTask();

  const handleClose = () => {
    reset({ clientId: defaultClientId ?? '', projectId: defaultProjectId ?? '', name: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="יצירת משימה">
      <form
        onSubmit={handleSubmit((data) => {
          createTask.mutate({ projectId: data.projectId, name: data.name }, { onSuccess: handleClose });
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
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditTaskFormData>({ defaultValues: { name: task.name } });
  const updateTask = useUpdateTask();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="עריכת משימה">
      <form
        onSubmit={handleSubmit((data) => {
          updateTask.mutate({ id: task.id, name: data.name }, { onSuccess: onClose });
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

function TaskRow({ task }: { task: Task }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updateTask = useUpdateTask();
  const isOpen = task.status === 'OPEN';

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-3 text-sm font-medium">{task.name}</td>
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
              aria-label={isOpen ? 'סגור' : 'פתח'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
              </svg>
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
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: clients } = useAllClients();
  const { data: projects } = useProjectsByClient(selectedClientId);
  const { data: tasks, isLoading } = useTasksByProject(selectedProjectId);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId || undefined);
    setSelectedProjectId(undefined);
  };

  return (
    <div dir="rtl" className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">משימות</h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + יצירה
        </button>
      </div>

      <div className="mb-4 flex gap-3">
        <select
          value={selectedClientId ?? ''}
          onChange={(e) => handleClientChange(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— בחר לקוח —</option>
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
          <option value="">— בחר פרויקט —</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProjectId && isLoading && <p className="text-gray-500">טוען...</p>}

      {selectedProjectId && tasks && tasks.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">שם משימה</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">סטטוס</th>
                <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedProjectId && tasks && tasks.length === 0 && (
        <p className="text-gray-500">אין משימות עבור פרויקט זה</p>
      )}

      <CreateTaskModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultClientId={selectedClientId}
        defaultProjectId={selectedProjectId}
      />
    </div>
  );
}
