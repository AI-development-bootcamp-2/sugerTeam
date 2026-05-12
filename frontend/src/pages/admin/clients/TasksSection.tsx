import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useActiveTasks,
  useActiveProjects,
  useCreateTask,
  useUpdateTask,
} from '../../../services/entities.service';

interface TasksSectionProps {
  projectId: string;
  clientId: string;
}

interface TaskForm {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface ActiveTask {
  id: string;
  name: string;
  projectId: string;
}

function EditTaskForm({ task, clientId, onClose }: { task: ActiveTask; clientId: string; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<TaskForm>({ defaultValues: { name: task.name } });
  const updateTask = useUpdateTask();
  const { data: projects } = useActiveProjects(clientId);
  const projectName = projects?.find((p) => p.id === task.projectId)?.name ?? '';

  return (
    <form
      onSubmit={handleSubmit((data) => {
        updateTask.mutate(
          {
            id: task.id,
            name: data.name,
            description: data.description || undefined,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
          },
          { onSuccess: onClose },
        );
      })}
      className="flex flex-col gap-2"
    >
      <input
        {...register('name', { required: 'שדה חובה' })}
        placeholder="שם משימה"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">שיוך לפרויקט קיים</label>
        <input
          disabled
          value={projectName}
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">תאריך התחלה</label>
          <input
            type="date"
            {...register('startDate')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">תאריך סיום</label>
          <input
            type="date"
            {...register('endDate', {
              validate: (val) => {
                const startDate = getValues('startDate');
                return !val || !startDate || val >= startDate || 'תאריך סיום חייב להיות אחרי תאריך התחלה';
              },
            })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.endDate && <p className="text-xs text-red-600">{errors.endDate.message}</p>}
        </div>
      </div>

      <textarea
        {...register('description')}
        placeholder="תיאור (אופציונלי)"
        rows={2}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={updateTask.isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          שמור
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function TaskRow({ task, clientId }: { task: ActiveTask; clientId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const updateTask = useUpdateTask();

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50">
      <div className="flex items-center gap-3 p-2">
        <div className="flex flex-1 items-center gap-3">
          <span className="text-sm font-medium">{task.name}</span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            פתוח
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
        >
          ערוך
        </button>
        <button
          type="button"
          onClick={() => updateTask.mutate({ id: task.id, isActive: false })}
          disabled={updateTask.isPending}
          className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          סגור
        </button>
      </div>
      {isEditing && (
        <div className="border-t border-gray-100 px-3 py-2">
          <EditTaskForm task={task} clientId={clientId} onClose={() => setIsEditing(false)} />
        </div>
      )}
    </div>
  );
}

function CreateTaskForm({ projectId, clientId, onClose }: { projectId: string; clientId: string; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<TaskForm>();
  const createTask = useCreateTask();
  const { data: projects } = useActiveProjects(clientId);
  const projectName = projects?.find((p) => p.id === projectId)?.name ?? '';

  return (
    <form
      onSubmit={handleSubmit((data) => {
        createTask.mutate(
          {
            projectId,
            name: data.name,
            description: data.description || undefined,
            startDate: data.startDate || undefined,
            endDate: data.endDate || undefined,
          },
          { onSuccess: () => { reset(); onClose(); } },
        );
      })}
      className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3"
    >
      <input
        {...register('name', { required: 'שדה חובה' })}
        placeholder="שם משימה"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">שיוך לפרויקט קיים</label>
        <input
          disabled
          value={projectName}
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">תאריך התחלה</label>
          <input
            type="date"
            {...register('startDate')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">תאריך סיום</label>
          <input
            type="date"
            {...register('endDate', {
              validate: (val) => {
                const startDate = getValues('startDate');
                return !val || !startDate || val >= startDate || 'תאריך סיום חייב להיות אחרי תאריך התחלה';
              },
            })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.endDate && <p className="text-xs text-red-600">{errors.endDate.message}</p>}
        </div>
      </div>

      <textarea
        {...register('description')}
        placeholder="תיאור (אופציונלי)"
        rows={2}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createTask.isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          שמור
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

export default function TasksSection({ projectId, clientId }: TasksSectionProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: tasks, isLoading } = useActiveTasks(projectId);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-500">משימות</h3>

      {isLoading && <p className="text-sm text-gray-400">טוען...</p>}

      {tasks?.map((task) => (
        <TaskRow key={task.id} task={task} clientId={clientId} />
      ))}

      {showCreateForm ? (
        <CreateTaskForm projectId={projectId} clientId={clientId} onClose={() => setShowCreateForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="self-start rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          + משימה חדשה
        </button>
      )}
    </div>
  );
}
