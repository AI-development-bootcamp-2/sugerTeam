import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTasksByProject, useCreateTask, useUpdateTask } from '../../../services/entities.service';
import type { Task } from '../../../types/entities';

interface NameForm {
  name: string;
}

function TaskRow({ task }: { task: Task }) {
  const [isEditing, setIsEditing] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NameForm>({ defaultValues: { name: task.name } });
  const updateTask = useUpdateTask();
  const isOpen = task.status === 'OPEN';

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50">
      <div className="flex items-center gap-3 p-2">
        <div className="flex flex-1 items-center gap-3">
          <span className="text-sm font-medium">{task.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isOpen ? 'פתוח' : 'סגור'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
        >
          ערוך
        </button>
        <button
          type="button"
          onClick={() => updateTask.mutate({ id: task.id, isActive: !isOpen })}
          disabled={updateTask.isPending}
          className={`rounded-md px-2 py-1 text-xs disabled:opacity-50 ${
            isOpen
              ? 'border border-red-300 text-red-600 hover:bg-red-50'
              : 'border border-green-300 text-green-700 hover:bg-green-50'
          }`}
        >
          {isOpen ? 'סגור' : 'פתח'}
        </button>
      </div>
      {isEditing && (
        <div className="border-t border-gray-100 px-3 py-2">
          <form
            onSubmit={handleSubmit((data) => {
              updateTask.mutate({ id: task.id, name: data.name }, { onSuccess: () => setIsEditing(false) });
            })}
            className="flex flex-col gap-2"
          >
            <input
              {...register('name', { required: 'שדה חובה' })}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updateTask.isPending}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
              >
                שמור
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-100"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CreateTaskForm({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NameForm>();
  const createTask = useCreateTask();

  return (
    <form
      onSubmit={handleSubmit((data) => {
        createTask.mutate(
          { projectId, name: data.name },
          {
            onSuccess: () => {
              reset();
              onClose();
            },
          },
        );
      })}
      className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3"
    >
      <input
        {...register('name', { required: 'שדה חובה' })}
        placeholder="שם משימה"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
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

export default function TasksSection({ projectId }: { projectId: string }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: tasks, isLoading } = useTasksByProject(projectId);

  return (
    <div className="mt-2 flex flex-col gap-2 ps-4">
      <h4 className="text-xs font-semibold text-gray-400">משימות</h4>

      {isLoading && <p className="text-xs text-gray-400">טוען...</p>}

      {tasks?.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}

      {showCreateForm ? (
        <CreateTaskForm projectId={projectId} onClose={() => setShowCreateForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="self-start rounded-md border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          + משימה חדשה
        </button>
      )}
    </div>
  );
}
