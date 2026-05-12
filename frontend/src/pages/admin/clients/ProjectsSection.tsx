import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useActiveProjects,
  useActiveClients,
  useCreateProject,
  useUpdateProject,
  useManagers,
} from '../../../services/entities.service';
import TasksSection from './TasksSection';

interface ProjectsSectionProps {
  clientId: string;
}

interface ProjectForm {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  primaryManagerId: string;
}

interface ActiveProject {
  id: string;
  name: string;
  clientId: string;
}

function EditProjectForm({ project, onClose }: { project: ActiveProject; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ProjectForm>({ defaultValues: { name: project.name } });
  const updateProject = useUpdateProject();
  const { data: managers } = useManagers();
  const { data: clients } = useActiveClients();
  const clientName = clients?.find((c) => c.id === project.clientId)?.name ?? '';

  return (
    <form
      onSubmit={handleSubmit((data) => {
        updateProject.mutate(
          {
            id: project.id,
            name: data.name,
            description: data.description || undefined,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            primaryManagerId: data.primaryManagerId || null,
          },
          { onSuccess: onClose },
        );
      })}
      className="flex flex-col gap-2"
    >
      <input
        {...register('name', { required: 'שדה חובה' })}
        placeholder="שם פרויקט"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">שם לקוח</label>
        <input
          disabled
          value={clientName}
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">שיוך מנהל ראשי</label>
        <select
          {...register('primaryManagerId')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- ללא מנהל --</option>
          {managers?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
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
        placeholder="תאר בקצרה את הפרויקט"
        rows={2}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={updateProject.isPending}
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

function ProjectRow({ project }: { project: ActiveProject }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const updateProject = useUpdateProject();
  const showBody = isEditing || isExpanded;

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50">
      <div className="flex items-center gap-3 p-2">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-xs text-gray-400 w-4"
        >
          {isExpanded ? '▲' : '▼'}
        </button>
        <div className="flex flex-1 items-center gap-3">
          <span className="text-sm font-medium">{project.name}</span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            פעיל
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
          onClick={() => updateProject.mutate({ id: project.id, isActive: false })}
          disabled={updateProject.isPending}
          className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          השבת
        </button>
      </div>
      {showBody && (
        <div className="flex flex-col gap-3 border-t border-gray-100 px-3 py-2">
          {isEditing && <EditProjectForm project={project} onClose={() => setIsEditing(false)} />}
          {isExpanded && <TasksSection projectId={project.id} clientId={project.clientId} />}
        </div>
      )}
    </div>
  );
}

function CreateProjectForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ProjectForm>();
  const createProject = useCreateProject();
  const { data: managers } = useManagers();
  const { data: clients } = useActiveClients();
  const clientName = clients?.find((c) => c.id === clientId)?.name ?? '';

  return (
    <form
      onSubmit={handleSubmit((data) => {
        createProject.mutate(
          {
            clientId,
            name: data.name,
            description: data.description || undefined,
            startDate: data.startDate || undefined,
            endDate: data.endDate || undefined,
            primaryManagerId: data.primaryManagerId || undefined,
          },
          { onSuccess: () => { reset(); onClose(); } },
        );
      })}
      className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3"
    >
      <input
        {...register('name', { required: 'שדה חובה' })}
        placeholder="שם פרויקט"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">שם לקוח</label>
        <input
          disabled
          value={clientName}
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">שיוך מנהל ראשי</label>
        <select
          {...register('primaryManagerId')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- ללא מנהל --</option>
          {managers?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
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
          disabled={createProject.isPending}
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

export default function ProjectsSection({ clientId }: ProjectsSectionProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: projects, isLoading } = useActiveProjects(clientId);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-500">פרויקטים</h3>

      {isLoading && <p className="text-sm text-gray-400">טוען...</p>}

      {projects?.map((project) => (
        <ProjectRow key={project.id} project={project} />
      ))}

      {showCreateForm ? (
        <CreateProjectForm clientId={clientId} onClose={() => setShowCreateForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="self-start rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          + פרויקט חדש
        </button>
      )}
    </div>
  );
}
